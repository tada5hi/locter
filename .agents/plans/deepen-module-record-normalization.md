# Plan: Deepen module-record normalization (one owner, provenance-aware)

Status: proposed (not started). Origin: architecture exploration, 2026-07-16.

## Problem

The "normalize a loaded value into a module record" concept has no single owner:

- `toModuleRecord` (`src/loader/built-in/module/utils.ts`) is applied **twice**: once by
  `ModuleLoader.execute`/`executeSync` (`src/loader/built-in/module/module.ts:92,108`) and again by
  `LoaderRegistry.execute`/`executeSync` (`src/loader/module.ts:69,83`). It only works because the
  function happens to be idempotent for module-shaped values.
- `isESModule` (`src/loader/built-in/module/utils.ts`) decides "is this already a module record" by
  sniffing for an `__esModule` key on **any** object. A data file whose top level contains
  `__esModule` — e.g. `file.json` = `{"__esModule": true, "foo": 1}` — passes through untouched and
  never gets a synthetic `.default`, silently violating the `.default` contract every loader spec
  relies on. **Latent bug.**
- `loadPackageField` (`src/loader/package-field.ts`) reads fields off the *normalized* record via
  `hasOwnProperty`, so `loadPackageField('default')` returns the whole package object and
  `loadPackageField('__esModule')` returns `true` — synthetic keys leak into an API that thinks it
  reads raw `package.json`.

## Direction

Normalize in exactly **one** place (the `LoaderRegistry` boundary) and gate the "already a module
record" shortcut on **provenance** (the value came from the module loader) instead of sniffing
arbitrary parsed data. `loadPackageField` should read the raw parsed value (or the record's
`.default`), never the synthetic keys.

## Dependency category

In-process — pure data-shape logic; merge and test directly.

## Test impact

- The `.default`-shape assertions scattered across `test/unit/loader/{json,yaml,conf}.spec.ts`
  become one boundary contract test on `load`/`loadSync`.
- New tests: `__esModule` key collision in a JSON/YAML fixture; `loadPackageField('default')` and
  `loadPackageField('__esModule')` must not resolve to synthetic values.

## Related

- [[deepen-loader-registry]] — chosen first; touches the same `LoaderRegistry.execute` seam, land it
  before or together with this.
