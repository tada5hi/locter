# Plan: Deepen module-record normalization (one owner, provenance-aware)

Status: implemented 2026-07-19. Origin: architecture exploration, 2026-07-16.

## Outcome

- `createModuleRecord` (unconditional wrap) split out of `toModuleRecord`
  (`src/loader/built-in/module/utils.ts`).
- `ModuleLoader.execute`/`executeSync` return the raw module value; normalization happens
  exactly once, in `LoaderRegistry.toRecord` (`src/loader/registry/module.ts`), gated on
  `loader instanceof ModuleLoader` — data-loader output is always wrapped, even when it
  contains an `__esModule` key.
- `loadPackageField`/`loadPackageFieldSync` read the raw parsed `package.json` via the
  built-in JSON loader; synthetic record keys (`default`, `__esModule`) no longer resolve.
- Tests: `test/data/file-es-module.{json,yml}` fixtures, a registry boundary contract test
  over all built-in extensions, a provenance-gate test for user loaders, and synthetic-key
  assertions in `package-field.spec.ts`.

(Note: file references below predate the #855 registry refactor — `LoaderRegistry` moved
from `src/loader/module.ts` to `src/loader/registry/module.ts`.)

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
