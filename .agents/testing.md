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
npx vitest --config test/vitest.config.ts --run -t "should load module"     # by test name
```

## Test Layout

Tests mirror the `src/` tree, one spec per subsystem or built-in loader:

| Spec                                    | Covers                                                   |
|-----------------------------------------|----------------------------------------------------------|
| `test/unit/locator.spec.ts`             | `locate`, `locateMany`, `locateSync`, `locateManySync`   |
| `test/unit/utils.spec.ts`               | `src/utils/*`                                            |
| `test/unit/loader/module.spec.ts`       | `LoaderRegistry`, `load`, `loadSync`, `getModuleExport`   |
| `test/unit/loader/json.spec.ts`         | `JSONLoader` via `load`/`loadSync`                       |
| `test/unit/loader/yaml.spec.ts`         | `YAMLLoader`                                             |
| `test/unit/loader/conf.spec.ts`         | `ConfLoader`                                             |
| `test/unit/loader/cjs.spec.ts`          | CJS module loading paths                                 |
| `test/unit/loader/esm.spec.ts`          | ESM module loading paths                                 |

Every test covers **both** the sync and async surface in the same `it()` block — when adding a new locator or loader function, follow this pattern (see `test/unit/locator.spec.ts`).

Vitest globals are **not** enabled — each spec must `import { describe, expect, it } from 'vitest'`.

## ESM-specific patterns

Specs are ESM (`"type": "module"` in `package.json`). `__dirname` is not defined; use `import.meta.dirname` (Node 20.11+) when a spec needs a path relative to itself — see `test/unit/locator.spec.ts`.

## Test Helpers & Fixtures

- All fixture files live under `test/data/`. Add a new fixture file when introducing a new extension or testing a new edge case.
- `test/data/file-default.{cts,mts,cjs,mjs}` exist specifically to exercise the `default.default` unwrap in `toModuleRecord` (`src/loader/built-in/module/utils.ts`).
- For loader-registry isolation, instantiate `new LoaderRegistry()` directly instead of going through `useLoaderRegistry()` — see `test/unit/loader/module.spec.ts` ("should register loader", "should use module loader as fallback").

## Testing Philosophy

Tests assert *expected* behavior — the public contract documented in `README.MD` and the `Loader` interface. A failing test usually surfaces a real regression in the implementation rather than an outdated test.

### Mocks

This project does **not** use `vi.mock` or `vi.fn` in any current spec. Tests exercise the real loaders against real fixture files on disk. When adding tests, prefer the same pattern: write a fixture in `test/data/` rather than mocking `fs`.

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

Coverage is collected from `src/**/*.{ts,tsx,js,jsx}`. `/* istanbul ignore next */` is used sparingly in `ModuleLoader` for environment-specific branches that are hard to exercise from a single Node runtime — keep those scoped tightly. (Istanbul-style pragmas are recognized by v8 coverage via Vitest's report transformation.)

## CI Pipeline

GitHub Actions (`.github/workflows/main.yml`) runs on push to `develop`/`master`/`next`/`beta`/`alpha` and on PRs targeting those branches:

```
install ──▶ build ──▶ lint
                 └──▶ tests
```

All jobs run against `PRIMARY_NODE_VERSION=24` only. There is no Node version matrix. Note that `engines.node` in `package.json` requires `>=22` — CI runs newer but the package supports Node 22+.

## Writing New Tests

1. Place the spec under `test/unit/`, mirroring the `src/` path (e.g. a new built-in loader at `src/loader/built-in/toml/` → spec at `test/unit/loader/toml.spec.ts`).
2. Add fixture files to `test/data/` rather than stubbing `fs`.
3. Import vitest globals explicitly: `import { describe, expect, it } from 'vitest'`.
4. Cover both `execute` (async, awaited) and `executeSync` paths.
5. Run `npm test` to verify and `npm run test:coverage` if you touched code that may move the thresholds.
