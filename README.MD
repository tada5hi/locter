# Locter 🔥

[![npm version](https://badge.fury.io/js/locter.svg)](https://badge.fury.io/js/locter)
[![CI](https://github.com/tada5hi/locter/actions/workflows/main.yml/badge.svg)](https://github.com/tada5hi/locter/actions/workflows/main.yml)
[![codecov](https://codecov.io/gh/Tada5hi/locter/branch/master/graph/badge.svg?token=4KNSG8L13V)](https://codecov.io/gh/Tada5hi/locter)
[![Known Vulnerabilities](https://snyk.io/test/github/Tada5hi/locter/badge.svg?targetFile=package.json)](https://snyk.io/test/github/Tada5hi/locter?targetFile=package.json)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-%23FE5196?logo=conventionalcommits&logoColor=white)](https://conventionalcommits.org)

Locter is a library to locate, read and write files/modules regarding specific criteria.

**Table of Contents**

- [Installation](#installation)
- [Usage](#usage)
  - [Locator](#locator)
  - [Reader](#reader)
  - [Writer](#writer)
  - [Formats](#formats)
  - [Errors](#errors)
  - [Migrating from 3.x](#migrating-from-3x)
  - [Migrating from 2.x](#migrating-from-2x)
  - [Runtime environments](#runtime-environments)
- [License](#license)

## Installation

```bash
npm install locter --save
```

## Usage

The following examples are based on some shared assumptions:
- A folder named `files` exists in the root directory.
- The folder `files` contains the following files:
  - example.js
  - example.json
  - example.ts
  - example-long.ts


### Locator

**Multiple**

Locating multiple files will return information about all files matching the pattern.

```typescript
import { locateMany } from 'locter';

(async () => {
    let files = await locateMany(
        'files/example.{js,.ts}'
    );

    console.log(files);
    /*
    [
        { directory: '/cwd/files', name: 'example', extension: '.js', path: '/cwd/files/example.js' },
        { directory: '/cwd/files', name: 'example', extension: '.ts', path: '/cwd/files/example.ts' }
    ]
     */

    files = await locateMany(
        'files/*.{js,ts}'
    );

    console.log(files);
    /*
    [
        { directory: '/cwd/files', name: 'example', extension: '.js', path: '/cwd/files/example.js' },
        { directory: '/cwd/files', name: 'example', extension: '.ts', path: '/cwd/files/example.ts' },
        { directory: '/cwd/files', name: 'example-long', extension: '.ts', path: '/cwd/files/example-long.ts' }
    ]
     */
})
```

A synchronous variant is also available: `locateManySync`

**Single**

Locating a single file will return information about the first file matching the pattern.

```typescript
import { locate } from 'locter';

(async () => {
    let file = await locate(
        'files/example.{js,.ts}'
    );

    console.log(file);
    /*
    { directory: '/cwd/files', name: 'example', extension: '.js', path: '/cwd/files/example.js' }
     */
})
```

A synchronous variant is also available: `locateSync`

**Walking up**

`locateUp` walks from a starting directory toward the filesystem root and returns the first match (useful for discovering config files at the repo root from any sub-directory):

```typescript
import { locateUp } from 'locter';

(async () => {
    const info = await locateUp('trapi.config.{ts,mts,cts,mjs,cjs,js,json}', {
        cwd: process.cwd(),
    });

    console.log(info);
    /*
    { directory: '/repo', name: 'trapi.config', extension: '.ts', path: '/repo/trapi.config.ts' }
    or `undefined` if nothing matched
     */
})
```

Pass `stopAt: '/repo'` to cap the walk at a known ceiling — inclusive, so the ceiling directory itself is still searched.

A synchronous variant `locateUpSync` is also available.

**Options**

`locate` / `locateMany` (and their sync variants) accept an options object:

| Option            | Type                    | Default         | Notes                                                  |
|-------------------|-------------------------|-----------------|--------------------------------------------------------|
| `cwd`             | `string \| string[]`    | `process.cwd()` | Working directory (or directories) the pattern is resolved against |
| `ignore`          | `string \| string[]`    | `[]`            | Patterns to exclude                                    |
| `onlyFiles`       | `boolean`               | `true`          | Match files only                                       |
| `onlyDirectories` | `boolean`               | `false`         | Match directories only                                 |
| `dot`             | `boolean`               | `false`         | Match dotfiles (e.g. `.env`, `.npmrc`) for wildcard patterns |

`locateUp` / `locateUpSync` take the same options except `cwd` must be a single `string`, and additionally accept `stopAt?: string` (inclusive ceiling for the walk).

### Reader

The `read` method loads a file/module in an asynchronous fashion.
Either a string or the output of the locate/locateSync method can be passed as argument.

```typescript
import { read, locate } from 'locter';

(async () => {
    const file = await locate(
        'files/example.{js,.ts}'
    );

    let content = await read(file);
    console.log(content);
    // ...

    content = await read('...');
    console.log(content);
    // ...
})
```

There is also a synchronous method called `readSync`.

```typescript
import { readSync, locateSync } from 'locter';

const file = locateSync(
    'files/example.{js,.ts}'
);

const content = readSync(file);
```

Bare module specifiers (no file extension) are routed to the module reader, so
`read('yaml')` behaves like `import('yaml')` — note that reading a module
**executes** it.

**Module records**

Every `read` / `readSync` result is a **module record** — a frozen,
null-prototype object shaped like an ES module namespace: `default` always
holds the loaded value, and when that value is an object, its top-level keys
are re-exposed as named exports.

```typescript
import { read } from 'locter';

(async () => {
    const pkg = await read('package.json');

    console.log(pkg.default);   // the full parsed JSON value
    console.log(pkg.version);   // top-level keys are named exports
})
```

For JavaScript/TypeScript files the module's own namespace passes through
unchanged; the output of every other reader (built-in JSON/YAML/Conf and
user-registered ones) is always wrapped — even if the parsed data happens to
contain an `__esModule` key. The record is read-only: to mutate the loaded
data, work with `.default`.

Records additionally carry a private, non-forgeable brand: `isModuleRecord`
tells records produced by `read()` apart from arbitrary data, and
[`write`](#writer) uses the brand to unwrap `.default` automatically on
write-back.

To pick an export by predicate, the `getModuleExport` helper is available:

```typescript
import { getModuleExport, read } from 'locter';

(async () => {
    const record = await read('files/example.ts');

    const found = getModuleExport(record, (key) => key === 'myExport');
    // → { key: 'myExport', value: ... }, or undefined if no key matches
})
```

**Reading a `package.json` field**

`readPackageField` reads a top-level field from the nearest `package.json` — handy for the common `pkg.<your-config-key>` config-loading fallback (vite's `pkg.vite`, eslint's `pkg.eslintConfig`, etc.):

```typescript
import { readPackageField } from 'locter';

(async () => {
    const cwd = process.cwd();

    const value = await readPackageField<{ entry: string }>('myapp', { cwd });
    // → the value of the `myapp` field, or undefined if package.json
    //   or the field is absent.

    // Walk parent directories until a package.json is found:
    const parentValue = await readPackageField('myapp', {
        cwd,
        walkUp: true,
        stopAt: '/repo', // optional ceiling, inclusive
    });
})
```

Throws `LocterLoadError` if the resolved `package.json` is malformed. A sync variant `readPackageFieldSync` is also available.

### Writer

The `write` method serializes a value to a file, dispatched by extension like
`read` — no need to pull `yaml` or a `.conf` serializer into the consuming
application:

```typescript
import { read, write } from 'locter';

(async () => {
    const config = await read('config.yml');
    config.default.port = 8080;

    // records produced by read() are unwrapped automatically —
    // the file receives the plain value, not the record wrapper
    await write('config.yml', config);

    // plain values work just as well
    await write('generated/settings.json', { port: 8080 });
})
```

A synchronous variant is also available: `writeSync`.

Write semantics:

- **Missing parent directories are created** (`mkdir -p`).
- Output always ends with a single trailing newline.
- Values that are records produced by `read()` (detected via the private
  brand — an `__esModule` key in plain data does **not** count) are unwrapped
  to their `.default` value before serialization.
- Module formats (`.js`, `.ts`, …) are **read-only**: `write('config.ts', …)`
  throws `LocterWriteError`, as does writing to a bare module specifier.

Per-format behavior:

- **JSON** — 4-space indent by default; configurable per instance:
  `new JSONWriter({ indent })` accepts a number of spaces, a literal indent
  string, or `'auto'` (detect and keep the indentation of the existing file).
- **YAML** — *comment-preserving* write-back: when the target file exists, the
  value is grafted into the parsed document, so comments and anchors attached
  to surviving keys survive. Arrays and type-changed nodes are replaced
  wholesale. A corrupt existing file throws instead of being overwritten.

  ```yaml
  # port used by the dev server
  port: 3000
  ```

  ```typescript
  await write('config.yml', { port: 8080 });
  ```

  ```yaml
  # port used by the dev server
  port: 8080
  ```

- **Conf** — the inverse of the reader: nested objects become dot-separated
  `key=value` lines, arrays repeated `key[]=` lines. Round-trips are
  structural, not textual: comments and line order are dropped, and a string
  that parses as another type (`'123'`) reads back as that type (`123`).

**Writing a `package.json` field**

`writePackageField` is the write-side companion of `readPackageField` (same
`cwd` / `walkUp` / `stopAt` semantics): it sets a top-level field of the
nearest `package.json` and writes it back **preserving the file's existing
indentation**.

```typescript
import { writePackageField } from 'locter';

(async () => {
    await writePackageField('myapp', { entry: 'src' }, { cwd: process.cwd() });

    // passing undefined removes the field
    await writePackageField('myapp', undefined);
})
```

Throws `LocterNotFoundError` when no `package.json` could be located. A sync
variant `writePackageFieldSync` is also available.

### Formats

A format couples an extension set with a reader and an optional writer. The
built-in formats are pre-registered:

- **conf** (`.conf`): `ConfReader` + `ConfWriter`
- **json** (`.json`): `JSONReader` + `JSONWriter`
- **yaml** (`.yml`, `.yaml`): `YAMLReader` + `YAMLWriter`
- **module** (`.js`, `.mjs`, `.mts`, `.cjs`, `.cts`, `.ts`): `ModuleReader`
  (read-only) — loads modules independent of the environment (cjs or esm).

To register a format for other file types, use `registerFormat`. Rules are
matched in registration order, **before** the built-ins — registering an
extension a built-in claims (e.g. `.json`) overrides it. The reader and writer
slots are independent: a reader-only rule overrides how `.json` is read
without shadowing the built-in JSON writer (and vice versa).

```typescript
import { registerFormat } from 'locter';

registerFormat({
    test: ['.ext'],
    reader: {
        async read(input: string) {
            // ...
        },
        readSync(input: string) {
            // ...
        },
    },
    writer: {
        async write(path: string, value: unknown) {
            // ...
        },
        writeSync(path: string, value: unknown) {
            // ...
        },
    },
});
```

For text-based formats, extending the abstract `TextFileReader` /
`TextFileWriter` base classes is simpler than implementing the `IReader` /
`IWriter` ports by hand: the bases own UTF-8 I/O, typed error wrapping, and
derive the sync and async surface from a single implementation — only
`parse(content)` respectively `stringify(value)` must be provided. The
built-in JSON/YAML/Conf formats are implemented this way.

```typescript
import { TextFileReader, TextFileWriter, registerFormat } from 'locter';
import { parse, stringify } from 'smol-toml';

class TomlReader extends TextFileReader {
    parse(content: string) {
        return parse(content);
    }
}

class TomlWriter extends TextFileWriter {
    stringify(value: unknown) {
        return stringify(value);
    }
}

registerFormat({
    test: ['.toml'],
    reader: () => new TomlReader(),
    writer: () => new TomlWriter(),
});
```

Instead of instances, the slots accept factory functions (as above) — a
factory is invoked lazily on the first matching input and the first
successfully constructed instance is cached (a factory that throws is retried
on the next match).

Every rule has a stable id (auto-generated, or set explicitly). Registering an
existing id replaces that rule in place; built-in ids (`module`, `conf`,
`json`, `yaml`) are reserved. The registry can be inspected and unwound:

```typescript
import { registerFormat, unregisterFormat, useFormatRegistry } from 'locter';

const registration = registerFormat({ test: ['.json5'], reader: json5Reader });
unregisterFormat(registration.id);          // remove it again

registerFormat({ id: 'json5', test: ['.json5'], reader: otherReader }); // replace by id

const registry = useFormatRegistry();       // the process-global FormatRegistry
registry.entries();                         // [{ id, test, builtIn }, ...] in match order
registry.has('json');                       // true (built-in)
registry.reset();                           // drop all user rules + cached instances
```

The global registry belongs to the **application**. Libraries that need custom
formats should create their own isolated instance instead of mutating the
singleton: `new FormatRegistry({ rules: [...] })`.

### Errors

`read` / `write` (and every built-in format) throw a typed subclass of
`LocterError`, so callers can distinguish failure modes without substring
matching on `.message`:

| Class                          | When it's thrown                                        |
|--------------------------------|---------------------------------------------------------|
| `LocterNotFoundError`          | File or module does not exist (`ENOENT`, `MODULE_NOT_FOUND`, `ERR_MODULE_NOT_FOUND`) |
| `LocterLoadError`              | A reader threw — parse error, runtime/eval error, etc.  |
| `LocterWriteError`             | A write failed — serialization error, filesystem error, read-only format, corrupt existing YAML target |
| `LocterUnknownExtensionError`  | No rule matched the file's extension                    |
| `LocterError`                  | Base class; matches all of the above                    |

Each error exposes the offending `path` and preserves the underlying error
on `cause`:

```typescript
import { read, LocterNotFoundError, LocterLoadError } from 'locter';

try {
    await read('config.json');
} catch (err) {
    if (err instanceof LocterNotFoundError) {
        console.error(`Config file not found: ${err.path}`);
    } else if (err instanceof LocterLoadError) {
        console.error(`Failed to parse config: ${err.cause}`);
    } else {
        throw err;
    }
}
```

Note that on the write side `ENOENT` stays a `LocterWriteError` — a missing
parent directory is a write failure, not a lookup miss (and `write` creates
missing parents anyway).

`LocterError` extends [`BaseError`](https://github.com/Tada5hi/ebec) from `@ebec/core`, so each instance also carries a `code` (auto-derived from the class name unless overridden — e.g. `'ENOENT'` for `LocterNotFoundError`s thrown by the JSON reader) and a `toJSON()` for structured logging.

Each error class also publishes its `Symbol.for(...)` marker (`LOCTER_ERROR_MARKER`, `LOCTER_NOT_FOUND_ERROR_MARKER`, …), which makes `instanceof` work across realms — useful when consumers end up with duplicate copies of locter in their dependency tree.

### Migrating from 3.x

The 4.0 release renames the loader subsystem around the **format** concept
(read + write), reworks registration and dispatch, and normalizes results.
The list below is exhaustive — no other public APIs changed.

**Renames** (clean break, no deprecated aliases):

| 3.x                                  | 4.x                                        |
|--------------------------------------|--------------------------------------------|
| `load` / `loadSync`                  | `read` / `readSync`                        |
| `registerLoader` / `unregisterLoader`| `registerFormat` / `unregisterFormat`      |
| `LoaderManager`                      | `FormatRegistry`                           |
| `useLoader`                          | `useFormatRegistry`                        |
| `Loader` type (`execute`/`executeSync`) | `IReader` (`read`/`readSync`) + `IWriter` (`write`/`writeSync`) |
| `JSONLoader` / `YAMLLoader` / `ConfLoader` | `JSONReader`+`JSONWriter` / `YAMLReader`+`YAMLWriter` / `ConfReader`+`ConfWriter` |
| `ModuleLoader`                       | `ModuleReader`                             |
| `setModuleLoader`                    | `setModuleReader`                          |
| `loadPackageField` / `loadPackageFieldSync` | `readPackageField` / `readPackageFieldSync` |

**Behavioral changes:**

```diff
  // 1. User rules now override built-ins. Registering an extension a
  //    built-in claims (e.g. `.json`) previously had NO effect — the
  //    built-in rule always matched first. It now takes precedence.
  registerFormat({ test: ['.json'], reader: myJson5Reader }); // 4.x: overrides the built-in

  // 2. Plugin-string loaders are removed, and rules use the object form
  //    with independent reader/writer slots. Import the implementation
  //    yourself and register it (optionally lazily, via a factory).
- registerLoader({ test: ['.toml'], loader: 'toml' }); // resolved to @locter/toml, sync require()
+ import { TomlReader, TomlWriter } from '@locter/toml';
+ registerFormat({ test: ['.toml'], reader: () => new TomlReader(), writer: () => new TomlWriter() });

  // 3. The registry no longer implements the loader interface: execute() /
  //    executeSync() become read() / readSync() (accepting LocatorInfo |
  //    string), and findLoader() / resolve() are replaced by
  //    findReader() / findWriter() / builtInReader() / builtInWriter().
- const manager = new LoaderManager();
- await manager.execute('file.json');
+ const registry = new FormatRegistry();
+ await registry.read('file.json');       // mirrors the global read() helper
+ registry.findReader('file.json');       // IReader | undefined
+ registry.builtInReader('module');       // statically typed as ModuleReader

  // 4. Every read() / readSync() result is now a module record (see
  //    "Module records" above). Module files already resolved this way —
  //    json/yaml/conf and custom readers used to return the bare parsed
  //    value.
  const pkg = await read('package.json');
  pkg.version;                           // top-level keys still work
- pkg.default;                           // undefined
+ pkg.default;                           // the full parsed value
+ // The record is frozen and null-prototype: code that mutates the
+ // result, relies on Object.prototype, or enumerates/serializes it
+ // (now includes `default`) must use pkg.default instead.

  // 5. ModuleReader.read() / readSync() return the raw module value;
  //    normalization happens exactly once, at the registry boundary. Only
  //    relevant when invoking the reader class directly.
- await new ModuleLoader().execute('file.ts');  // normalized record
+ await new ModuleReader().read('file.ts');     // raw module value
+ await registry.read('file.ts');               // normalized record
```

**New in 4.0:**

- `write` / `writeSync` with per-format writers (`JSONWriter`, `YAMLWriter`,
  `ConfWriter`), including comment-preserving YAML write-back — see
  [Writer](#writer).
- `writePackageField` / `writePackageFieldSync`.
- `LocterWriteError` + `wrapWriteError`.
- `isModuleRecord` — brand-based detection of records produced by `read()`.
- The ports are exported as `IReader` / `IWriter`, alongside `Rule`,
  `ReaderFactory`, `WriterFactory` — so custom formats can be typed against
  the package.
- The extensions handled by the module reader are exported as
  `MODULE_FILE_EXTENSIONS`.
- `readPackageField` / `readPackageFieldSync` read `package.json` via the
  built-in JSON reader directly: user-registered `.json` rules no longer
  intercept the read, and synthetic record keys (`default`, `__esModule`) no
  longer resolve as package fields.

### Migrating from 2.x

The 3.0 release reshapes a few public surfaces. The list below is exhaustive — no other public APIs changed. (Symbols are shown under their 3.x names; see [Migrating from 3.x](#migrating-from-3x) for the current ones.)

```diff
- import { load, locate } from 'locter';
+ import { load, locate, LocterNotFoundError, LocterLoadError } from 'locter';

  // 1. LocatorOptions.path → cwd
- await locate('config.json', { path: process.cwd() });
+ await locate('config.json', { cwd: process.cwd() });

  // 2. LocatorInfo.path now holds the FULL file path (it was the
  //    containing directory in 2.x). buildFilePath(info) still works in
  //    both versions but is now a near-identity for LocatorInfo inputs.
- const filePath = buildFilePath(info);  // 2.x: composed from .path + .name + .extension
+ const filePath = info.path;            // 3.x: just the path field
+ const dir      = info.directory;       // 3.x: containing directory (the old `info.path`)

  // 3. load() / loadSync() (and every built-in loader) now throw
  //    LocterError subclasses instead of generic Error / ebec BaseError.
  try {
      await load('config.json');
- } catch (err) {
-     if (err.message.includes('ENOENT')) { /* … */ }
+ } catch (err) {
+     if (err instanceof LocterNotFoundError) { /* … */ }
+     else if (err instanceof LocterLoadError) { /* parse error: err.cause */ }
+     else throw err;
  }
```

Additionally:

- The `ebec` runtime dependency is replaced by `@ebec/core`. If you used to import `BaseError` from `ebec`, switch to `@ebec/core`.
- The package is now ESM-only (no `require('locter')`). This change shipped in the 2.x→3.x toolchain modernization commit; mentioned here for completeness.

### Runtime environments

Locter ships with two runtime detection helpers:

- `isJestRuntimeEnvironment()` — true when running under Jest. Built-in: the
  `ModuleReader` falls back to `require()` under Jest to avoid a known
  segmentation fault ([nodejs/node#35889](https://github.com/nodejs/node/issues/35889)).
- `isVitestRuntimeEnvironment()` — true when running under Vitest (checks
  `process.env.VITEST === 'true'`).

#### Using locter with Vitest

Locter's built-in `await import(id)` runs inside `node_modules/locter` and
therefore bypasses Vitest's `vite-node` module graph by default. For most use
cases this is fine, but it produces **duplicate module instances** when test
code statically imports a module and locter dynamically loads the same module
(or a transitive dependency of it). This breaks class identity for libraries
that rely on it (e.g. TypeORM entity metadata).

Use `setModuleReader` to inject an `import` call from user space so Vitest can
rewrite it:

```typescript
// vitest setup file
import { setModuleReader } from 'locter';

setModuleReader({
    load: (id) => import(id),
});
```

`setModuleReader` returns a restore function that re-applies the previous
configuration — useful for scoped overrides:

```typescript
const restore = setModuleReader({ load: (id) => import(id) });
// ...
restore();
```

Alternatively, the same effect can be achieved by inlining locter in
`vitest.config.ts`:

```typescript
export default defineConfig({
    test: {
        server: {
            deps: {
                inline: [/locter/],
            },
        },
    },
});
```


## License

Made with 💚

Published under [MIT License](./LICENSE).
