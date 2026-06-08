import { get, post } from "./client.ts";

export type LoginResponse = {
  token: string;
  user: { id: number; email: string };
};

export type Me = {
  user: { sub: number; email: string };
};

export const login = (identifier: string, password: string) =>
  post<LoginResponse>("/auth/login", { identifier, password });

export type SignupInput = { username: string; password: string; email?: string; name?: string };

export const signup = (input: SignupInput) => post<LoginResponse>("/auth/signup", input);

export const me = () => get<Me>("/auth/me");

export const logout = () => post<{ ok: boolean }>("/auth/logout");
