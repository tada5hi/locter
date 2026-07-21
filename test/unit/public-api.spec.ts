/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import * as locter from '../../src';

describe('src/index.ts (public API)', () => {
    it('should export exactly the curated public surface', () => {
        // Every runtime value the package publishes. Type-only exports are
        // invisible here — they live in src/index.ts's `export type` blocks.
        // A failing diff means a surface change: make it deliberately, and
        // document it in README.MD (Migration section).
        expect(Object.keys(locter).sort()).toEqual([
            'ConfReader',
            'ConfWriter',
            'FormatRegistry',
            'JSONReader',
            'JSONWriter',
            'LOCTER_ERROR_MARKER',
            'LOCTER_LOAD_ERROR_MARKER',
            'LOCTER_NOT_FOUND_ERROR_MARKER',
            'LOCTER_UNKNOWN_EXTENSION_ERROR_MARKER',
            'LOCTER_WRITE_ERROR_MARKER',
            'LoadError',
            'LocterError',
            'MODULE_FILE_EXTENSIONS',
            'ModuleReader',
            'NotFoundError',
            'TextFileReader',
            'TextFileWriter',
            'TextReader',
            'TextWriter',
            'UnknownExtensionError',
            'WriteError',
            'YAMLReader',
            'YAMLWriter',
            'buildFilePath',
            'deserializeValue',
            'getFileNameExtension',
            'getModuleExport',
            'isJestRuntimeEnvironment',
            'isLocatorInfo',
            'isModuleRecord',
            'isTsNodeRuntimeEnvironment',
            'isTsxRuntimeEnvironment',
            'isVitestRuntimeEnvironment',
            'locate',
            'locateMany',
            'locateManySync',
            'locateSync',
            'locateUp',
            'locateUpSync',
            'read',
            'readAsModule',
            'readAsModuleSync',
            'readPackageField',
            'readPackageFieldSync',
            'readSync',
            'registerFormat',
            'removeFileNameExtension',
            'serializeValue',
            'setModuleReader',
            'unregisterFormat',
            'useFormatRegistry',
            'wrapLoaderError',
            'wrapWriteError',
            'write',
            'writePackageField',
            'writePackageFieldSync',
            'writeSync',
        ]);
    });
});
