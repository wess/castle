import type { PipeFn } from "@atlas/server";
import { putHeader } from "@atlas/server";

export const cors =
  (origin: string): PipeFn =>
  (c) => {
    let next = putHeader(c, "access-control-allow-origin", origin);
    next = putHeader(next, "access-control-allow-credentials", "true");
    next = putHeader(next, "access-control-allow-headers", "content-type, authorization");
    next = putHeader(next, "access-control-allow-methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    return next;
  };
