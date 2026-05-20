# Architecture

## Overview

Locter is structured as two cooperating subsystems plus a utility layer:

1. **Locator** (`src/locator/`) — pure file discovery over `fast-glob`. Takes a glob pattern + options, returns `LocatorInfo` records `{ path, name, extension? }`. Has parallel sync/async surfaces.
2. **Loader** (`src/loader/`) — pluggable file loading. A `LoaderManager` keeps an ordered list of `Rule`s mapping file extensions (or a regex over the path) to `Loader` implementations. A process-wide singleton (`useLoader`) is exposed via the `load` / `loadSync` / `registerLoader` helpers.
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

The core abstraction is the `Loader` interface (`src/loader/type.ts`):

```typescript
export type Loader = {
    execute: (input: string) => Promise<any>,
    executeSync: (input: string) => any
};

export type Rule = {
    test: RegExp | string[],   // string[] = file extensions like ['.json']
    loader: Loader | string    // string = LoaderId for a built-in, or module specifier for a plugin
};
```

A typical implementation (`JSONLoader`):

```typescript
export class JSONLoader implements Loader {
    async execute(input: string) {
        const filePath = buildFilePath(input);
        try {
            const file = await fs.promises.readFile(filePath, { encoding: 'utf-8' });
            return JSON.parse(file);
        } catch (e) {
            return handleException(e);
        }
    }

    executeSync(input: string) {
        const filePath = buildFilePath(input);
        try {
            const file = fs.readFileSync(filePath, { encoding: 'utf-8' });
            return JSON.parse(file);
        } catch (e) {
            return handleException(e);
        }
    }
}
```

Conventions for new loaders:

- Class name: `<Format>Loader` (e.g. `TomlLoader`).
- File location: `src/loader/built-in/<format>/module.ts`, with a barrel `index.ts` in the same directory.
- Wrap I/O in `try/catch` and rethrow via `handleException(e)` to normalize non-`Error` throws.
- Use `buildFilePath(input)` so the loader accepts both raw paths and `LocatorInfo` objects (the dispatcher already converts, but loaders should not assume the form).
- If the loader is meant to be built-in: add an entry to `LoaderId` (`src/loader/constants.ts`), register a default `Rule` in the `LoaderManager` constructor, and add a `case` in `LoaderManager.resolve()`.
- If the loader is external/plugin: consumers register it at runtime via `registerLoader`.

### Dispatcher: `LoaderManager`

`LoaderManager.findLoader(input)` walks the `rules` array in registration order:

- Bare module specifiers (no extension, per `isFilePath`) fall through to `LoaderId.MODULE` so `load('yaml')` works like `require('yaml')`.
- Otherwise, the file's extension is matched against `test: string[]` rules first, then against `test: RegExp` rules.
- The first matching rule wins. **Rules added later via `registerLoader` are matched after the built-ins** — they cannot override `.json`/`.yml`/`.conf` or the JS/TS extension set unless you mutate the rule list directly.

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

`load`, `loadSync`, and `registerLoader` are zero-state wrappers — the only state is in the singleton. When writing new top-level helpers, follow the same pattern: get the singleton, normalize `LocatorInfo` → string, delegate.

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
  2. LoaderManager.findLoader(input)      → LoaderId | Loader | undefined
  3. LoaderManager.resolve(id)            → cached Loader instance
  4. loader.execute(input)                → parsed value

Output:
  └── LocatorInfo[] / LocatorInfo / parsed module/JSON/YAML/conf record
```

## Error Handling

- I/O and parsing errors inside built-in loaders are routed through `handleException(e)` (`src/utils/error.ts`), which rethrows real `Error`s as-is and normalizes non-`Error` throws into a real `Error` (copying `message`/`stack` if present).
- `ModuleLoader` additionally:
    - Rethrows `SyntaxError`, `ReferenceError`, and TypeScript compile errors (detected by `isTypeScriptError`) without retry.
    - Wraps native loader errors with `BaseError` from `ebec`, preserving `code`/`message`/`stack`.
    - Retries with `withFilePrefix: true` (pathToFileURL) on `ERR_UNSUPPORTED_ESM_URL_SCHEME`.
- `LoaderManager.execute` throws `Error("No loader registered for extension: ...")` when no rule matches and the input looks like a file path.

## File Structure

```text
src/locator/        → Locator subsystem (fast-glob)
src/loader/         → Loader dispatcher + helpers + singleton
src/loader/built-in/<format>/   → Per-format Loader implementations
src/utils/          → Stateless helpers (allowed to be imported anywhere)
```
