# Architecture plans

Deepening candidates surfaced by the 2026-07-16 architecture exploration. The loader-registry
candidate was chosen first (tracked as [#854](https://github.com/tada5hi/locter/issues/854));
the rest are parked here.

- [000-deepen-module-record-normalization.md](000-deepen-module-record-normalization.md) — one
  provenance-aware owner for `toModuleRecord`; fixes the `__esModule` data-sniffing bug and
  `loadPackageField` synthetic-key leak. **Implemented 2026-07-19.**
- [001-collapse-sync-async-duplication.md](001-collapse-sync-async-duplication.md) — derive the ~8
  sync/async twin pairs from shared cores; make the `ModuleLoader` asymmetry explicit and tested.
  **Implemented 2026-07-19.**
- [002-deepen-locator-input-normalization.md](002-deepen-locator-input-normalization.md) — one precedence
  rule for locator options (fixes the contradictory `onlyFiles`/`onlyDirectories` bug) and one
  canonical input-normalization entry point.
- [003-shrink-public-api-and-singleton.md](003-shrink-public-api-and-singleton.md) — curate `export *`
  barrels (semver-major). (The type exports and singleton lifecycle shipped with the registry
  refactor, [#855](https://github.com/tada5hi/locter/pull/855).)

## Standalone bug (not owned by any plan)

`ConfReader.parse` (now `src/format/built-in/conf/reader.ts`) guards keys with `isSafeObjectKey`,
which only rejects a key *equal to* `__proto__`/`prototype`/`constructor` — but the key is then
handed to `flat.unflatten`, which splits on `.`. A line like `__proto__.polluted = x` passes the
guard and reaches `unflatten` as a nested path. **Resolved 2026-07-20** — verified that `flat`
drops `__proto__` path segments entirely and lands `constructor.prototype` paths as harmless own
keys; pinned by "should not pollute Object.prototype via dotted keys" in
`test/unit/format/conf.spec.ts`.
