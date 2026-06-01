import { get, post } from "./client.ts";

export type LoginResponse = {
  token: string;
  user: { id: number; email: string };
};

export type Me = {
  user: { sub: number; email: string };
};

export const login = (email: string, password: string) => post<LoginResponse>("/auth/login", { email, password });

export const me = () => get<Me>("/auth/me");

export const logout = () => post<{ ok: boolean }>("/auth/logout");
