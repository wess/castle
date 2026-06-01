// Browser stub for butter/dialog. Native dialogs aren't available in the web
// build, so these return "cancelled" shapes. UI entry points that depend on
// native dialogs are gated; this remains so any residual imports resolve.

export const dialog = {
  open: async (_opts?: unknown) => null as { paths?: string[] } | null,
  save: async (_opts?: unknown) => null as string | null,
  message: async (_opts?: unknown) => {
    // no-op
  },
};

export const open = dialog.open;
export const save = dialog.save;
export const message = dialog.message;

export default dialog;
