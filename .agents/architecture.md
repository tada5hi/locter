# Architecture

## Overview

Locter is structured as two cooperating subsystems plus a utility layer:

1. **Locator** (`src/locator/`) — pure file discovery over `fast-glob`. Takes a glob pattern + options, returns `LocatorInfo` records `{ path, name, extension? }`. Has parallel sync/async surfaces.
2. **Loader** (`src/loader/`) — pluggable file loading. A `LoaderRegistry` dispatches to `ILoader` implementations: user-registered `Rule`s (matched first, in registration order) plus a built-in extension table derived from the `BUILT_IN_PRESETS` registry (`src/loader/built-in/registry.ts`). A process-wide singleton (`useLoaderRegistry`) is exposed via the `load` / `loadSync` / `registerLoader` helpers.
3. **Utils** (`src/utils/`) — stateless helpers shared by both subsystems.

The two subsystems are loosely coupled: `loader/` depends on `locator/` only for `pathToLocatorInfo` and `buildFilePath` (to derive the extension and the on-disk path from a `LocatorInfo`). `locator/` does not import from `loader/`.

## Core Design Decisions

### 1. Parallel sync + async surfaces, derived from one body

Every public operation has two variants: `locate` / `locateSync`, `locateMany` / `locateManySync`, `load` / `loadSync`, and the `ILoader` interface itself requires both `execute(input)` and `executeSync(input)`. This is a deliberate constraint — consumers (config loaders, CLIs, plugin systems) frequently can't `await`.

Internally, both variants are derived from **one shared body** via the twin protocol (`src/utils/twin.ts`, internal — not exported from the utils barrel): a body is a generator that yields effect pairs (`yield* op(asyncThunk, syncThunk)`), and `runTwinAsync` / `runTwinSync` drive whichever side the public function stands for. Effect errors re-enter the body via `Generator.throw`, so `try/catch` inside a body behaves identically in both variants. Bodies compose via `yield*` delegation (`locateUpBody` delegates to `locateBody`). The bodies live in:

- `src/locator/core.ts` — `locateBody`, `locateManyBody` (used by `async.ts`, `sync.ts`, `up.ts`)
- `src/loader/text-file.ts` — `TextFileLoader.body` (read → parse → wrap errors)
- `src/loader/registry/module.ts` — `LoaderRegistry.loadBody` (dispatch → execute → normalize → wrap)
- `src/loader/package-field.ts` — `loadPackageFieldBody`

**The one deliberate exception is `ModuleLoader`**: `execute` / `executeSync` are hand-written twins because their recovery paths genuinely diverge (async falls back to `loadSync` under ts-node and to jiti otherwise; sync only has the jiti fallback). The divergence is documented on `execute` and pinned by explicit fallback tests in `test/unit/loader/module.spec.ts`.

When adding a new public operation, implement **both** variants by writing one twin body and two thin driver wrappers. Tests assert sync/async parity via the `expectParity` helper (`test/helpers/parity.ts`).

### 2. Singleton loader registry

`registerLoader` and `load` operate on a single lazily-created `LoaderRegistry` instance held in `src/loader/registry/singleton.ts`. This means loader registration is process-global. Tests that need isolated state instantiate `new LoaderRegistry()` directly (see `test/unit/loader/module.spec.ts`).

### 3. `jiti` for TypeScript/ESM/CJS module loading

`ModuleLoader` (`src/loader/built-in/module/module.ts`) uses `jiti` to load `.ts`/`.mts`/`.cts`/`.cjs`/`.mjs`/`.js` regardless of whether the host is CJS or ESM. The class also has fallbacks for Jest (uses `require` directly to avoid a known segfault, [nodejs/node#35889](https://github.com/nodejs/node/issues/35889)) and `ts-node` (calls `loadSync` because `ts-node` doesn't cooperate with `jiti`'s async path).

## Design Patterns

### Loader port + registry

The core abstraction is the `ILoader` interface (`src/loader/type.ts`):

```typescript
export interface ILoader {
    execute: (input: string) => Promise<any>,
    executeSync: (input: string) => any
}

export type LoaderFactory = () => ILoader;   // lazy; first successful construction is cached

export type Rule = {
    test: RegExp | string[],       // string[] = file extensions like ['.json']
    loader: ILoader | LoaderFactory
};
```

Text-based formats don't implement `ILoader` by hand — they extend the abstract `TextFileLoader` (`src/loader/text-file.ts`, public), which owns the shared body (UTF-8 read → `parse` → `wrapLoaderError`) and derives both `execute` variants from it. A complete built-in (`JSONLoader`):

```typescript
export class JSONLoader extends TextFileLoader {
    parse(content: string) {
        return JSON.parse(content);
    }
}
```

Built-ins live in a single declarative registry (`src/loader/built-in/registry.ts`) — one entry couples routing and construction; the id union (`BuiltInLoaderId`), the extension table, lazy caching, and the typed `builtIn()` accessor are all derived from it:

```typescript
export const BUILT_IN_PRESETS = {
    module: { extensions: MODULE_FILE_EXTENSIONS, create: () => new ModuleLoader() },
    conf: { extensions: ['.conf'], create: () => new ConfLoader() },
    json: { extensions: ['.json'], create: () => new JSONLoader() },
    yaml: { extensions: ['.yml', '.yaml'], create: () => new YAMLLoader() },
} as const satisfies Record<string, LoaderPreset>;
```

Conventions for new loaders:

- Class name: `<Format>Loader` (e.g. `TomlLoader`).
- File location: `src/loader/built-in/<format>/module.ts`, with a barrel `index.ts` in the same directory.
- Text-based format → extend `TextFileLoader` and implement `parse(content)` only; reading, error wrapping (`wrapLoaderError`), input normalization (`buildFilePath`), and the sync/async derivation are inherited.
- Non-file or binary loaders implement `ILoader` directly: wrap I/O in `try/catch`, rethrow via `wrapLoaderError(e, filePath)`, and use `buildFilePath(input)` so raw paths and `LocatorInfo` objects both work.
- If the loader is meant to be built-in: add ONE entry to `BUILT_IN_PRESETS` (`src/loader/built-in/registry.ts`) — the id, extensions, and factory live there together; the type system derives everything else. Export the class from `src/loader/built-in/index.ts` to make it public.
- If the loader is external/plugin: consumers register it at runtime via `registerLoader` — either an `ILoader` instance or a lazy `LoaderFactory`.

### Dispatcher: `LoaderRegistry`

`LoaderRegistry.find(input)` resolves an input to a live `ILoader` (or `undefined`) in an explicit order:

1. Bare module specifiers (no extension, per `isFilePath`) always route to `builtIn('module')` so `load('yaml')` works like `require('yaml')`.
2. User rules, in registration order — first match wins. **User rules are matched before the built-in table**, so registering `.json` overrides the built-in JSON loader.
3. The built-in extension table (O(1) map derived from `BUILT_IN_PRESETS`).
4. `undefined` — `load`/`loadSync` then throw `LocterUnknownExtensionError`.

The registry does **not** implement `ILoader` — it is a dispatcher over loaders, not a loader itself. Its `load`/`loadSync` accept `LocatorInfo | string` (normalizing via `buildFilePath`), normalize results to a module record, and wrap errors — semantics a leaf loader's `execute` deliberately does not have. Normalization happens **only** here and is provenance-aware: output of a `ModuleLoader` goes through `toModuleRecord` (the `__esModule` marker is trustworthy for values a module system produced), while every other loader's output is arbitrary parsed data and is always wrapped via `createModuleRecord` — even if it happens to contain an `__esModule` key.

`builtIn(id)` lazily instantiates and caches built-in loaders per manager instance; `builtIn('module')` is statically typed as `ModuleLoader` (used by `setModuleLoader`, no cast needed).

### Singleton helper layer

```typescript
export async function load(input: LocatorInfo | string) : Promise<any> {
    return useLoaderRegistry().load(input);
}
```

`load`, `loadSync`, `registerLoader`, and `unregisterLoader` are zero-state, pure delegations — the only state is in the singleton (`useLoaderRegistry()`, exported), and input normalization (`LocatorInfo` → path) lives inside the registry. When writing new top-level helpers, follow the same pattern: get the singleton, delegate.

The registry has a lifecycle: every rule has a stable id (`register` returns a `LoaderRegistration`; re-registering an id replaces in place, built-in ids are reserved), `unregister(id)` removes a user rule, `entries()`/`has(id)` introspect the effective match order, and `reset()` restores construction state (drops user rules and every cached instance, including a `setModuleLoader`-configured module loader). `setModuleLoader` returns a restore function re-applying the previous configuration. The global registry belongs to the application; libraries should isolate via `new LoaderRegistry({ rules })`.

## Data Flow

```
Input:
  └── glob pattern (string | string[])  OR  module specifier / file path

Locate:
  1. buildLocatorPatterns(pattern)        → string[]
  2. buildLocatorOptions(options)         → { path[], ignore[], onlyFiles, onlyDirectories }
  3. fast-glob runs each pattern × cwd
  4. pathToLocatorInfo(absolutePath)      → { path, name, extension? }

Load (LoaderRegistry.load / loadSync):
  1. buildFilePath(input)                 → string (LocatorInfo → path or pass-through)
  2. find(path)                           → ILoader | undefined
     (bare specifier → module loader; user rules; built-in extension table)
  3. loader.execute(path)                 → parsed value
  4. toRecord(value, loader)              → normalized module record
     (module loader → toModuleRecord; any other loader → createModuleRecord)

Output:
  └── LocatorInfo[] / LocatorInfo / parsed module/JSON/YAML/conf record
```

## Error Handling

- I/O and parsing errors inside built-in loaders are routed through `wrapLoaderError(e, path)` (`src/errors/wrap.ts`), which maps them to typed `LocterError` subclasses (`LocterNotFoundError`, `LocterLoadError`) preserving the underlying error on `cause`.
- `ModuleLoader` additionally:
    - Rethrows `SyntaxError`, `ReferenceError`, and TypeScript compile errors (detected by `isTypeScriptError`) without retry.
    - Retries with `withFilePrefix: true` (pathToFileURL) on `ERR_UNSUPPORTED_ESM_URL_SCHEME`.
- `LoaderRegistry.load` throws `LocterUnknownExtensionError` when no rule matches and the input looks like a file path.

## File Structure

```text
src/locator/        → Locator subsystem (fast-glob)
src/loader/         → Loader dispatcher + helpers + singleton
src/loader/built-in/<format>/   → Per-format Loader implementations
src/utils/          → Stateless helpers (allowed to be imported anywhere)
```
