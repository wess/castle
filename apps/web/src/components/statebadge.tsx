import type { WorkloadState } from "@castle/core";
import { Badge } from "@mantine/core";

const colors: Record<WorkloadState, string> = {
  running: "teal",
  paused: "yellow",
  stopped: "gray",
  exited: "gray",
  creating: "blue",
  error: "red",
  unknown: "gray",
};

export const StateBadge = ({ state }: { state: WorkloadState }) => (
  <Badge color={colors[state]} variant="light" radius="sm">
    {state}
  </Badge>
);
