# Project Structure

Locter is a single-package TypeScript library. Source lives in `src/`, tests in `test/`, and build output in `dist/`.

## Directory Layout

```
locter/
├── src/
│   ├── index.ts                    # Public barrel: re-exports errors, format, locator, utils
│   ├── errors/                     # LocterError hierarchy + wrapLoaderError / wrapWriteError
│   ├── locator/                    # Glob-based file lookup
│   │   ├── index.ts                # Barrel (does NOT export core.ts)
│   │   ├── core.ts                 # Shared twin bodies: locateBody, locateManyBody (internal)
│   │   ├── async.ts                # locate, locateMany (runTwinAsync over core bodies)
│   │   ├── sync.ts                 # locateSync, locateManySync (runTwinSync over core bodies)
│   │   ├── up.ts                   # locateUp, locateUpSync (walk-up body delegates to locateBody)
│   │   ├── utils.ts                # buildLocatorOptions, pathToLocatorInfo, buildFilePath, isLocatorInfo
│   │   └── types.ts                # LocatorInfo, LocatorOptions, LocatorOptionsInput
│   ├── format/                     # Pluggable per-format readers + writers
│   │   ├── index.ts                # Barrel (re-exports built-in, helpers, package-field, registry, text-file, type)
│   │   ├── type.ts                 # IReader + IWriter interfaces — the ports every format implements
│   │   ├── text-file/
│   │   │   ├── reader.ts           # abstract TextFileReader — read + parse + error-wrap base for text formats
│   │   │   ├── writer.ts           # abstract TextFileWriter — stringify + mkdir -p + write + error-wrap base
│   │   │   └── index.ts            # Barrel
│   │   ├── registry/               # FormatRegistry + its vocabulary + the process-global singleton
│   │   │   ├── module.ts           # FormatRegistry class (dispatch: read, write, findReader, findWriter, builtInReader, builtInWriter; lifecycle: register, unregister, entries, has, reset)
│   │   │   ├── singleton.ts        # useFormatRegistry() — lazy process-global FormatRegistry instance
│   │   │   ├── type.ts             # Rule, ReaderFactory, WriterFactory, FormatRegistration, FormatPreset
│   │   │   └── index.ts            # Barrel
│   │   ├── helpers.ts              # registerFormat, unregisterFormat, read/readAsModule/write (+Sync), setModuleReader (delegate to the singleton)
│   │   ├── package-field.ts        # readPackageField / writePackageField (+Sync)
│   │   └── built-in/
│   │       ├── registry.ts         # BUILT_IN_PRESETS — single source of truth (id + extensions + reader + writer?); NOT in the barrel
│   │       ├── module/             # ModuleReader (jiti-backed JS/TS/ESM/CJS reader; read-only format)
│   │       │   ├── reader.ts
│   │       │   ├── constants.ts    # MODULE_FILE_EXTENSIONS (shared by registry + jiti config)
│   │       │   ├── utils.ts        # toModuleRecord, createModuleRecord, isModuleRecord, isESModule, getModuleExport
│   │       │   └── type.ts
│   │       ├── json/               # JSONReader (fs + JSON.parse) + JSONWriter (indent: number | string | 'auto')
│   │       │   ├── reader.ts
│   │       │   ├── writer.ts
│   │       │   └── index.ts
│   │       ├── yaml/               # YAMLReader (yaml.parse) + YAMLWriter (comment-preserving Document graft)
│   │       │   ├── reader.ts
│   │       │   ├── writer.ts
│   │       │   └── index.ts
│   │       └── conf/               # ConfReader (key=value, destr + flat) + ConfWriter (rc9-style serialize)
│   │           ├── reader.ts
│   │           ├── writer.ts
│   │           └── index.ts
│   └── utils/                      # Shared helpers (no internal deps)
│       ├── twin.ts                 # sync/async twin protocol: op, runTwinAsync, runTwinSync (internal, NOT in barrel)
│       ├── file-name.ts            # getFileNameExtension, removeFileNameExtension
│       ├── file-path.ts            # isFilePath
│       ├── has-property.ts         # hasOwnProperty, hasStringProperty
│       ├── object.ts               # isObject, isSafeObjectKey
│       ├── runtime.ts              # isJestRuntimeEnvironment, isVitestRuntimeEnvironment, isTsNodeRuntimeEnvironment, isTsxRuntimeEnvironment
│       ├── to-array.ts             # toArray
│       └── typescript.ts           # isTypeScriptError
├── test/
│   ├── vitest.config.ts            # Vitest config; coverage thresholds, include glob
│   ├── data/                       # Fixture files for read/locator tests (.json, .yml, .conf, .cjs, .mjs, .cts, .mts)
│   └── unit/                       # Test specs mirroring src/ layout
├── dist/                           # Build output (index.mjs + index.d.mts) — git-ignored at source, published to npm
├── tsdown.config.ts                # tsdown bundler config (entry, esm format, dts, sourcemap)
├── tsconfig.json                   # Extends @tada5hi/tsconfig (ESNext / bundler / noEmit)
├── eslint.config.js                # Flat ESLint config (@tada5hi/eslint-config)
├── commitlint.config.mjs           # Extends @tada5hi/commitlint-config
├── release-please-config.json      # release-please (beta prerelease versioning, node release-type)
└── package.json
```

## Module Responsibilities

| Module                          | Purpose                                                                          |
|---------------------------------|----------------------------------------------------------------------------------|
| `src/locator/`                  | Wraps `fast-glob` and returns `{ path, name, extension }` records                |
| `src/format/registry/`          | `FormatRegistry` — dispatches `read`/`write` (+Sync): user rules first, then the built-in extension table; owns `Rule`/`FormatRegistration`/`ReaderFactory`/`WriterFactory`/`FormatPreset` |
| `src/format/built-in/registry.ts` | `BUILT_IN_PRESETS` — declarative registry of built-in formats; `BuiltInFormatId` and `WritableBuiltInFormatId` are derived from it |
| `src/format/registry/singleton.ts` | Lazy global `FormatRegistry` shared across `read`, `write`, `registerFormat` |
| `src/format/helpers.ts`         | Thin functional wrappers (`read` = raw, `readAsModule` = module record, `write`, `registerFormat`, …) over the singleton |
| `src/format/built-in/module/`   | TS/JS/ESM/CJS reader powered by `jiti`; returns the raw module value (the registry normalizes); read-only format |
| `src/format/text-file/`         | Abstract `TextFileReader` (UTF-8 read + `parse`) and `TextFileWriter` (`stringify` + mkdir -p + write + trailing newline, opt-in read of the existing target); sync/async derived from one body each |
| `src/format/built-in/json/`     | `JSON.parse` / `JSON.stringify` with configurable indent (incl. `'auto'` detection) |
| `src/format/built-in/yaml/`     | `yaml.parse` / comment-preserving write-back via the yaml Document API           |
| `src/format/built-in/conf/`     | Line-based `key=value` parser (`destr` + `flat.unflatten`) / rc9-style serializer (`flat.flatten`) |
| `src/format/package-field.ts`   | `readPackageField` / `writePackageField` — top-level package.json field access with walk-up support |
| `src/utils/`                    | Stateless helpers — no imports from `locator/` or `format/`                      |

## Key Dependencies

| Dependency       | Role                                                                          |
|------------------|-------------------------------------------------------------------------------|
| `fast-glob`      | Glob matcher backing every `locate*` function                                  |
| `jiti`           | Runtime require/import of `.ts`/`.mts`/`.cts` in CJS or ESM contexts          |
| `yaml`           | YAML parsing (`YAMLReader`) and Document-based grafting (`YAMLWriter`)        |
| `destr`          | Safe `JSON.parse`-like value coercion in `ConfReader`                         |
| `flat`           | Unflattens dot-separated `.conf` keys (`ConfReader`) / flattens them back (`ConfWriter`) |
| `@ebec/core`     | `BaseError` base for the `LocterError` hierarchy (`code`/`message`/`cause`)   |

## Package Exports

```json
{
    "./package.json": "./package.json",
    ".": {
        "types": "./dist/index.d.mts",
        "import": "./dist/index.mjs"
    }
}
```

The package is ESM-only (`"type": "module"`). There is no CJS entry point.

The public API is the curated, NAMED export list in `src/index.ts` — pinned by `test/unit/public-api.spec.ts`. Per-directory barrels remain full (internal convenience for source and tests), but a symbol is only public once it is named in `src/index.ts`; adding one is a deliberate act that must update the snapshot test and the README.

## Separation of Concerns

- **File discovery** → `src/locator/` (globs → `LocatorInfo[]`)
- **Read/write dispatch** → `src/format/registry/` + `src/format/helpers.ts`
- **Per-format parsing/serialization** → `src/format/built-in/<format>/`
- **Pure helpers (no domain knowledge)** → `src/utils/`
- `src/utils/` must not import from `src/locator/` or `src/format/`. `src/format/` may import from `src/locator/` (it uses `pathToLocatorInfo`, `buildFilePath`).
