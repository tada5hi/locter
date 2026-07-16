# Plan: Shrink accidental public API

Status: proposed (not started). Origin: architecture exploration, 2026-07-16.
Scope note: the singleton-lifecycle half of this plan (reset, unregister-by-id, registry
introspection, `setModuleLoader` restore) shipped with the loader-registry refactor
([#855](https://github.com/tada5hi/locter/pull/855)). What remains is the API-surface curation.

## Problem

`src/index.ts` does `export *` over four barrels, which recursively publishes every internal helper.

**Accidentally public** (undocumented, internal plumbing):

- From `src/utils/`: `isObject`, `isSafeObjectKey`, `hasOwnProperty`, `hasStringProperty`,
  `toArray`, `isFilePath`, `getFileNameExtension`, `removeFileNameExtension`,
  `isTsNodeRuntimeEnvironment`, `isTypeScriptError`.
- From `src/locator/`: `buildLocatorPatterns`, `buildLocatorOptions`, `pathToLocatorInfo`,
  `buildFilePathWithoutExtension` (no test, no internal caller — dead public code).
- From `src/loader/built-in/module/`: `isESModule`, `toModuleRecord`, `getModuleExport`
  (`getModuleExport` has no production caller — only a test uses it).

## Direction

Curate the barrels: explicit named exports in `src/index.ts` (or per-directory `index.ts`) so
internal helpers stay internal. This is a **semver-major** cleanup — removing public symbols is
breaking; batch it with the next major (or fold into the in-flight 4.0 if it lands before release).

## Dependency category

In-process.

## Test impact

- Add a public-API snapshot test (exported symbol list) to make surface changes deliberate.

## Related

- [[deepen-loader-registry]] — shipped ([#855](https://github.com/tada5hi/locter/pull/855));
  exported `ILoader`/`Rule`/`LoaderFactory`/`LoaderRegistration` and gave the singleton its
  lifecycle, resolving the other half of this plan.
