# Conventions

## Tooling

| Tool                                | Purpose                                                                  |
|-------------------------------------|--------------------------------------------------------------------------|
| TypeScript 6                        | Source language. `tsc --noEmit` (`build:types`) typechecks only.         |
| tsdown                              | Bundles `src/index.ts` to `dist/index.mjs` and emits `dist/index.d.mts` (`build:js`). |
| Vitest 4 + `@vitest/coverage-v8`    | Test runner + coverage                                                   |
| ESLint 10 (flat) + `@tada5hi/eslint-config` | Lint TypeScript source                                           |
| typescript-eslint 8                 | Brought in transitively by `@tada5hi/eslint-config` for TS rules         |
| Husky + commitlint                  | `commit-msg` hook validates Conventional Commits                         |
| release-please                      | Automated release PRs (alpha prereleases, node release-type)             |
| monoship                            | Publishes built artifacts to npm on release                              |
| `@tada5hi/tsconfig`                 | Base tsconfig (extended by `tsconfig.json`)                              |

## Workflow

- After making changes to `src/`, **always** run `npm run lint` and `npm test`. Run `npm run build` to confirm both `tsc --noEmit` (types) and `tsdown` (bundle) succeed.
- The `dist/` directory is not committed — it is rebuilt by CI and published by monoship.
- When changing the public API (`src/index.ts` re-exports), update `README.MD` usage examples.

## Code Style

- **Module format**: ESM throughout. Package declares `"type": "module"`. Only ESM is published (`dist/index.mjs` + `dist/index.d.mts`).
- **Indentation**: 4 spaces (enforced by `.editorconfig`).
- **Line endings**: LF.
- **Trailing whitespace**: trimmed (except in `.md` files).
- **Final newline**: required.
- **Linting**: Flat config in `eslint.config.js` extends `@tada5hi/eslint-config` and ignores `dist/**`.

## Naming Conventions

- Loader classes: `<Format>Loader` (e.g. `JSONLoader`, `YAMLLoader`, `ConfLoader`, `ModuleLoader`).
- Built-in loader IDs: `LoaderId.<FORMAT>` enum members in `src/loader/constants.ts`.
- Types: `PascalCase` (no `I`-prefix for interfaces — use plain `Loader`, `Rule`, `LocatorInfo`).
- Functions: `camelCase`, often verb-prefixed (`buildFilePath`, `pathToLocatorInfo`, `isLocatorInfo`, `handleException`).
- Predicate helpers: `is*` (`isFilePath`, `isObject`, `isESModule`, `isTypeScriptError`).
- Sync variants: append `Sync` to the async name (`locate` / `locateSync`, `load` / `loadSync`).

## File Organization

- One main concept per file. The file name is `kebab-case` and matches the dominant export's role (`file-path.ts` exports `isFilePath`, `has-property.ts` exports `hasOwnProperty`/`hasStringProperty`).
- Each directory has an `index.ts` barrel that re-exports public symbols. Internal-only files should remain unexported from the barrel.
- Types live next to their implementation:
    - In `src/locator/` they're separated into `types.ts` (re-exported from the barrel).
    - In `src/loader/` and `src/loader/built-in/<format>/` they live in `type.ts` (singular) — keep this convention for parity with existing folders.

## Pre-commit Hooks

Husky 9 manages git hooks via `.husky/`:

1. **`commit-msg`** — runs `npx --no -- commitlint --edit` to validate the Conventional Commits format.

There is no `pre-commit` hook for linting; CI catches lint regressions.

## Commit Convention

Commits follow **Conventional Commits** (`@tada5hi/commitlint-config`):

```
<type>(<optional scope>): <subject>

<optional body>

<optional footer>
```

Common types observed in `git log`: `feat`, `fix`, `chore`, `build`, `ci`, `docs`, `refactor`, `test`, `style`, `perf`. release-please uses the type to compute version bumps.

## TypeScript

- Extends `@tada5hi/tsconfig`.
- Project overrides in `tsconfig.json`:
    - `target: "ES2022"`, `module: "ESNext"`, `moduleResolution: "bundler"`
    - `noEmit: true` — `tsc` is purely a typechecker; tsdown handles emit (both `.mjs` and `.d.mts`)
    - `allowImportingTsExtensions: true`
    - `esModuleInterop: true`
    - `noPropertyAccessFromIndexSignature: false`
- There is no separate `tsconfig.eslint.json` — the flat ESLint config doesn't need a TS project reference.

## Build Output

- `npm run build:types` runs `tsc --noEmit` and only verifies types.
- `npm run build:js` runs `tsdown` per `tsdown.config.ts`:
    - `entry: 'src/index.ts'`
    - `format: 'esm'`
    - `dts: true` → `dist/index.d.mts`
    - `sourcemap: true`
- `npm run build` runs both, types first then bundle.
- Output files: `dist/index.mjs`, `dist/index.d.mts`, `dist/index.mjs.map`.
- Externals: tsdown infers `dependencies` (and `peerDependencies`) as externals automatically. Adding a new runtime dep means adding it under `dependencies` in `package.json`, not `devDependencies`.
- Only `dist/` is published to npm (`"files": ["dist"]`).

## Release Process

Releases are driven by **release-please** + **monoship** (`.github/workflows/release.yml`):

1. A push to `master` triggers `googleapis/release-please-action@v5`.
2. release-please opens/updates a release PR with computed version + changelog.
3. Merging that PR creates a git tag.
4. The same workflow then runs `tada5hi/monoship@v2` to publish the built `dist/` to npm.
5. Coverage is uploaded to Codecov on the same run.

Configuration (`release-please-config.json`): `prerelease: true`, `prerelease-type: "alpha"`, `bump-minor-pre-major: true`, `bump-patch-for-minor-pre-major: true` (pre-1.0 / 2.x behavior).

## CI/CD

- `.github/workflows/main.yml` — install → build → (lint || tests) on push to `develop`/`master`/`next`/`beta`/`alpha` and on PRs against those branches. Uses Node 24 only.
- `.github/workflows/release.yml` — publish flow triggered by release-please on push to `master`.
- `.github/dependabot.yml` — bumps npm and GitHub Actions deps; major prod, major dev, and minor/patch groups.

## Best Practices

- Prefer **fixture files** in `test/data/` over mocking `fs`. The existing test suite has no `vi.mock` / `vi.fn` calls — keep it that way.
- When adding a new file format: create `src/loader/built-in/<format>/{module.ts,index.ts}`, add a `LoaderId.<FORMAT>` enum entry, register a default `Rule` in `LoaderManager`'s constructor, add a `case` in `LoaderManager.resolve()`, export from `src/loader/built-in/index.ts`, and add a corresponding `test/unit/loader/<format>.spec.ts` + fixture in `test/data/`.
- Always implement both sync and async variants of a public function.
- Use `handleException(e)` (from `src/utils/error.ts`) inside loader `catch` blocks to normalize non-`Error` throws.
- In source files that need `require` (e.g. for `loadSync` semantics), use `createRequire(import.meta.url)` from `node:module` — the package is ESM, so `require` is not a global.
- Keep `src/utils/` free of imports from `src/locator/` or `src/loader/`.
