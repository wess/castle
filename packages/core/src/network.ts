export type NetworkKind = "bridge" | "host" | "macvlan" | "overlay" | "none";

export type Network = {
  id: string;
  name: string;
  kind: NetworkKind;
  driver: string;
  subnet?: string;
  gateway?: string;
  attached: number;
};
