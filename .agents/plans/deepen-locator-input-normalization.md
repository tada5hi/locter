# Plan: Deepen locator input normalization

Status: proposed (not started). Origin: architecture exploration, 2026-07-16.

## Problem

Input/option normalization is smeared across `src/locator/utils.ts` with per-call-site conventions;
the bugs hide at the call sites, not in the pure functions:

- **`buildLocatorOptions` contradictory branch (bug):** `{ onlyFiles: true, onlyDirectories: true }`
  resolves to **both false** (`src/locator/utils.ts:31-43`), so fast-glob returns everything — the
  opposite of what either flag requests. No caller test exercises the contradictory input.
- **`pathToLocatorInfo` two-mode `skipResolve` flag:** glob callers (`async.ts:33`, `sync.ts:33`)
  pass `true` (paths already absolute); loader callers (`loader/module.ts:90,102`) omit it and rely
  on `process.cwd()` resolution. Two caller families with opposite assumptions, the loader-side
  branch untested. Path reconstruction is POSIX-flavored (`directory.split('/')`).
- **`buildFilePath` as a no-op import:** every data loader (`json`, `yaml`, `conf`) calls
  `buildFilePath(input)` on a string input, which returns it unchanged — coupling every leaf loader
  to the locator module for nothing. `originalPath` in `built-in/module/module.ts:38` re-implements
  the same branch.
- **`isFilePath` is a syntactic guess:** `path.extname(input) !== ''` decides module-specifier vs
  file-path routing in `LoaderRegistry.findLoader`. Extensionless file paths silently route to the
  module loader.

## Direction

One documented precedence rule for `onlyFiles`/`onlyDirectories` (or reject contradictory input),
one canonical "normalize input → absolute path + LocatorInfo" entry point with the resolution mode
explicit in the type rather than a boolean flag, and drop the no-op `buildFilePath` calls from leaf
loaders (the dispatcher already normalizes).

## Dependency category

In-process — pure path/option logic.

## Test impact

- Table-driven boundary tests on `locate*` option combinations (including the contradictory pair)
  and on `load` input shapes (string path, LocatorInfo, bare specifier, extensionless path).
- Replaces the need to ever unit-test `buildLocatorOptions`/`pathToLocatorInfo` directly.

## Related

- [[deepen-loader-registry]] — `findLoader`'s use of `isFilePath` is part of the registry seam.
