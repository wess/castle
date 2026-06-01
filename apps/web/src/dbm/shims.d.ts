// Shims for runtime APIs Ambry expected from its Butter host.

declare global {
  // Castle exposes a `butter`-shaped global at window.butter so unmodified
  // Ambry components keep working — see ./butter.ts.
  const butter: {
    invoke: (action: string, data?: unknown, opts?: { timeout?: number }) => Promise<any>
    on: (action: string, handler: (data: unknown) => void) => void
    off: (action: string, handler: (data: unknown) => void) => void
  }
}

declare module "butter" {
  export const invoke: (...args: any[]) => Promise<any>
  export const on: (action: string, handler: (data: unknown) => void) => void
  export const off: (action: string, handler: (data: unknown) => void) => void
}

declare module "butter/dialog" {
  // Native dialog APIs aren't available in the browser. Stub so the
  // ported editor module type-checks; callers gate on results so a null
  // return is acceptable.
  export const open: (..._args: any[]) => Promise<{ paths?: string[] } | null>
  export const save: (..._args: any[]) => Promise<string | null>
  export const message: (..._args: any[]) => Promise<void>
}
