import { token } from "@atlas/auth";

export type AuthPayload = {
  sub: number;
  email: string;
};

const ONE_DAY = 60 * 60 * 24;

export const sign = (payload: AuthPayload, secret: string): Promise<string> =>
  token.sign(payload, secret, { expiresIn: ONE_DAY * 7 });

export const verify = async (jwt: string, secret: string): Promise<AuthPayload | null> => {
  try {
    const payload = await token.verify(jwt, secret);
    return payload as AuthPayload;
  } catch {
    return null;
  }
};
