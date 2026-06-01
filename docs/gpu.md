# GPU passthrough

Castle can pass NVIDIA GPUs through to managed containers. The hard part
is the **host setup** — once the driver and container toolkit are in place,
Castle just adds `--gpus all` to any container with `gpu: true`.

## Tested on

- AMD Ryzen 5 5600X + NVIDIA RTX 2060 SUPER
- Debian 13 (Trixie), kernel 6.12

Should work on any modern Debian/Ubuntu with an NVIDIA card that has a
recent driver.

## Step 1: enable non-free apt sources

NVIDIA's proprietary driver lives in Debian's `non-free` component.

```bash
sudo sed -i \
  's|trixie main non-free-firmware|trixie main contrib non-free non-free-firmware|g; \
   s|trixie-updates main non-free-firmware|trixie-updates main contrib non-free non-free-firmware|g; \
   s|trixie-security main non-free-firmware|trixie-security main contrib non-free non-free-firmware|g' \
  /etc/apt/sources.list
sudo apt-get update
```

## Step 2: install the driver

```bash
sudo apt-get install -y nvidia-driver firmware-misc-nonfree linux-headers-amd64
sudo dkms autoinstall
sudo systemctl reboot
```

`linux-headers-amd64` is required, otherwise the DKMS module silently
doesn't build and you'll find out the hard way after reboot.

After reboot:

```bash
nvidia-smi
```

Should show your GPU. The driver version we use is `550.x` with CUDA 12.4.

## Step 3: container toolkit

```bash
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey \
  | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -fsSL https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list \
  | sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' \
  | sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list >/dev/null

sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

Verify Docker sees the runtime:

```bash
docker info | grep -iE "runtime|nvidia"
#  Runtimes: io.containerd.runc.v2 nvidia runc
#  Default Runtime: runc
```

Run a CUDA smoke test:

```bash
docker run --rm --gpus all nvidia/cuda:12.4.0-base-ubuntu22.04 nvidia-smi --query-gpu=name --format=csv,noheader
# NVIDIA GeForce RTX 2060 SUPER
```

## Step 4: how Castle uses it

`packages/docker/src/types.ts` exposes `gpu?: boolean` on
`CreateContainerSpec`. When true, `packages/docker/src/containers/create.ts`
emits `HostConfig.DeviceRequests`:

```json
[{ "Driver": "nvidia", "Count": -1, "Capabilities": [["gpu"]] }]
```

That's the JSON-API equivalent of `--gpus all`. `Count: -1` means "all
GPUs". The capability `gpu` is the minimum a container needs to see the
device.

`packages/apps/src/types.ts` propagates `gpu?: boolean` on `AppService`,
and the installer in `packages/apps/src/install.ts` passes it through to
the Docker create call. The catalog's Ollama entry has `gpu: true` set,
so a fresh install lands GPU-accelerated.

## Verifying a managed container has GPU

After install:

```bash
docker exec <container> nvidia-smi
```

Or inspect the container:

```bash
docker inspect <container> | jq '.[0].HostConfig.DeviceRequests'
```

If you see `null`, the create-time `gpu: true` didn't get through. The
catalog template needs `gpu: true` on the relevant service.

## Adding GPU to a service

Edit `packages/apps/src/catalog.ts`:

```ts
{
  key: "myapp",
  role: "primary",
  image: "owner/myapp:latest",
  ports: [{ container: 8080, primary: true }],
  gpu: true,   // ← here
},
```

Existing installs are not retroactively updated; you'd need to uninstall +
reinstall, or `docker rm` and recreate the container with `--gpus all`
manually.

## VRAM budgets

The 2060 SUPER has 8 GiB VRAM. Rough rules:

| Model class | Quantization | VRAM    |
| ----------- | ------------ | ------- |
| 7B          | Q4_K_M       | ~5 GiB  |
| 7B          | Q8_0         | ~7.5 GiB|
| 13B         | Q4_K_M       | ~7.5 GiB|
| 14B coder   | Q4_K_M       | tight   |
| 32B         | Q4_K_M       | doesn't fit |

If you go bigger, you need more VRAM. 70B is fully out of reach on 8 GiB
even at extreme quantization.

## Troubleshooting

- **Reboot hangs after driver install** — almost certainly the DKMS
  module didn't build. Boot the previous kernel from GRUB, install
  `linux-headers-amd64`, `sudo dkms autoinstall`, reboot.
- **`nvidia-smi` works on host but not in container** — `nvidia-ctk
  runtime configure --runtime=docker` not run, or Docker not restarted.
- **`Failed to initialize NVML: Driver/library version mismatch`** —
  driver was upgraded but containers cached the old library. Restart
  affected containers.
- **GPU is listed but Ollama runs on CPU** — Ollama checks
  `nvidia-smi -L` at startup. Make sure the container has it (toolkit
  injects it). If not, re-pull the image or recreate the container.
