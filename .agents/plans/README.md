# Architecture plans

Deepening candidates surfaced by the 2026-07-16 architecture exploration. The loader-registry
candidate was chosen first (tracked as [#854](https://github.com/tada5hi/locter/issues/854));
the rest are parked here.

- [deepen-module-record-normalization.md](deepen-module-record-normalization.md) — one
  provenance-aware owner for `toModuleRecord`; fixes the `__esModule` data-sniffing bug and
  `loadPackageField` synthetic-key leak.
- [collapse-sync-async-duplication.md](collapse-sync-async-duplication.md) — derive the ~8
  sync/async twin pairs from shared cores; make the `ModuleLoader` asymmetry explicit and tested.
- [deepen-locator-input-normalization.md](deepen-locator-input-normalization.md) — one precedence
  rule for locator options (fixes the contradictory `onlyFiles`/`onlyDirectories` bug) and one
  canonical input-normalization entry point.
- [shrink-public-api-and-singleton.md](shrink-public-api-and-singleton.md) — curate `export *`
  barrels (semver-major), export the missing `Loader`/`Rule`/`LoaderId` types, give the singleton a
  lifecycle.

## Standalone bug (not owned by any plan)

`ConfLoader.parse` (`src/loader/built-in/conf/module.ts:57`) guards keys with `isSafeObjectKey`,
which only rejects a key *equal to* `__proto__`/`prototype`/`constructor` — but the key is then
handed to `flat.unflatten`, which splits on `.`. A line like `__proto__.polluted = x` passes the
guard and reaches `unflatten` as a nested path. Verify `flat`'s own guarding; add a fixture test
either way.
