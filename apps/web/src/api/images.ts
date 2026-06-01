import { del, get, post } from "./client.ts";

export type Image = {
  Id: string;
  RepoTags: string[] | null;
  Created: number;
  Size: number;
};

export const list = () => get<Image[]>("/images");
export const pull = (ref: string) => post("/images/pull", { ref });
export const remove = (ref: string, force = false) => del(`/images/${encodeURIComponent(ref)}?force=${force ? 1 : 0}`);
