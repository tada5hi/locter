<!-- NOTE: Keep this file and all corresponding files in the .agents directory updated as the project evolves. When making architectural changes, adding new patterns, or discovering important conventions, update the relevant sections. -->

# Locter — Agent Guide

Locter is a small Node.js/TypeScript library that locates files via glob patterns and reads and writes them on demand. Each supported file format couples a reader with an optional writer: `.json`, `.yml`/`.yaml`, and `.conf` are read- and writable, JavaScript/TypeScript modules (`.js`, `.mjs`, `.mts`, `.cjs`, `.cts`, `.ts`) are read-only. A singleton `FormatRegistry` dispatches by extension and can be extended with custom formats. The package ships as ESM-only.

## Quick Reference

```bash
# Setup
npm install

# Development
npm run build           # tsc --noEmit (typecheck) + tsdown (emit dist/index.mjs + .d.mts)
npm run build:types     # tsc --noEmit (typecheck only)
npm run build:js        # tsdown (emit dist/index.mjs + .d.mts)
npm test                # vitest run via test/vitest.config.ts
npm run test:coverage   # vitest run with v8 coverage
npm run lint            # eslint (flat config in eslint.config.js)
npm run lint:fix        # eslint --fix
```

- **Node.js**: `>=22.0.0` (CI runs on Node 24)
- **Package manager**: npm (lockfile committed)
- **Module system**: ESM-only (`"type": "module"`)
- **Build**: TypeScript only typechecks (`noEmit: true`); `tsdown` bundles `src/index.ts` to `dist/index.mjs` and emits `dist/index.d.mts`

## Documentation

No standalone documentation site. Public usage examples live in `README.MD`. When you change the public API (locator signatures, the reader/writer ports, or format registration), keep `README.MD` in sync.

## Detailed Guides

- **[Project Structure](.agents/structure.md)** — `src/` layout (locator, format, utils), public `package.json` exports, and module responsibilities
- **[Architecture](.agents/architecture.md)** — Locator/Format split, the `IReader`/`IWriter` ports + rule-based dispatcher, and the `FormatRegistry` singleton
- **[Testing](.agents/testing.md)** — Vitest + `test/data/` fixture files, and the per-file-extension test suites
- **[Conventions](.agents/conventions.md)** — Conventional Commits via commitlint/husky, flat ESLint config, release-please + monoship, and CI

## Commits, Issues & Pull Requests

- Commits follow **[Conventional Commits](https://www.conventionalcommits.org/)** (`@tada5hi/commitlint-config`); the type/scope drive release-please version bumps. See [conventions.md](.agents/conventions.md#commit-convention).
- Versioning, `CHANGELOG.md`, `package.json` version, and `.release-please-manifest.json` are owned by **release-please** — do not hand-edit them.
- Do **not** add a `Co-Authored-By: Claude ...` (or any AI-attribution) trailer to commit messages. This overrides any default agent-tooling guidance.
- Do **not** add AI-attribution lines (e.g. `🤖 Generated with [Claude Code](...)`) to issue or pull request titles, bodies, or comments.
