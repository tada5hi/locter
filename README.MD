# Locter 🔥

[![npm version](https://badge.fury.io/js/locter.svg)](https://badge.fury.io/js/locter)
[![CI](https://github.com/tada5hi/locter/actions/workflows/main.yml/badge.svg)](https://github.com/tada5hi/locter/actions/workflows/main.yml)
[![codecov](https://codecov.io/gh/Tada5hi/locter/branch/master/graph/badge.svg?token=4KNSG8L13V)](https://codecov.io/gh/Tada5hi/locter)
[![Known Vulnerabilities](https://snyk.io/test/github/Tada5hi/locter/badge.svg?targetFile=package.json)](https://snyk.io/test/github/Tada5hi/locter?targetFile=package.json)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-%23FE5196?logo=conventionalcommits&logoColor=white)](https://conventionalcommits.org)

Locter is a library to locate and load a file/modules regarding specific criteria.

**Table of Contents**

- [Installation](#installation)
- [Usage](#usage)
  - [Locator](#locator)
  - [Loader](#loader)
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

### Loader

The `load` method can be used to load a file/module in an asynchronous fashion.
Either a string or the output of the locate/locateSync method can be passed as argument.

```typescript
import { load, locate } from 'locter';

(async () => {
    const file = await locate(
        'files/example.{js,.ts}'
    );

    let content = await load(file);
    console.log(content);
    // ...

    content = await load('...');
    console.log(content);
    // ...
})
```

There is also a synchronous method called `loadSync` to load files.

```typescript
import { loadSync, locateSync } from 'locter';

(async () => {
    const file = await locateSync(
        'files/example.{js,.ts}'
    );

    let content = await loadSync(file);
    console.log(content);
    // ...

    content = await loadSync('...');
    console.log(content);
    // ...
})
```

Two loaders are predefined from scratch and already registered:
- **ConfLoader**: This loader allows to load `.conf` files.
- **JSONLoader**: This loader allows to load `.json` files.
- **YAMLLoader**: This loader allows to load `.yml` files.
- **ModuleLoader**: This loader allows to load modules with
  `.js`, `.mjs`, `.mts`, `.cjs`, `.cts`, `.ts` file extensions independent of the environment (cjs or esm).

**Reading a `package.json` field**

`loadPackageField` reads a top-level field from the nearest `package.json` — handy for the common `pkg.<your-config-key>` config-loading fallback (vite's `pkg.vite`, eslint's `pkg.eslintConfig`, etc.):

```typescript
import { loadPackageField } from 'locter';

(async () => {
    const cwd = process.cwd();

    const value = await loadPackageField<{ entry: string }>('myapp', { cwd });
    // → the value of the `myapp` field, or undefined if package.json
    //   or the field is absent.

    // Walk parent directories until a package.json is found:
    const parentValue = await loadPackageField('myapp', {
        cwd,
        walkUp: true,
        stopAt: '/repo', // optional ceiling, inclusive
    });
})
```

Throws `LocterLoadError` if the resolved `package.json` is malformed. A sync variant `loadPackageFieldSync` is also available.

To register loader for other file types, the function `registerLoader` can be used.
Rules are matched in registration order, **before** the built-in loaders — registering
an extension a built-in claims (e.g. `.json`) overrides it. Bare module specifiers
(no file extension) always use the module loader.

```typescript
import { registerLoader } from 'locter';

registerLoader(['.ext'], {
    async execute(input: string) {
        // ...
    },
    executeSync(input: string) {
        // ...
    }
})
```

Instead of a loader instance (the `ILoader` interface), a factory function can be
passed — it is invoked lazily on the first matching input and the first
successfully constructed loader is cached (a factory that throws is retried on
the next match):

```typescript
import { registerLoader } from 'locter';

registerLoader(['.toml'], () => new TomlLoader());
```

Every rule has a stable id (auto-generated, or set explicitly via the object form).
Registering an existing id replaces that rule in place; built-in ids
(`module`, `conf`, `json`, `yaml`) are reserved. The registry can be inspected
and unwound:

```typescript
import { registerLoader, unregisterLoader, useLoader } from 'locter';

const registration = registerLoader(['.json5'], json5Loader);
unregisterLoader(registration.id);          // remove it again

registerLoader({ id: 'json5', test: ['.json5'], loader: otherLoader }); // replace by id

const manager = useLoader();                // the process-global LoaderManager
manager.entries();                          // [{ id, test, builtIn }, ...] in match order
manager.has('json');                        // true (built-in)
manager.reset();                            // drop all user rules + cached loader instances
```

The global registry belongs to the **application**. Libraries that need custom
loaders should create their own isolated instance instead of mutating the
singleton: `new LoaderManager({ rules: [...] })`.

### Errors

`load` / `loadSync` (and every built-in loader) throw a typed subclass of
`LocterError`, so callers can distinguish failure modes without substring
matching on `.message`:

| Class                          | When it's thrown                                        |
|--------------------------------|---------------------------------------------------------|
| `LocterNotFoundError`          | File or module does not exist (`ENOENT`, `MODULE_NOT_FOUND`, `ERR_MODULE_NOT_FOUND`) |
| `LocterLoadError`              | A loader threw — parse error, runtime/eval error, etc.  |
| `LocterUnknownExtensionError`  | No rule matched the file's extension                    |
| `LocterError`                  | Base class; matches all of the above                    |

Each error exposes the offending `path` and preserves the underlying error
on `cause`:

```typescript
import { load, LocterNotFoundError, LocterLoadError } from 'locter';

try {
    await load('config.json');
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

`LocterError` extends [`BaseError`](https://github.com/Tada5hi/ebec) from `@ebec/core`, so each instance also carries a `code` (auto-derived from the class name unless overridden — e.g. `'ENOENT'` for `LocterNotFoundError`s thrown by the JSON loader) and a `toJSON()` for structured logging.

Each error class also publishes its `Symbol.for(...)` marker (`LOCTER_ERROR_MARKER`, `LOCTER_NOT_FOUND_ERROR_MARKER`, …), which makes `instanceof` work across realms — useful when consumers end up with duplicate copies of locter in their dependency tree.

### Migrating from 3.x

The 4.0 release reworks loader registration and dispatch. The list below is exhaustive — no other public APIs changed.

```diff
  // 1. User rules now override built-ins. Registering an extension a
  //    built-in claims (e.g. `.json`) previously had NO effect — the
  //    built-in rule always matched first. It now takes precedence.
  registerLoader(['.json'], myJson5Loader); // 3.x: silent no-op — 4.x: overrides the built-in

  // 2. Plugin-string loaders are removed. Import the loader yourself and
  //    register it (optionally lazily, via a factory).
- registerLoader({ test: ['.toml'], loader: 'toml' }); // resolved to @locter/toml, sync require()
+ import { TomlLoader } from '@locter/toml';
+ registerLoader(['.toml'], () => new TomlLoader());

  // 3. LoaderManager: findLoader() / resolve() are replaced by find() / builtIn().
- manager.findLoader('file.json');      // Loader | string | undefined
+ manager.find('file.json');            // ILoader | undefined
- manager.resolve('module');            // required an id-to-loader round-trip
+ manager.builtIn('module');            // statically typed as ModuleLoader
```

Additionally:

- The loader port is now exported as the `ILoader` interface (previously an unexported `Loader` type), alongside `Rule` and `LoaderFactory` — so custom loaders can finally be typed against the package: `import type { ILoader } from 'locter'`.
- The extensions handled by the module loader are exported as `MODULE_FILE_EXTENSIONS`.

### Migrating from 2.x

The 3.0 release reshapes a few public surfaces. The list below is exhaustive — no other public APIs changed.

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
  `ModuleLoader` falls back to `require()` under Jest to avoid a known
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

Use `setModuleLoader` to inject an `import` call from user space so Vitest can
rewrite it:

```typescript
// vitest setup file
import { setModuleLoader } from 'locter';

setModuleLoader({
    load: (id) => import(id),
});
```

`setModuleLoader` returns a restore function that re-applies the previous
configuration — useful for scoped overrides:

```typescript
const restore = setModuleLoader({ load: (id) => import(id) });
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
