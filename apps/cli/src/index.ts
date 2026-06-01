#!/usr/bin/env bun
import { cli } from "@atlas/cli";
import * as cmd from "./commands/index.ts";

cli("castle", [
  cmd.host,
  cmd.ps,
  cmd.run,
  cmd.start,
  cmd.stop,
  cmd.restart,
  cmd.rm,
  cmd.logs,
  cmd.exec,
  cmd.lxc,
  cmd.lxcExec,
  cmd.nets,
  cmd.pools,
]);
