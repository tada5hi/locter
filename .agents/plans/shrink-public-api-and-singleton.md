# Plan: Shrink accidental public API + give the singleton a lifecycle

Status: proposed (not started). Origin: architecture exploration, 2026-07-16.

## Problem

`src/index.ts` does `export *` over four barrels, which recursively publishes every internal helper
— while omitting the types the API asks users to build.

**Accidentally public** (undocumented, internal plumbing):

- From `src/utils/`: `isObject`, `isSafeObjectKey`, `hasOwnProperty`, `hasStringProperty`,
  `toArray`, `isFilePath`, `getFileNameExtension`, `removeFileNameExtension`,
  `isTsNodeRuntimeEnvironment`, `isTypeScriptError`.
- From `src/locator/`: `buildLocatorPatterns`, `buildLocatorOptions`, `pathToLocatorInfo`,
  `buildFilePathWithoutExtension` (no test, no internal caller — dead public code).
- From `src/loader/built-in/module/`: `isESModule`, `toModuleRecord`, `getModuleExport`
  (`getModuleExport` has no production caller — only a test uses it).

**Accidentally missing:** `Loader` and `Rule` (`src/loader/type.ts`) are not re-exported anywhere,
yet `registerLoader` takes them and the README documents building them. A TS consumer cannot
`import { Loader, Rule } from 'locter'`. `LoaderId` is likewise unexported (forcing a deep-path
import in `test/unit/loader/module.spec.ts:18`).

**Singleton lifecycle:** `useLoader()` (`src/loader/singleton.ts`) is process-global, append-only
(no un-register, no reset). Tests hand-restore state in `finally` blocks
(`module.spec.ts`, `errors.spec.ts` both call `setModuleLoader({ load: undefined, loadSync: undefined })`)
and any `registerLoader` call in a test leaks a rule permanently.

## Direction

Curate the barrels: explicit named exports in `src/index.ts` (or per-directory `index.ts`) so
internal helpers stay internal; export `Loader`, `Rule`, `LoaderId`. Add a lifecycle to the
singleton (reset, or make `LoaderManager` trivially constructable/scoped for tests and document it).
This is a **semver-major** cleanup — removing public symbols is breaking; batch it for the next
major.

## Dependency category

In-process.

## Test impact

- Removes the deep-path `LoaderId` import in `module.spec.ts`.
- A resettable/scoped manager kills the manual `finally`-teardown pattern.
- Add a public-API snapshot test (exported symbol list) to make surface changes deliberate.

## Related

- [[deepen-loader-registry]] — decides what `Loader`/`Rule`/`LoaderId` look like before exporting.
