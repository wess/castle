import { Alert, Button, Center, Loader, Stack, Text } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import { getToken } from "../auth/storage.ts";

type ClientInfo = {
  client_id: string;
  name: string;
  description?: string | null;
  icon_url?: string | null;
};

type AuthorizeInfo = {
  client: ClientInfo;
  scopes: string[];
  redirect_uri: string;
  state: string | null;
};

type AuthorizeApprove = {
  redirect_url: string;
};

/**
 * OIDC consent page. Castle is a single-tenant homelab, so we auto-approve
 * after a short visual confirmation rather than asking the operator to
 * click through every login. If anything fails (unknown client, invalid
 * params, network), we surface the error and offer to bail out.
 */
export const Authorize = () => {
  const [phase, setPhase] = useState<"loading" | "approving" | "error">("loading");
  const [info, setInfo] = useState<AuthorizeInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The consent exchange must run exactly once per page load. It was previously
  // keyed on recreated-every-render values (a fresh params object + arrays), so
  // the effect re-fired on every render and setInfo/setPhase re-rendered it —
  // an infinite /oauth/authorize/info + /approve burst that never navigated out
  // (the SSO "redirect loop"). A ref guard pins it to a single run.
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const params = new URLSearchParams(window.location.search);
    const requiredKeys = [
      "response_type",
      "client_id",
      "redirect_uri",
      "scope",
      "code_challenge",
      "code_challenge_method",
    ];
    const missing = requiredKeys.filter((k) => !params.get(k));
    if (missing.length > 0) {
      setError(`Missing required parameter(s): ${missing.join(", ")}`);
      setPhase("error");
      return;
    }
    const token = getToken();
    if (!token) {
      // Castle's <Login> takes over via the top-level App when there's no
      // session — we shouldn't be here without one. Bounce to root.
      window.location.replace("/");
      return;
    }

    const run = async () => {
      try {
        const infoRes = await fetch(`/oauth/authorize/info?${params.toString()}`, {
          headers: { authorization: `Bearer ${token}` },
        });
        if (!infoRes.ok) {
          const text = await infoRes.text();
          throw new Error(`/oauth/authorize/info → ${infoRes.status}: ${text}`);
        }
        const infoBody = (await infoRes.json()) as AuthorizeInfo;
        setInfo(infoBody);
        setPhase("approving");

        const body: Record<string, string> = {};
        for (const k of requiredKeys) body[k] = params.get(k)!;
        for (const k of ["state", "nonce"]) {
          const v = params.get(k);
          if (v) body[k] = v;
        }

        const approveRes = await fetch("/oauth/authorize/approve", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });
        if (!approveRes.ok) {
          const text = await approveRes.text();
          throw new Error(`/oauth/authorize/approve → ${approveRes.status}: ${text}`);
        }
        const approveBody = (await approveRes.json()) as AuthorizeApprove;
        window.location.replace(approveBody.redirect_url);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setPhase("error");
      }
    };
    void run();
  }, []);

  if (phase === "error") {
    return (
      <Center mih="100vh" p="md">
        <Stack maw={520} gap="md">
          <Alert color="red" title="Sign-in failed">
            {error ?? "Unknown error"}
          </Alert>
          <Button variant="default" onClick={() => window.location.replace("/")}>
            Back to Castle
          </Button>
        </Stack>
      </Center>
    );
  }

  return (
    <Center mih="100vh">
      <Stack align="center" gap="sm">
        <Loader />
        <Text size="sm" c="dimmed">
          {info ? `Signing you in to ${info.client.name}…` : "Preparing sign-in…"}
        </Text>
      </Stack>
    </Center>
  );
};
