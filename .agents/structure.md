# Project Structure

Locter is a single-package TypeScript library. Source lives in `src/`, tests in `test/`, and build output in `dist/`.

## Directory Layout

```
locter/
├── src/
│   ├── index.ts                    # Public barrel: re-exports loader, locator, utils
│   ├── locator/                    # Glob-based file lookup
│   │   ├── index.ts                # Barrel
│   │   ├── async.ts                # locate, locateMany (async, fast-glob)
│   │   ├── sync.ts                 # locateSync, locateManySync (fast-glob sync)
│   │   ├── utils.ts                # buildLocatorOptions, pathToLocatorInfo, buildFilePath, isLocatorInfo
│   │   └── types.ts                # LocatorInfo, LocatorOptions, LocatorOptionsInput
│   ├── loader/                     # Pluggable file/module loaders
│   │   ├── index.ts                # Barrel (re-exports built-in, helpers, package-field, registry, type)
│   │   ├── type.ts                 # ILoader interface — the port every loader implements
│   │   ├── registry/               # LoaderRegistry + its vocabulary + the process-global singleton
│   │   │   ├── module.ts           # LoaderRegistry class (dispatch: load, loadSync, find, builtIn; lifecycle: register, unregister, entries, has, reset)
│   │   │   ├── singleton.ts        # useLoaderRegistry() — lazy process-global LoaderRegistry instance
│   │   │   ├── type.ts             # Rule, LoaderFactory, LoaderRegistration, LoaderPreset
│   │   │   └── index.ts            # Barrel
│   │   ├── helpers.ts              # registerLoader, unregisterLoader, load, loadSync, setModuleLoader (delegate to the singleton)
│   │   ├── package-field.ts        # loadPackageField / loadPackageFieldSync
│   │   └── built-in/
│   │       ├── registry.ts         # BUILT_IN_PRESETS — single source of truth (id + extensions + factory); NOT in the barrel
│   │       ├── module/             # ModuleLoader (jiti-backed JS/TS/ESM/CJS loader)
│   │       │   ├── module.ts
│   │       │   ├── constants.ts    # MODULE_FILE_EXTENSIONS (shared by registry + jiti config)
│   │       │   ├── utils.ts        # toModuleRecord, isESModule, getModuleExport
│   │       │   └── type.ts
│   │       ├── json/module.ts      # JSONLoader (fs + JSON.parse)
│   │       ├── yaml/module.ts      # YAMLLoader (yaml.parse)
│   │       └── conf/module.ts      # ConfLoader (key=value config files, destr + flat)
│   └── utils/                      # Shared helpers (no internal deps)
│       ├── error.ts                # handleException (normalizes thrown values to Error)
│       ├── file-name.ts            # getFileNameExtension, removeFileNameExtension
│       ├── file-path.ts            # isFilePath
│       ├── has-property.ts         # hasOwnProperty, hasStringProperty
│       ├── object.ts               # isObject, isSafeObjectKey
│       ├── runtime.ts              # isJestRuntimeEnvironment, isTsNodeRuntimeEnvironment
│       ├── to-array.ts             # toArray
│       └── typescript.ts           # isTypeScriptError
├── test/
│   ├── vitest.config.ts            # Vitest config; coverage thresholds, include glob
│   ├── data/                       # Fixture files for loader/locator tests (.json, .yml, .conf, .cjs, .mjs, .cts, .mts)
│   └── unit/                       # Test specs mirroring src/ layout
├── dist/                           # Build output (index.mjs + index.d.mts) — git-ignored at source, published to npm
├── tsdown.config.ts                # tsdown bundler config (entry, esm format, dts, sourcemap)
├── tsconfig.json                   # Extends @tada5hi/tsconfig (ESNext / bundler / noEmit)
├── eslint.config.js                # Flat ESLint config (@tada5hi/eslint-config)
├── commitlint.config.mjs           # Extends @tada5hi/commitlint-config
├── release-please-config.json      # release-please (alpha prereleases, node release-type)
└── package.json
```

## Module Responsibilities

| Module                          | Purpose                                                                          |
|---------------------------------|----------------------------------------------------------------------------------|
| `src/locator/`                  | Wraps `fast-glob` and returns `{ path, name, extension }` records                |
| `src/loader/registry/`          | `LoaderRegistry` — dispatches `load`/`loadSync`: user rules first, then the built-in extension table; owns `Rule`/`LoaderRegistration`/`LoaderFactory`/`LoaderPreset` |
| `src/loader/built-in/registry.ts` | `BUILT_IN_PRESETS` — declarative registry of built-in loaders; `BuiltInLoaderId` is derived from its keys |
| `src/loader/registry/singleton.ts` | Lazy global `LoaderRegistry` shared across `load`, `loadSync`, `registerLoader` |
| `src/loader/helpers.ts`         | Thin functional wrappers (`load`, `loadSync`, `registerLoader`) over the singleton |
| `src/loader/built-in/module/`   | TS/JS/ESM/CJS loader powered by `jiti`; normalizes module records via `toModuleRecord` |
| `src/loader/built-in/json/`     | `fs.readFile` + `JSON.parse`                                                     |
| `src/loader/built-in/yaml/`     | `fs.readFile` + `yaml.parse`                                                     |
| `src/loader/built-in/conf/`     | Line-based `key=value` parser, `destr` value coercion, `flat.unflatten` for nesting |
| `src/utils/`                    | Stateless helpers — no imports from `locator/` or `loader/`                      |

## Key Dependencies

| Dependency       | Role                                                                          |
|------------------|-------------------------------------------------------------------------------|
| `fast-glob`      | Glob matcher backing every `locate*` function                                  |
| `jiti`           | Runtime require/import of `.ts`/`.mts`/`.cts` in CJS or ESM contexts          |
| `yaml`           | YAML parsing inside `YAMLLoader`                                              |
| `destr`          | Safe `JSON.parse`-like value coercion in `ConfLoader`                         |
| `flat`           | Unflattens dot-separated `.conf` keys into nested objects                     |
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

Everything re-exported from `src/index.ts` is public API. The barrel re-exports `./loader`, `./locator`, and `./utils` — so any symbol exported from a leaf module under those directories is part of the public API. Add new internal-only symbols by keeping them out of the relevant `index.ts` files.

## Separation of Concerns

- **File discovery** → `src/locator/` (globs → `LocatorInfo[]`)
- **File loading / dispatch** → `src/loader/module.ts` + `src/loader/helpers.ts`
- **Per-format parsing** → `src/loader/built-in/<format>/`
- **Pure helpers (no domain knowledge)** → `src/utils/`
- `src/utils/` must not import from `src/locator/` or `src/loader/`. `src/loader/` may import from `src/locator/` (it uses `pathToLocatorInfo`, `buildFilePath`).
