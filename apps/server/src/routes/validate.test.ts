import { describe, expect, test } from "bun:test";
import { BACKEND_RE, ensureLocal, HOSTNAME_RE, parseLocations } from "./validate.ts";

describe("ensureLocal", () => {
  test("appends .local when missing", () => {
    expect(ensureLocal("nas")).toBe("nas.local");
  });

  test("leaves an existing .local suffix intact", () => {
    expect(ensureLocal("nas.local")).toBe("nas.local");
  });

  test("trims and lowercases", () => {
    expect(ensureLocal("  Media  ")).toBe("media.local");
  });

  test("throws on an empty hostname", () => {
    expect(() => ensureLocal("   ")).toThrow("hostname required");
  });
});

describe("HOSTNAME_RE", () => {
  test("accepts valid mdns names", () => {
    expect(HOSTNAME_RE.test("nas.local")).toBe(true);
    expect(HOSTNAME_RE.test("media-server.local")).toBe(true);
  });

  test("rejects names with invalid characters", () => {
    expect(HOSTNAME_RE.test("bad_host.local")).toBe(false);
    expect(HOSTNAME_RE.test("-leading.local")).toBe(false);
    expect(HOSTNAME_RE.test("trailing-.local")).toBe(false);
  });
});

describe("BACKEND_RE", () => {
  test("accepts host:port", () => {
    expect(BACKEND_RE.test("127.0.0.1:8080")).toBe(true);
    expect(BACKEND_RE.test("app-db:5432")).toBe(true);
  });

  test("rejects values without a port", () => {
    expect(BACKEND_RE.test("localhost")).toBe(false);
    expect(BACKEND_RE.test("localhost:")).toBe(false);
  });
});

describe("parseLocations", () => {
  test("treats undefined as an empty list", () => {
    expect(parseLocations(undefined)).toEqual({ ok: true, locations: [] });
  });

  test("rejects a non-array", () => {
    expect(parseLocations("nope")).toEqual({ ok: false, error: "locations must be an array" });
  });

  test("requires a pattern", () => {
    expect(parseLocations([{ backend: "app:80" }])).toEqual({ ok: false, error: "location pattern required" });
  });

  test("validates the backend format", () => {
    const r = parseLocations([{ pattern: "/api", backend: "app" }]);
    expect(r).toEqual({ ok: false, error: "location backend invalid: app" });
  });

  test("defaults websocket to true and parses valid entries", () => {
    const r = parseLocations([
      { pattern: "/api", backend: "app:80" },
      { pattern: "/ws", backend: "app:81", websocket: false },
    ]);
    expect(r).toEqual({
      ok: true,
      locations: [
        { pattern: "/api", backend: "app:80", websocket: true },
        { pattern: "/ws", backend: "app:81", websocket: false },
      ],
    });
  });
});
