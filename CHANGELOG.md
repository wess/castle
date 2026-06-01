# Changelog

All notable changes to Castle are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.3] - 2026-05-31

### Added

- Database manager: schema profiling endpoint
  (`POST /api/dbm/connections/:id/tables/:table/profile`) powering the
  Structure -> Profiling tab (row count, per-column null count/percent,
  distinct count, min/max, numeric average).
- Database manager: cross-connection schema comparison endpoint
  (`POST /api/dbm/schema/compare`) returning tables only-in-source /
  only-in-target / different / identical, with column-level diffs.
- Database manager: macros CRUD (`GET/POST /api/dbm/macros`,
  `DELETE /api/dbm/macros/:id`) backed by a new `dbm_macros` table.
- Database manager: table export now serializes CSV/JSON/SQL in the browser and
  downloads via a blob, replacing the unavailable native file dialog.
- Pure, unit-tested helper modules: `apps/web/src/dbm/export.ts` (export
  serializers) and `apps/server/src/dbm/schemadiff.ts` (schema diff).

### Changed

- The db-manager IPC shim (`apps/web/src/dbm/butter.ts`) now wires the
  profile / schema-compare / macros / export actions to real endpoints.

### Removed

- Native-only db-manager capabilities are gated out of the shipped web build so
  there are no broken buttons: plugin install/load, file-dialog SQL/CSV import,
  and mock-data generation. Their IPC actions are no longer registered; the
  shim safely no-ops unknown actions.

## [0.1.2] - 2026-05-31

### Added

- GitHub Actions CI workflow running install, lint, build, and tests on push
  and pull request.
- Unit test suite covering core result/id helpers, storage parsers
  (lvm, zfs, df), the network bridge parser, mdns alias store, and route
  hostname/backend validation.
- Code-splitting for the web bundle via Rollup `manualChunks` (react, mantine,
  router, codemirror, xterm, icons), replacing the single 2 MB chunk.

### Changed

- Storage and network adapters now expose pure parser functions
  (`parsePools`, `parseDf`, `parseLinks`) separate from the process-spawning
  callers.
- Route validation helpers (`parseLocations`, `ensureLocal`, hostname/backend
  patterns) extracted into `routes/validate.ts`.
- `release.sh` now records the package version and commit alongside the build
  timestamp in `version.txt`.
- All workspace package versions aligned to the root version.

### Fixed

- Resolved all formatting and lint errors reported by Biome; remaining
  React/a11y advisories in the db-manager surface are downgraded to warnings.
- Added accessible titles to the SVG charts and ER diagram.

## [0.1.1]

### Added

- Initial public baseline: castled daemon (Bun, REST/WS API), Mantine web SPA,
  and the `castle` CLI, built on Atlas.
- Docker and LXC workload management, storage pools (dir/lvm/zfs), bridge
  networking, mdns aliases and nginx routing, app catalog, Ollama, and MCP
  integration.
