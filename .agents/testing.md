# Testing

## Setup

- **Runner**: Vitest (run mode, no watch in CI)
- **Test location**: `test/unit/**/*.{test,spec}.{js,ts}` (from `test/vitest.config.ts`)
- **Config**: `test/vitest.config.ts` (vitest is invoked with `--config test/vitest.config.ts --run`)
- **Fixture data**: `test/data/` contains one file per supported extension (`.json`, `.yml`, `.conf`, `.cjs`, `.mjs`, `.cts`, `.mts`, plus `file-default.*` variants for default-export cases)
- **Coverage provider**: `@vitest/coverage-v8`

## Running Tests

```bash
npm test                                                        # all tests
npm run test:coverage                                           # with coverage (./coverage)
npx vitest --config test/vitest.config.ts --run test/unit/locator.spec.ts   # single file
npx vitest --config test/vitest.config.ts --run -t "should read module"     # by test name
```

## Test Layout

Tests mirror the `src/` tree, one spec per subsystem or built-in format:

| Spec                                    | Covers                                                   |
|-----------------------------------------|----------------------------------------------------------|
| `test/unit/locator.spec.ts`             | `locate`, `locateMany`, `locateSync`, `locateManySync`   |
| `test/unit/utils.spec.ts`               | `src/utils/*`                                            |
| `test/unit/errors.spec.ts`              | `LocterError` hierarchy, `wrapLoaderError`, `wrapWriteError` |
| `test/unit/format/module.spec.ts`       | `FormatRegistry`, `read`, `readSync`, `ModuleReader`, `getModuleExport` |
| `test/unit/format/write.spec.ts`        | `write`/`writeSync` dispatch, record unwrapping, rule slot independence, fs semantics |
| `test/unit/format/json.spec.ts`         | `JSONReader` + `JSONWriter` (indent modes) via `read`/`write` |
| `test/unit/format/yaml.spec.ts`         | `YAMLReader` + `YAMLWriter` (comment preservation, graft semantics) |
| `test/unit/format/conf.spec.ts`         | `ConfReader` + `ConfWriter` (round-trips, documented lossy edges) |
| `test/unit/format/package-field.spec.ts`| `readPackageField` / `writePackageField` (+Sync)         |
| `test/unit/format/cjs.spec.ts`          | CJS module loading paths                                 |
| `test/unit/format/esm.spec.ts`          | ESM module loading paths                                 |

Every test covers **both** the sync and async surface in the same `it()` block — usually via the `expectParity` helper (`test/helpers/parity.ts`). When adding a new locator or format function, follow this pattern (see `test/unit/format/json.spec.ts`).

Vitest globals are **not** enabled — each spec must `import { describe, expect, it } from 'vitest'`.

## ESM-specific patterns

Specs are ESM (`"type": "module"` in `package.json`). `__dirname` is not defined; use `import.meta.dirname` (Node 20.11+) when a spec needs a path relative to itself — see `test/unit/locator.spec.ts`.

## Test Helpers & Fixtures

- `test/helpers/parity.ts` exports `expectParity(run, runSync)` — runs both variants of a sync/async twin API with the same input, asserts deeply-equal results, and returns the async result for further assertions. Use it instead of hand-duplicating assertions per variant.
- All read fixture files live under `test/data/`. Add a new fixture file when introducing a new extension or testing a new edge case.
- **Write tests never write into `test/data/`** — fixtures stay read-only. Each write spec creates its own temp directory via `fs.mkdtempSync(path.join(os.tmpdir(), 'locter-…'))` at module scope and removes it in `afterAll`. Write parity = run `write` and `writeSync` against two separate targets and assert identical file content (see `test/unit/format/write.spec.ts`).
- `test/data/file-default.{cts,mts,cjs,mjs}` exist specifically to exercise the `default.default` unwrap in `toModuleRecord` (`src/format/built-in/module/utils.ts`).
- For registry isolation, instantiate `new FormatRegistry()` directly instead of going through `useFormatRegistry()` — see `test/unit/format/module.spec.ts` and `test/unit/format/write.spec.ts`.

## Testing Philosophy

Tests assert *expected* behavior — the public contract documented in `README.MD` and the `IReader`/`IWriter` ports. A failing test usually surfaces a real regression in the implementation rather than an outdated test.

Deliberately lossy behavior is **pinned as expected**, not avoided: e.g. `.conf` round-trips coerce numeric strings (`'123'` → `123`), and YAML grafting replaces arrays wholesale — those tests document the contract.

### Mocks

This project does **not** use `vi.mock` or `vi.fn` in any current spec. Tests exercise the real formats against real files on disk. When adding tests, prefer the same pattern: write a fixture in `test/data/` (reads) or a temp file (writes) rather than mocking `fs`.

## Code Coverage

```bash
npm run test:coverage
```

Vitest enforces (from `test/vitest.config.ts`):

| Metric     | Threshold |
|------------|-----------|
| branches   | 65%       |
| functions  | 80%       |
| lines      | 80%       |
| statements | 80%       |

Coverage is collected from `src/**/*.{ts,tsx,js,jsx}`. `/* istanbul ignore next */` is used sparingly in `ModuleReader` for environment-specific branches that are hard to exercise from a single Node runtime — keep those scoped tightly. (Istanbul-style pragmas are recognized by v8 coverage via Vitest's report transformation.)

## CI Pipeline

GitHub Actions (`.github/workflows/main.yml`) runs on push to `develop`/`master`/`next`/`beta`/`alpha` and on PRs targeting those branches:

```
install ──▶ build ──▶ lint
                 └──▶ tests (matrix: ubuntu-latest, windows-latest)
```

All jobs run against `PRIMARY_NODE_VERSION=24` only (no Node version matrix; `engines.node` requires `>=22` — CI runs newer but the package supports Node 22+). The tests job runs on an OS matrix: ubuntu + windows (`fail-fast: false`); the Windows leg also exercises the build (per-OS build cache). A `.gitattributes` pins LF checkouts so Windows runners cannot introduce CRLF fixtures.

## Writing New Tests

1. Place the spec under `test/unit/`, mirroring the `src/` path (e.g. a new built-in format at `src/format/built-in/toml/` → spec at `test/unit/format/toml.spec.ts`).
2. Add fixture files to `test/data/` for reads; use a temp directory for writes.
3. Import vitest globals explicitly: `import { describe, expect, it } from 'vitest'`.
4. Cover both the async (awaited) and sync paths.
5. Run `npm test` to verify and `npm run test:coverage` if you touched code that may move the thresholds.
