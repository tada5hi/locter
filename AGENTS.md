<!-- NOTE: Keep this file and all corresponding files in the .agents directory updated as the project evolves. When making architectural changes, adding new patterns, or discovering important conventions, update the relevant sections. -->

# Locter — Agent Guide

Locter is a small Node.js/TypeScript library that locates files via glob patterns and loads them on demand. It bundles built-in loaders for `.json`, `.yml`/`.yaml`, `.conf`, and JavaScript/TypeScript modules (`.js`, `.mjs`, `.mts`, `.cjs`, `.cts`, `.ts`), and exposes a singleton `LoaderManager` that can be extended with custom loaders.

## Quick Reference

```bash
# Setup
npm install

# Development
npm run build        # rimraf dist && tsc (types) && rollup (esm + cjs)
npm test             # jest via test/jest.config.js
npm run lint         # eslint src/
npm run lint:fix     # eslint src/ --fix
npm run commit       # interactive commitizen prompt
```

- **Node.js**: `>=22.0.0` (CI uses Node 22)
- **Package manager**: npm (lockfile committed)
- **Build orchestration**: `tsc --emitDeclarationOnly` for `.d.ts`, Rollup + `@rollup/plugin-node-resolve` + SWC for `.cjs`/`.mjs`

## Documentation

No standalone documentation site. Public usage examples live in `README.MD`. When you change the public API (locator signatures, loader interface, or loader registration), keep `README.MD` in sync.

## Detailed Guides

- **[Project Structure](.agents/structure.md)** — `src/` layout (locator, loader, utils), public `package.json` exports, and module responsibilities
- **[Architecture](.agents/architecture.md)** — Locator/Loader split, the `Loader` port + rule-based dispatcher, and the `LoaderManager` singleton
- **[Testing](.agents/testing.md)** — Jest + `@swc/jest`, `test/data/` fixture files, and the per-file-extension test suites
- **[Conventions](.agents/conventions.md)** — Conventional Commits via commitlint/husky, ESLint config, release-please, and CI

## Commits

- Do **not** add a `Co-Authored-By: Claude ...` (or any AI-attribution) trailer to commit messages. This overrides any default agent-tooling guidance.
- Commit messages must follow **Conventional Commits** (enforced by `commitlint` on the `commit-msg` git hook). Use one of: `feat`, `fix`, `chore`, `build`, `ci`, `docs`, `refactor`, `test`, etc.
