# Testing

## Setup

- **Runner**: Jest 30 with `@swc/jest` transform (target `es2020`, TypeScript syntax)
- **Test location**: `test/unit/**/*.spec.ts` (regex: `(/unit/.*|(\\.|/)(test|spec))\\.(ts|js)x?$`)
- **Config**: `test/jest.config.js` (note `rootDir: '../'` — run jest with `--config ./test/jest.config.js` from repo root)
- **Fixture data**: `test/data/` contains one file per supported extension (`.json`, `.yml`, `.conf`, `.cjs`, `.mjs`, `.cts`, `.mts`, plus `file-default.*` variants for default-export cases)
- **Prerequisite**: `NODE_ENV=test` is set automatically by the `test` script via `cross-env`

## Running Tests

```bash
npm test                     # all tests
npm run test:coverage        # with coverage (writes to ./coverage)
npx jest --config ./test/jest.config.js test/unit/locator.spec.ts   # single file
npx jest --config ./test/jest.config.js -t "should load module"     # single test by name
```

## Test Layout

Tests mirror the `src/` tree, one spec per subsystem or built-in loader:

| Spec                                    | Covers                                                   |
|-----------------------------------------|----------------------------------------------------------|
| `test/unit/locator.spec.ts`             | `locate`, `locateMany`, `locateSync`, `locateManySync`   |
| `test/unit/utils.spec.ts`               | `src/utils/*`                                            |
| `test/unit/loader/module.spec.ts`       | `LoaderManager`, `load`, `loadSync`, `getModuleExport`   |
| `test/unit/loader/json.spec.ts`         | `JSONLoader` via `load`/`loadSync`                       |
| `test/unit/loader/yaml.spec.ts`         | `YAMLLoader`                                             |
| `test/unit/loader/conf.spec.ts`         | `ConfLoader`                                             |
| `test/unit/loader/cjs.spec.ts`          | CJS module loading paths                                 |
| `test/unit/loader/esm.spec.ts`          | ESM module loading paths                                 |

Every test covers **both** the sync and async surface in the same `it()` block — when adding a new locator or loader function, follow this pattern (see `test/unit/locator.spec.ts`).

## Test Helpers & Fixtures

- All fixture files live under `test/data/`. Add a new fixture file when introducing a new extension or testing a new edge case.
- `test/data/file-default.{cts,mts,cjs,mjs}` exist specifically to exercise the `default.default` unwrap in `toModuleRecord` (`src/loader/built-in/module/utils.ts`).
- For loader-registry isolation, instantiate `new LoaderManager()` directly instead of going through `useLoader()` — see `test/unit/loader/module.spec.ts` ("should register loader", "should use module loader as fallback").

## Testing Philosophy

Tests assert *expected* behavior — the public contract documented in `README.MD` and the `Loader` interface. A failing test usually surfaces a real regression in the implementation rather than an outdated test.

### Mocks

This project does **not** use `jest.mock` or `jest.fn` in any current spec. Tests exercise the real loaders against real fixture files on disk. When adding tests, prefer the same pattern: write a fixture in `test/data/` rather than mocking `fs`.

## Code Coverage

```bash
npm run test:coverage
```

Jest enforces (from `test/jest.config.js`):

| Metric     | Threshold |
|------------|-----------|
| branches   | 65%       |
| functions  | 80%       |
| lines      | 80%       |
| statements | 80%       |

Coverage is collected from `src/**/*.{ts,tsx,js,jsx}` excluding `.d.ts`. `/* istanbul ignore next */` is used sparingly in `ModuleLoader` for environment-specific branches that are hard to exercise from a single Node runtime — keep those scoped tightly.

## CI Pipeline

GitHub Actions (`.github/workflows/main.yml`) runs on push to `master` and on PRs:

```
install ──▶ build ──▶ lint
                 └──▶ tests
```

All four jobs run against `PRIMARY_NODE_VERSION=22` only. There is no Node version matrix.

## Writing New Tests

1. Place the spec under `test/unit/`, mirroring the `src/` path (e.g. a new built-in loader at `src/loader/built-in/toml/` → spec at `test/unit/loader/toml.spec.ts`).
2. Add fixture files to `test/data/` rather than stubbing `fs`.
3. Cover both `execute` (async, awaited) and `executeSync` paths.
4. Run `npm test` to verify and `npm run test:coverage` if you touched code that may move the thresholds.
