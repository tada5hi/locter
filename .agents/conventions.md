# Conventions

## Tooling

| Tool                                | Purpose                                                                  |
|-------------------------------------|--------------------------------------------------------------------------|
| TypeScript 5                        | Source language; compiled to `dist/*.d.ts` via `tsc --emitDeclarationOnly` |
| Rollup + `@rollup/plugin-node-resolve` + `@swc/core` | Bundles `src/index.ts` into `dist/index.cjs` and `dist/index.mjs` |
| `@swc/jest`                         | Jest transform (TypeScript → ES2020)                                     |
| ESLint 8 + `@tada5hi/eslint-config-typescript` | Lint TypeScript source                                        |
| Husky + commitlint                  | `commit-msg` hook validates Conventional Commits                         |
| release-please                      | Automated release PRs (alpha prereleases, node release-type)             |
| `@tada5hi/tsconfig`                 | Base tsconfig (extended by `tsconfig.json`)                              |

## Workflow

- After making changes to `src/`, **always** run `npm run lint` and `npm test`. Run `npm run build` if you've touched the public API or exports.
- The `dist/` directory is committed because it ships to npm — do not edit it by hand; always rebuild via `npm run build`.
- When changing the public API (`src/index.ts` re-exports), update `README.MD` usage examples.

## Code Style

- **Module format**: TypeScript source uses ESM-style `import`/`export`. Output ships both `.cjs` and `.mjs`.
- **Indentation**: 4 spaces (enforced by `.editorconfig`).
- **Line endings**: LF.
- **Trailing whitespace**: trimmed (except in `.md` files).
- **Final newline**: required.
- **Linting**: `@tada5hi/eslint-config-typescript`, parsed against `tsconfig.eslint.json`. Project-local rule overrides in `.eslintrc`:
    - `class-methods-use-this`: off
    - `no-shadow`, `no-use-before-define`, `@typescript-eslint/no-use-before-define`: off
    - `@typescript-eslint/no-unused-vars`: off
- **Ignored from lint**: `**/dist/*`, `**/*.d.ts`.

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
    - `module: "CommonJS"` (the bundler emits both CJS and ESM separately via Rollup; the TypeScript compile step only emits `.d.ts`)
    - `esModuleInterop: true`
    - `noPropertyAccessFromIndexSignature: false`
    - `outDir: "dist"`
- `tsconfig.eslint.json` extends `tsconfig.json` and widens the include set so ESLint can type-check `src/` + `test/`.

## Build Output

- `npm run build` cleans `dist/` and produces:
    - `dist/index.cjs` (CommonJS) — referenced by `"main"` and the `require` export
    - `dist/index.mjs` (ESM) — referenced by `"module"` and the `import` export
    - `dist/index.d.ts` (types) — referenced by `"types"`
    - Source maps alongside each `.cjs`/`.mjs`
- Bundle externals: every entry under `dependencies` and `peerDependencies` in `package.json` is marked external (see `rollup.config.mjs`). Adding a new runtime dependency means adding it to `dependencies`, not `devDependencies`.
- Only `dist/` is published to npm (`"files": ["dist/"]`).

## Release Process

Releases are driven by **release-please** (`release-please-config.json`):

- `prerelease: true`, `prerelease-type: "alpha"` — releases land as `2.x.y-alpha.N` until stabilized.
- `bump-minor-pre-major: true`, `bump-patch-for-minor-pre-major: true` — appropriate for the pre-1.0 / 2.x line.
- release-please opens a PR; merging the PR creates a git tag and (via the release workflow) publishes to npm.

## CI/CD

- `.github/workflows/main.yml` — install → build → (lint || tests) on push to `master` and on PRs against any branch. Uses Node 22 only.
- `.github/workflows/release.yml` — publish flow triggered by release-please.
- `.github/dependabot.yml` — bumps npm and GitHub Actions deps; minor + patch updates are grouped under the `minorandpatch` group.

## Best Practices

- Prefer **fixture files** in `test/data/` over mocking `fs`. The existing test suite has no `jest.mock` / `jest.fn` calls — keep it that way.
- When adding a new file format: create `src/loader/built-in/<format>/{module.ts,index.ts}`, add a `LoaderId.<FORMAT>` enum entry, register a default `Rule` in `LoaderManager`'s constructor, add a `case` in `LoaderManager.resolve()`, export from `src/loader/built-in/index.ts`, and add a corresponding `test/unit/loader/<format>.spec.ts` + fixture in `test/data/`.
- Always implement both sync and async variants of a public function.
- Use `handleException(e)` (from `src/utils/error.ts`) inside loader `catch` blocks to normalize non-`Error` throws.
- Keep `src/utils/` free of imports from `src/locator/` or `src/loader/`.
