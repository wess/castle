# Ollama

Castle has first-class support for [Ollama](https://ollama.com) — both as a
managed app and as a chat / model management surface.

## Three things you can do

- **Chat** — multi-conversation interface, model picker, streaming output,
  persistent history per user.
- **Models** — list installed models, pull new ones (durable background
  jobs that survive page reloads), delete.
- **Settings** — point Castle at a local Ollama, a remote one, or Ollama
  Cloud (with API key).

## Settings

The **Ollama → Settings** tab has three modes:

### Local

The default. URL is `http://localhost:11434`. If Ollama is running on the
Castle host, this works without further config.

### Castle-managed (via Apps)

If you installed Ollama from the **Apps** page (catalog id `ollama`),
Castle assigned it a random host port. Find the URL on the **Apps**
installed-table — it looks like `http://ollama1.local:34521`. Paste that
into Ollama → Settings → URL.

### Ollama Cloud

Choose **Ollama Cloud** in the segmented control. URL fills with
`https://ollama.com`. Paste your API key from
[ollama.com/settings/keys](https://ollama.com/settings/keys). Castle uses
this exact endpoint and sends `Authorization: Bearer <key>` on every
request.

You can mix: use Cloud for big models, switch to Local for cheap ones —
it's one setting per Castle instance.

## Chat

Two-column layout. Left sidebar lists past chats with model + relative
timestamp; right is the current conversation.

- **New chat** — `+` button at the top of the sidebar.
- **Switch chat** — click any item in the sidebar.
- **Rename** — `⋯` menu on a chat row → Rename. Inline edit, Enter to save.
- **Delete** — `⋯` menu → Delete.
- **Model** — top of the sidebar; per-chat.

Title is auto-generated from your first message (first 50 chars). Save
happens after each assistant reply lands — leave the page and come back,
your conversation is still there.

Stored in Postgres (`ollama_chats` table) scoped to the JWT user. If you
disabled auth, all chats land on the first user.

## Models

The **Models** tab shows what's installed on the configured Ollama endpoint
(rows from `GET /api/tags`).

### Pulling a model

1. Click **Pull model**.
2. Type any reference from [ollama.com/library](https://ollama.com/library),
   e.g. `llama3.2`, `qwen2.5-coder:7b`, `deepseek-r1:32b`.
3. Click **Pull**.

The pull happens **server-side, in the background**:

- POST `/api/ollama/pull` returns immediately (202) with the initial job.
- Castle owns the stream from Ollama and updates an in-memory job
  registry.
- The UI polls `/api/ollama/pulls` every 1.5s while a pull is running.
- You can navigate away — the pull keeps going. Come back and you'll see
  the same active pull. Multiple concurrent pulls are fine.

Each pull shows:

- Current step (e.g. "pulling c5396e06af29")
- Bytes completed / total
- A cancel button (sends an abort to the stream)

On success: toast, model appears in the table.
On error: toast with the exact Ollama error (e.g. `pull model manifest:
file does not exist` for a name that doesn't exist).

Recent failed/cancelled pulls stay visible below the active ones for an
hour, then sweep.

### Deleting a model

Trash icon on the row. Delegates to `DELETE /api/ollama/models/:name`
which calls Ollama's `DELETE /api/delete`.

## REST surface

| Method   | Path                          | What                              |
| -------- | ----------------------------- | --------------------------------- |
| GET      | `/api/ollama/status`          | `{ok, url}` connection test       |
| GET      | `/api/ollama/models`          | list installed                    |
| DELETE   | `/api/ollama/models/:name`    | delete                            |
| POST     | `/api/ollama/pull`            | start a pull job (returns 202)    |
| GET      | `/api/ollama/pulls`           | list active + recent pulls        |
| GET      | `/api/ollama/pulls/:name`     | single pull                       |
| DELETE   | `/api/ollama/pulls/:name`     | cancel                            |
| POST     | `/api/ollama/chat`            | proxy a chat stream               |
| GET      | `/api/ollama/chats`           | list user's chats                 |
| GET      | `/api/ollama/chats/:id`       | one chat with messages            |
| POST     | `/api/ollama/chats`           | create                            |
| PATCH    | `/api/ollama/chats/:id`       | update title/model/messages       |
| DELETE   | `/api/ollama/chats/:id`       | delete                            |
| GET      | `/api/ollama/settings`        | `{url, apiKey}`                   |
| PUT      | `/api/ollama/settings`        | update                            |

## GPU

If Ollama runs on a Castle host with NVIDIA drivers and
nvidia-container-toolkit installed, the catalog's `ollama` template sets
`gpu: true` — installs get `--gpus all` automatically and inference runs
on the GPU.

Sanity check: `docker exec <instance> nvidia-smi` should list your GPU.
For a 7B-class model on a 2060 SUPER (8 GiB VRAM), expect ~2.5 GiB
resident and 10-20× speedup over CPU.

See [GPU](gpu.md) for the driver setup.

## Limitations

- The in-memory pull-job registry is wiped on castled restart. Layers
  already downloaded are cached by Ollama, so re-issuing the pull resumes
  cheaply.
- No streaming-quality controls in the UI yet (no temperature / top_p).
- No system prompt per chat.
- No multimodal chat (no image attachments).
