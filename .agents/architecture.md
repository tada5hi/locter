# Architecture

## Overview

Locter is structured as two cooperating subsystems plus a utility layer:

1. **Locator** (`src/locator/`) — pure file discovery over `fast-glob`. Takes a glob pattern + options, returns `LocatorInfo` records `{ path, name, extension? }`. Has parallel sync/async surfaces.
2. **Loader** (`src/loader/`) — pluggable file loading. A `LoaderManager` dispatches to `ILoader` implementations: user-registered `Rule`s (matched first, in registration order) plus a built-in extension table derived from the `BUILT_IN_PRESETS` registry (`src/loader/built-in/registry.ts`). A process-wide singleton (`useLoader`) is exposed via the `load` / `loadSync` / `registerLoader` helpers.
3. **Utils** (`src/utils/`) — stateless helpers shared by both subsystems.

The two subsystems are loosely coupled: `loader/` depends on `locator/` only for `pathToLocatorInfo` and `buildFilePath` (to derive the extension and the on-disk path from a `LocatorInfo`). `locator/` does not import from `loader/`.

## Core Design Decisions

### 1. Parallel sync + async surfaces

Every public operation has two variants: `locate` / `locateSync`, `locateMany` / `locateManySync`, `load` / `loadSync`, and the `Loader` interface itself requires both `execute(input)` and `executeSync(input)`. This is a deliberate constraint — consumers (config loaders, CLIs, plugin systems) frequently can't `await`.

When adding a new loader or locator function, implement **both** variants. Tests in `test/unit/` typically cover both in the same `it()` block.

### 2. Singleton loader registry

`registerLoader` and `load` operate on a single lazily-created `LoaderManager` instance held in `src/loader/singleton.ts`. This means loader registration is process-global. Tests that need isolated state instantiate `new LoaderManager()` directly (see `test/unit/loader/module.spec.ts`).

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

export type LoaderFactory = () => ILoader;   // lazy; invoked once on first match, cached

export type Rule = {
    test: RegExp | string[],       // string[] = file extensions like ['.json']
    loader: ILoader | LoaderFactory
};
```

A typical implementation (`JSONLoader`):

```typescript
export class JSONLoader implements ILoader {
    async execute(input: string) {
        const filePath = buildFilePath(input);
        try {
            const file = await fs.promises.readFile(filePath, { encoding: 'utf-8' });
            return JSON.parse(file);
        } catch (e) {
            throw wrapLoaderError(e, filePath);
        }
    }

    executeSync(input: string) {
        const filePath = buildFilePath(input);
        try {
            const file = fs.readFileSync(filePath, { encoding: 'utf-8' });
            return JSON.parse(file);
        } catch (e) {
            throw wrapLoaderError(e, filePath);
        }
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
- Wrap I/O in `try/catch` and rethrow via `wrapLoaderError(e, filePath)` to produce typed `LocterError` subclasses.
- Use `buildFilePath(input)` so the loader accepts both raw paths and `LocatorInfo` objects (the dispatcher already converts, but loaders should not assume the form).
- If the loader is meant to be built-in: add ONE entry to `BUILT_IN_PRESETS` (`src/loader/built-in/registry.ts`) — the id, extensions, and factory live there together; the type system derives everything else. Export the class from `src/loader/built-in/index.ts` to make it public.
- If the loader is external/plugin: consumers register it at runtime via `registerLoader` — either an `ILoader` instance or a lazy `LoaderFactory`.

### Dispatcher: `LoaderManager`

`LoaderManager.find(input)` resolves an input to a live `ILoader` (or `undefined`) in an explicit order:

1. Bare module specifiers (no extension, per `isFilePath`) always route to `builtIn('module')` so `load('yaml')` works like `require('yaml')`.
2. User rules, in registration order — first match wins. **User rules are matched before the built-in table**, so registering `.json` overrides the built-in JSON loader.
3. The built-in extension table (O(1) map derived from `BUILT_IN_PRESETS`).
4. `undefined` — `execute`/`executeSync` then throw `LocterUnknownExtensionError`.

`builtIn(id)` lazily instantiates and caches built-in loaders per manager instance; `builtIn('module')` is statically typed as `ModuleLoader` (used by `setModuleLoader`, no cast needed).

### Singleton helper layer

```typescript
export async function load(input: LocatorInfo | string) : Promise<any> {
    const manager = useLoader();
    if (typeof input === 'string') {
        return manager.execute(input);
    }
    return manager.execute(buildFilePath(input));
}
```

`load`, `loadSync`, `registerLoader`, and `unregisterLoader` are zero-state wrappers — the only state is in the singleton (`useLoader()`, exported). When writing new top-level helpers, follow the same pattern: get the singleton, normalize `LocatorInfo` → string, delegate.

The registry has a lifecycle: every rule has a stable id (`register` returns a `LoaderRegistration`; re-registering an id replaces in place, built-in ids are reserved), `unregister(id)` removes a user rule, `entries()`/`has(id)` introspect the effective match order, and `reset()` restores construction state (drops user rules and every cached instance, including a `setModuleLoader`-configured module loader). `setModuleLoader` returns a restore function re-applying the previous configuration. The global registry belongs to the application; libraries should isolate via `new LoaderManager({ rules })`.

## Data Flow

```
Input:
  └── glob pattern (string | string[])  OR  module specifier / file path

Locate:
  1. buildLocatorPatterns(pattern)        → string[]
  2. buildLocatorOptions(options)         → { path[], ignore[], onlyFiles, onlyDirectories }
  3. fast-glob runs each pattern × cwd
  4. pathToLocatorInfo(absolutePath)      → { path, name, extension? }

Load:
  1. buildFilePath(input)                 → string (LocatorInfo → path or pass-through)
  2. LoaderManager.find(input)            → ILoader | undefined
     (bare specifier → module loader; user rules; built-in extension table)
  3. loader.execute(input)                → parsed value
  4. toModuleRecord(value)                → normalized module record

Output:
  └── LocatorInfo[] / LocatorInfo / parsed module/JSON/YAML/conf record
```

## Error Handling

- I/O and parsing errors inside built-in loaders are routed through `wrapLoaderError(e, path)` (`src/errors/wrap.ts`), which maps them to typed `LocterError` subclasses (`LocterNotFoundError`, `LocterLoadError`) preserving the underlying error on `cause`.
- `ModuleLoader` additionally:
    - Rethrows `SyntaxError`, `ReferenceError`, and TypeScript compile errors (detected by `isTypeScriptError`) without retry.
    - Retries with `withFilePrefix: true` (pathToFileURL) on `ERR_UNSUPPORTED_ESM_URL_SCHEME`.
- `LoaderManager.execute` throws `LocterUnknownExtensionError` when no rule matches and the input looks like a file path.

## File Structure

```text
src/locator/        → Locator subsystem (fast-glob)
src/loader/         → Loader dispatcher + helpers + singleton
src/loader/built-in/<format>/   → Per-format Loader implementations
src/utils/          → Stateless helpers (allowed to be imported anywhere)
```
