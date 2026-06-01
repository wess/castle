export type Ok<T> = { ok: true; value: T };
export type Err<E = string> = { ok: false; error: E };
export type Result<T, E = string> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = <E = string>(error: E): Err<E> => ({ ok: false, error });

export const map = <T, U, E>(r: Result<T, E>, fn: (v: T) => U): Result<U, E> => (r.ok ? ok(fn(r.value)) : r);

export const unwrap = <T, E>(r: Result<T, E>): T => {
  if (r.ok) return r.value;
  throw new Error(String(r.error));
};
