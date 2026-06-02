import { useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useEffect } from "react";
import { useAuth } from "../auth/context.tsx";
import { getToken } from "../auth/storage.ts";
import { configure } from "./socket.ts";

// Connects the event socket once a session exists and reconnects when the
// user/token changes. Sits inside QueryClientProvider + AuthProvider.
export const LiveProvider = ({ children }: { children: ReactNode }) => {
  const qc = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    configure(qc, !!user, getToken());
  }, [qc, user]);

  return <>{children}</>;
};
