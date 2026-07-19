# Plan: Collapse sync/async twin duplication

Status: implemented 2026-07-19. Origin: architecture exploration, 2026-07-16.

## Outcome

Chose the generator/CPS-style shared body ("twin protocol", `src/utils/twin.ts`, internal):
a body yields effect pairs via `yield* op(asyncThunk, syncThunk)`; `runTwinAsync` /
`runTwinSync` drive the matching side, re-entering effect errors via `Generator.throw` so
in-body `try/catch` behaves identically in both variants.

- `locate`/`locateMany` × sync/async → `locateBody`/`locateManyBody` (`src/locator/core.ts`).
- `locateUp`/`locateUpSync` → `locateUpBody`, composing via `yield* locateBody(...)`.
- json/yaml/conf loaders → abstract `TextFileLoader` (`src/loader/text-file.ts`, public):
  one body (read → parse → wrap); subclasses implement `parse` only.
- `LoaderRegistry.load`/`loadSync` → `loadBody` (dispatch → execute → normalize → wrap).
- `loadPackageField`/`Sync` → `loadPackageFieldBody`.
- `ModuleLoader.execute`/`executeSync` stay hand-written (deliberate divergence), documented
  on `execute` and pinned by four explicit fallback tests (jiti fallback async+sync, ts-node
  branch, unrecoverable-error rethrow).
- Tests: `expectParity` helper (`test/helpers/parity.ts`); twin `it()` pairs consolidated.

## Problem

Parallel sync/async surfaces are a deliberate public-API constraint, but internally ~8 call-pairs
are near-verbatim twins that differ only in `await` / `fg.sync` / `fs.readFileSync` / `require`:

| Concept | Async | Sync |
|---|---|---|
| locate one/many | `src/locator/async.ts` | `src/locator/sync.ts` (whole file duplicated) |
| walk-up | `locateUp` (`src/locator/up.ts`) | `locateUpSync` (same file, identical loop) |
| load | `load` (`src/loader/helpers.ts`) | `loadSync` |
| package field | `loadPackageField` (`src/loader/package-field.ts`) | sync variant, ~30 lines duplicated |
| manager exec | `LoaderRegistry.execute` | `executeSync` |
| module loader exec | `ModuleLoader.execute` | `executeSync` (asymmetric — see below) |
| json/yaml/conf | each `execute` | each `executeSync` |

The only pair that meaningfully diverges is `ModuleLoader`: the async path has ts-node/jiti
recovery fallbacks the sync path lacks — and that divergence is the least-tested code in the repo
(`istanbul ignore` blocks, zero coverage of the fallbacks).

## Direction

Keep the twin *public* API (constraint), but derive both variants from one shared core per concept:
either a small internal "effects" parameter (`{ glob, readFile }` sync/async pairs) or a
generator/CPS-style shared body. Make the deliberate `ModuleLoader` asymmetry explicit and tested
rather than incidental.

## Dependency category

In-process / local-substitutable — fs effects are already covered by `test/data/` fixtures.

## Test impact

- Sync/async parity asserted once at each public boundary (a helper that runs both variants and
  compares) instead of hand-duplicated inside every `it()` block.
- The `ModuleLoader` fallback divergence gets its first explicit test.

## Related

- [[deepen-loader-registry]] — reshapes `LoaderRegistry.execute`/`executeSync`; coordinate.
