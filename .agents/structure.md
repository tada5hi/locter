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
│   │   ├── index.ts                # Barrel (re-exports built-in, helpers, module)
│   │   ├── type.ts                 # Loader interface, Rule type
│   │   ├── constants.ts            # LoaderId enum (MODULE | JSON | CONF | YAML)
│   │   ├── singleton.ts            # useLoader() — lazy LoaderManager instance
│   │   ├── module.ts               # LoaderManager class (dispatch, register, resolve)
│   │   ├── helpers.ts              # registerLoader, load, loadSync (operate on the singleton)
│   │   └── built-in/
│   │       ├── module/             # ModuleLoader (jiti-backed JS/TS/ESM/CJS loader)
│   │       │   ├── module.ts
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
│   ├── jest.config.js              # rootDir: '../', SWC transform, coverage thresholds
│   ├── data/                       # Fixture files for loader/locator tests (.json, .yml, .conf, .cjs, .mjs, .cts, .mts)
│   └── unit/                       # Test specs mirroring src/ layout
├── dist/                           # Build output (esm + cjs + d.ts) — git-ignored at source, published to npm
├── rollup.config.mjs               # Rollup config (SWC transform, esm + cjs output)
├── tsconfig.json                   # Extends @tada5hi/tsconfig, emits to dist/
├── tsconfig.eslint.json            # Includes src/ + test/ for lint type-checking
├── commitlint.config.js            # Extends @tada5hi/commitlint-config
├── release-please-config.json      # release-please (alpha prereleases, node release-type)
└── package.json
```

## Module Responsibilities

| Module                          | Purpose                                                                          |
|---------------------------------|----------------------------------------------------------------------------------|
| `src/locator/`                  | Wraps `fast-glob` and returns `{ path, name, extension }` records                |
| `src/loader/module.ts`          | `LoaderManager` — dispatches `execute`/`executeSync` to a loader by extension/regex |
| `src/loader/singleton.ts`       | Lazy global `LoaderManager` shared across `load`, `loadSync`, `registerLoader`   |
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
| `ebec`           | `BaseError` class used to wrap thrown errors with `code`/`message`/`stack`    |

## Package Exports

```json
{
    "./package.json": "./package.json",
    ".": {
        "types": "./dist/index.d.ts",
        "require": "./dist/index.cjs",
        "import": "./dist/index.mjs"
    }
}
```

Everything re-exported from `src/index.ts` is public API. The barrel re-exports `./loader`, `./locator`, and `./utils` — so any symbol exported from a leaf module under those directories is part of the public API. Add new internal-only symbols by keeping them out of the relevant `index.ts` files.

## Separation of Concerns

- **File discovery** → `src/locator/` (globs → `LocatorInfo[]`)
- **File loading / dispatch** → `src/loader/module.ts` + `src/loader/helpers.ts`
- **Per-format parsing** → `src/loader/built-in/<format>/`
- **Pure helpers (no domain knowledge)** → `src/utils/`
- `src/utils/` must not import from `src/locator/` or `src/loader/`. `src/loader/` may import from `src/locator/` (it uses `pathToLocatorInfo`, `buildFilePath`).
