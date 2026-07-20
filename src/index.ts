/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * The public API surface — every symbol is exported here BY NAME.
 * Internal helpers stay reachable through the per-directory barrels for
 * source code and tests, but are NOT part of the package contract.
 * Additions and removals are pinned by test/unit/public-api.spec.ts.
 */

// errors
export {
    LOCTER_ERROR_MARKER,
    LOCTER_LOAD_ERROR_MARKER,
    LOCTER_NOT_FOUND_ERROR_MARKER,
    LOCTER_UNKNOWN_EXTENSION_ERROR_MARKER,
    LOCTER_WRITE_ERROR_MARKER,
    LocterError,
    LocterLoadError,
    LocterNotFoundError,
    LocterUnknownExtensionError,
    LocterWriteError,
    wrapLoaderError,
    wrapWriteError,
} from './errors';
export type {
    LocterErrorInput,
    LocterErrorOptions,
} from './errors';

// locator
export {
    buildFilePath,
    isLocatorInfo,
    locate,
    locateMany,
    locateManySync,
    locateSync,
    locateUp,
    locateUpSync,
} from './locator';
export type {
    LocatorInfo,
    LocatorOptions,
    LocatorOptionsInput,
    LocatorUpOptionsInput,
} from './locator';

// format
export {
    ConfReader,
    ConfWriter,
    FormatRegistry,
    JSONReader,
    JSONWriter,
    MODULE_FILE_EXTENSIONS,
    ModuleReader,
    TextFileReader,
    TextFileWriter,
    YAMLReader,
    YAMLWriter,
    getModuleExport,
    isModuleRecord,
    read,
    readPackageField,
    readPackageFieldSync,
    readSync,
    registerFormat,
    setModuleReader,
    unregisterFormat,
    useFormatRegistry,
    write,
    writePackageField,
    writePackageFieldSync,
    writeSync,
} from './format';
export type {
    FormatPreset,
    FormatRegistration,
    FormatRegistryOptions,
    IReader,
    IWriter,
    JSONWriterOptions,
    ModuleExport,
    ModuleExportFilterFn,
    ModuleLoadFn,
    ModuleLoadOptions,
    ModuleLoadSyncFn,
    ModuleReaderOptions,
    ReadPackageFieldOptions,
    ReaderFactory,
    Rule,
    WritePackageFieldOptions,
    WriterFactory,
    YAMLWriterOptions,
} from './format';

// utils
export {
    isJestRuntimeEnvironment,
    isTsNodeRuntimeEnvironment,
    isTsxRuntimeEnvironment,
    isVitestRuntimeEnvironment,
} from './utils';
