# Architecture

## Overview

Locter is structured as two cooperating subsystems plus a utility layer:

1. **Locator** (`src/locator/`) — pure file discovery over `fast-glob`. Takes a glob pattern + options, returns `LocatorInfo` records `{ path, name, extension? }`. Has parallel sync/async surfaces.
2. **Format** (`src/format/`) — pluggable file reading and writing. A `FormatRegistry` dispatches to `IReader` / `IWriter` implementations: user-registered `Rule`s (matched first, in registration order) plus a built-in extension table derived from the `BUILT_IN_PRESETS` registry (`src/format/built-in/registry.ts`). A process-wide singleton (`useFormatRegistry`) is exposed via the `read` / `readAsModule` / `write` (+Sync) / `registerFormat` helpers. `read` is raw (plain parsed value for data; normalized module record for modules — raw module output would break twin parity, since import() and require() disagree on CJS shapes); `readAsModule` presents EVERY result as the uniform module record.
3. **Utils** (`src/utils/`) — stateless helpers shared by both subsystems.

The two subsystems are loosely coupled: `format/` depends on `locator/` only for `pathToLocatorInfo` and `buildFilePath` (to derive the extension and the on-disk path from a `LocatorInfo`). `locator/` does not import from `format/`.

## Core Design Decisions

### 1. Parallel sync + async surfaces, derived from one body

Every public operation has two variants: `locate` / `locateSync`, `read` / `readSync`, `write` / `writeSync`, and the `IReader` / `IWriter` ports themselves require both. This is a deliberate constraint — consumers (config loaders, CLIs, plugin systems) frequently can't `await`.

Internally, both variants are derived from **one shared body** via the twin protocol (`src/utils/twin.ts`, internal — not exported from the utils barrel): a body is a generator that yields effect pairs (`yield* op(asyncThunk, syncThunk)`), and `runTwinAsync` / `runTwinSync` drive whichever side the public function stands for. Effect errors re-enter the body via `Generator.throw`, so `try/catch` inside a body behaves identically in both variants. Bodies compose via `yield*` delegation (`locateUpBody` delegates to `locateBody`; the package-field bodies delegate to `locatePackageBody`). The bodies live in:

- `src/locator/core.ts` — `locateBody`, `locateManyBody` (used by `async.ts`, `sync.ts`, `up.ts`)
- `src/format/text-file/reader.ts` — `TextFileReader.body` (read → parse → wrap errors)
- `src/format/text-file/writer.ts` — `TextFileWriter.body` (optional read-existing → stringify → mkdir → write → wrap errors)
- `src/format/registry/module.ts` — `FormatRegistry.executeBody` (dispatch → execute → wrap errors), shared via `yield*` by `readBody` (raw / provenance-shaped) and `readAsModuleBody` (uniform record via `toRecord`), plus `FormatRegistry.writeBody` (dispatch → unwrap record → write → wrap)
- `src/format/package-field.ts` — `readPackageFieldBody`, `writePackageFieldBody`, `locatePackageBody`

**The one deliberate exception is `ModuleReader`**: `read` / `readSync` are hand-written twins because their recovery paths genuinely diverge (async falls back to `loadSync` under ts-node and to jiti otherwise; sync only has the jiti fallback). The divergence is documented on `read` and pinned by explicit fallback tests in `test/unit/format/module.spec.ts`.

When adding a new public operation, implement **both** variants by writing one twin body and two thin driver wrappers. Tests assert sync/async parity via the `expectParity` helper (`test/helpers/parity.ts`).

### 2. Singleton format registry

`registerFormat`, `read`, and `write` operate on a single lazily-created `FormatRegistry` instance held in `src/format/registry/singleton.ts`. This means format registration is process-global. Tests that need isolated state instantiate `new FormatRegistry()` directly (see `test/unit/format/module.spec.ts`, `test/unit/format/write.spec.ts`).

### 3. `jiti` for TypeScript/ESM/CJS module loading

`ModuleReader` (`src/format/built-in/module/reader.ts`) uses `jiti` to load `.ts`/`.mts`/`.cts`/`.cjs`/`.mjs`/`.js` regardless of whether the host is CJS or ESM. The class also has fallbacks for Jest (uses `require` directly to avoid a known segfault, [nodejs/node#35889](https://github.com/nodejs/node/issues/35889)) and `ts-node` (calls `loadSync` because `ts-node` doesn't cooperate with `jiti`'s async path). The module format is **read-only** — its preset declares no writer.

## Design Patterns

### Reader/Writer ports + registry

The core abstraction is the pair of ports (`src/format/type.ts`):

```typescript
export interface IReader {
    read: (input: string) => Promise<any>,
    readSync: (input: string) => any
}

export interface IWriter {
    write: (path: string, value: unknown) => Promise<void>,
    writeSync: (path: string, value: unknown) => void
}

export type Rule = {
    id?: string,
    test: RegExp | string[],           // string[] = file extensions like ['.json']
    reader?: IReader | ReaderFactory,  // slots are independent; at least one required
    writer?: IWriter | WriterFactory
};
```

Text-based formats don't implement the ports by hand — they extend the abstract bases in `src/format/text-file/` (public): `TextFileReader` owns the read body (UTF-8 read → `parse` → `wrapLoaderError`), `TextFileWriter` owns the write body (`stringify` → mkdir -p → UTF-8 write with trailing newline → `wrapWriteError`), and both derive their twin variants from it. A complete built-in pair (`JSONReader` / `JSONWriter`):

```typescript
export class JSONReader extends TextFileReader {
    parse(content: string) {
        return JSON.parse(content);
    }
}

export class JSONWriter extends TextFileWriter {
    stringify(value: unknown, existing?: string) {
        return JSON.stringify(value, null, 4)!;
    }
}
```

`TextFileWriter` has one hook beyond `stringify`: a subclass that overrides `usesExistingContent` to `true` receives the current content of the target file as `stringify`'s second argument (`undefined` if the file is absent). This single mechanism powers both format-preserving features: `YAMLWriter` grafts the new value into the parsed existing document (comments/anchors on surviving keys survive; corrupt existing content throws instead of being clobbered), and `JSONWriter` with `indent: 'auto'` detects and keeps the file's indentation.

Built-ins live in a single declarative registry (`src/format/built-in/registry.ts`) — one entry couples routing and construction; the id union (`BuiltInFormatId`), the writable-id union (`WritableBuiltInFormatId`, derived at the type level from which presets declare a writer), the extension table, lazy caching, and the typed `builtInReader()` / `builtInWriter()` accessors are all derived from it:

```typescript
export const BUILT_IN_PRESETS = {
    module: { extensions: MODULE_FILE_EXTENSIONS, reader: () => new ModuleReader() },
    conf: { extensions: ['.conf'], reader: () => new ConfReader(), writer: () => new ConfWriter() },
    json: { extensions: ['.json'], reader: () => new JSONReader(), writer: () => new JSONWriter() },
    yaml: { extensions: ['.yml', '.yaml'], reader: () => new YAMLReader(), writer: () => new YAMLWriter() },
    text: { extensions: ['.txt'], reader: () => new TextReader(), writer: () => new TextWriter() },
} as const satisfies Record<string, FormatPreset>;
```

Conventions for new formats:

- Class names: `<Format>Reader` / `<Format>Writer` (e.g. `TomlReader`, `TomlWriter`).
- File location: `src/format/built-in/<format>/{reader.ts,writer.ts}`, with a barrel `index.ts` in the same directory.
- Text-based format → extend `TextFileReader` (implement `parse(content)`) and `TextFileWriter` (implement `stringify(value, existing?)`); reading/writing, error wrapping, directory creation, and the sync/async derivation are inherited. Port methods receive plain string paths — the dispatcher normalizes `LocatorInfo` inputs before dispatch.
- Non-file or binary formats implement `IReader` / `IWriter` directly: wrap I/O in `try/catch` and rethrow via `wrapLoaderError(e, path)` / `wrapWriteError(e, path)`. The input is always a plain string path (the registry normalizes `LocatorInfo` via `buildFilePath` before dispatch).
- If the format is meant to be built-in: add ONE entry to `BUILT_IN_PRESETS` (`src/format/built-in/registry.ts`) — the id, extensions, reader, and optional writer live there together; the type system derives everything else. Export the classes from `src/format/built-in/index.ts` to make them public.
- If the format is external/plugin: consumers register it at runtime via `registerFormat` — instances or lazy factories per slot.

### Dispatcher: `FormatRegistry`

`FormatRegistry.findReader(input)` resolves an input to a live `IReader` (or `undefined`) in an explicit order:

1. Bare module specifiers (no extension, per `isFilePath`) always route to `builtInReader('module')` so `read('yaml')` works like `require('yaml')`.
2. User rules **that have a reader slot**, in registration order — first match wins. **User rules are matched before the built-in table**, so registering `.json` overrides the built-in JSON reader.
3. The built-in extension table (O(1) map derived from `BUILT_IN_PRESETS`).
4. `undefined` — `read`/`readSync` then throw `LocterUnknownExtensionError`.

`findWriter(input)` mirrors this **without the bare-specifier step** (there is nothing to write to): user rules with a writer slot, then built-in presets that declare a writer. The slots are deliberately independent — a reader-only rule for `.json` does not shadow the built-in JSON writer, and vice versa. When `write` finds no writer it distinguishes two failures: the extension resolves to a reader → `LocterWriteError` ("format is read-only", e.g. `.ts`); otherwise `LocterUnknownExtensionError`.

The registry does **not** implement the ports — it is a dispatcher over readers/writers, not one itself. Its `read`/`write` (+Sync) accept `LocatorInfo | string` (normalizing via `buildFilePath`), and own the record boundary — semantics a leaf reader's/writer's methods deliberately do not have:

- **Read side** (`toRecord`, readAsModule): every readAsModule result becomes a module record; `read` skips the data-wrapping — data formats return the raw parsed value, modules return `toModuleRecord` output (their honest shape). Provenance decides how: output of a `ModuleReader` goes through `toModuleRecord` (the `__esModule` marker is trustworthy for values a module system produced), while every other reader's output is arbitrary parsed data and is always wrapped via `createModuleRecord` — even if it happens to contain an `__esModule` key.
- **Write side** (inverse): records carry a private, non-enumerable Symbol brand (module-private, not `Symbol.for` — unforgeable from outside; `isModuleRecord` checks it). `writeBody` unwraps branded values to their `.default` before dispatching to the writer, so `read → modify → write` round-trips never leak the record wrapper. Arbitrary data with a literal `__esModule` key is written as-is. Branding is best-effort on the module-read passthrough path (module namespace objects are non-extensible — irrelevant, since module formats have no writer).

`builtInReader(id)` / `builtInWriter(id)` lazily instantiate and cache built-in instances per registry instance; `builtInReader('module')` is statically typed as `ModuleReader` (used by `setModuleReader`, no cast needed), and `builtInWriter` only accepts `WritableBuiltInFormatId` (passing `'module'` is a compile error).

### Singleton helper layer

```typescript
export async function read(input: LocatorInfo | string) : Promise<any> {
    return useFormatRegistry().read(input);
}
```

`read`, `readSync`, `write`, `writeSync`, `registerFormat`, and `unregisterFormat` are zero-state, pure delegations — the only state is in the singleton (`useFormatRegistry()`, exported), and input normalization (`LocatorInfo` → path) lives inside the registry. When writing new top-level helpers, follow the same pattern: get the singleton, delegate.

The registry has a lifecycle: every rule has a stable id (`register` returns a `FormatRegistration`; re-registering an id replaces in place, built-in ids are reserved), `unregister(id)` removes a user rule, `entries()`/`has(id)` introspect the effective match order, and `reset()` restores construction state (drops user rules and every cached instance, including a `setModuleReader`-configured module reader). `setModuleReader` returns a restore function re-applying the previous configuration. The global registry belongs to the application; libraries should isolate via `new FormatRegistry({ rules })`.

## Data Flow

```
Input:
  └── glob pattern (string | string[])  OR  module specifier / file path

Locate:
  1. buildLocatorPatterns(pattern)        → string[]
  2. buildLocatorOptions(options)         → { path[], ignore[], onlyFiles, onlyDirectories }
  3. fast-glob runs each pattern × cwd
  4. pathToLocatorInfo(absolutePath)      → { path, name, extension? }

Read (FormatRegistry.read / readSync):
  1. buildFilePath(input)                 → string (LocatorInfo → path or pass-through)
  2. findReader(path)                     → IReader | undefined
     (bare specifier → module reader; user rules; built-in extension table)
  3. reader.read(path)                    → parsed value
  4. toRecord(value, reader)              → normalized, branded module record
     (module reader → toModuleRecord; any other reader → createModuleRecord)

Write (FormatRegistry.write / writeSync):
  1. buildFilePath(input)                 → string; bare specifier → LocterWriteError
  2. findWriter(path)                     → IWriter | undefined
     (user rules with writer slot; built-in presets with writer)
     none: reader exists → LocterWriteError (read-only); else LocterUnknownExtensionError
  3. isModuleRecord(value) ? value.default : value   → plain value
  4. writer.write(path, plain)            → serialized, mkdir -p, UTF-8 + trailing newline

Output:
  └── LocatorInfo[] / LocatorInfo / module record  (reads)  —  file on disk (writes)
```

## Error Handling

- I/O and parsing errors inside built-in readers are routed through `wrapLoaderError(e, path)` (`src/errors/wrap.ts`), which maps them to typed `LocterError` subclasses (`LocterNotFoundError`, `LocterLoadError`) preserving the underlying error on `cause`.
- Write-side failures are routed through `wrapWriteError(e, path)` → `LocterWriteError`. `ENOENT` deliberately stays a `LocterWriteError` on this side (a missing parent directory is a write failure, not a lookup miss — and the writer creates parents anyway).
- `YAMLWriter` throws (wrapped) when the existing target fails to parse — it never silently overwrites a file it cannot understand.
- `ModuleReader` additionally:
    - Rethrows `SyntaxError`, `ReferenceError`, and TypeScript compile errors (detected by `isTypeScriptError`) without retry.
    - Retries with `withFilePrefix: true` (pathToFileURL) on `ERR_UNSUPPORTED_ESM_URL_SCHEME`.
- `FormatRegistry.read` throws `LocterUnknownExtensionError` when no rule matches and the input looks like a file path.

## File Structure

```text
src/locator/        → Locator subsystem (fast-glob)
src/format/         → Format dispatcher + helpers + singleton
src/format/built-in/<format>/   → Per-format reader/writer implementations
src/utils/          → Stateless helpers (allowed to be imported anywhere)
```
