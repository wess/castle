import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";
import * as api from "../api/index.ts";
import { clearToken, getToken, setToken } from "./storage.ts";

export type AuthUser = { id: number; email: string } | null;

type AuthState = {
  user: AuthUser;
  authRequired: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void> | void;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser>(null);
  const [authRequired, setAuthRequired] = useState(true);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const status = await api.settings.status();
      setAuthRequired(status.authRequired);
      if (!status.authRequired && status.user) {
        setUser(status.user);
        return;
      }
      if (!getToken()) {
        setUser(null);
        return;
      }
      try {
        const me = await api.auth.me();
        setUser({ id: me.user.sub, email: me.user.email });
      } catch {
        clearToken();
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onExpired = () => {
      if (authRequired) setUser(null);
    };
    window.addEventListener("castle:auth-expired", onExpired);
    return () => window.removeEventListener("castle:auth-expired", onExpired);
  }, [authRequired]);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await api.auth.login(email, password);
    setToken(res.token);
    setUser(res.user);
  }, []);

  const signOut = useCallback(async () => {
    // Fire-and-forget — the back-channel fan-out runs server-side and we
    // don't want the UI to wait on relying parties that may be slow.
    api.auth.logout().catch(() => {});
    clearToken();
    if (authRequired) setUser(null);
  }, [authRequired]);

  return (
    <Ctx.Provider value={{ user, authRequired, loading, signIn, signOut, refresh: load }}>{children}</Ctx.Provider>
  );
};

export const useAuth = (): AuthState => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
};
