/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
    isJestRuntimeEnvironment,
    isLocatorInfo,
    isTsxRuntimeEnvironment,
    isVitestRuntimeEnvironment,
    removeFileNameExtension,
} from '../../src';
// internal helper — not part of the public surface (see public-api.spec.ts)
import { pathToLocatorInfo } from '../../src/locator/utils';

describe('src/utils/*.ts', () => {
    it('should remove file name extension', () => {
        let data = removeFileNameExtension('test.js', ['.js', '.ts']);
        expect(data).toEqual('test');

        data = removeFileNameExtension('test.mts', ['.js', '.ts']);
        expect(data).toEqual('test.mts');

        data = removeFileNameExtension('test.js', []);
        expect(data).toEqual('test.js');

        data = removeFileNameExtension('test.js');
        expect(data).toEqual('test');
    });

    it('should detect jest runtime environment', () => {
        // Running under vitest, so this must be false.
        expect(isJestRuntimeEnvironment()).toEqual(false);
    });

    it('should detect vitest runtime environment', () => {
        expect(isVitestRuntimeEnvironment()).toEqual(true);
    });

    it('should detect tsx runtime environment', () => {
        // Running under vitest, so nothing tsx-related is active.
        expect(isTsxRuntimeEnvironment()).toEqual(false);

        const previous = Object.getOwnPropertyDescriptor(process, '_preload_modules');
        const set = (value: string[]) => {
            Object.defineProperty(process, '_preload_modules', {
                configurable: true,
                value,
            });
        };

        try {
            // resolved loader path (node --require .../node_modules/tsx/...)
            set(['/repo/node_modules/tsx/dist/loader.mjs']);
            expect(isTsxRuntimeEnvironment()).toEqual(true);

            // bare specifier and subpath (node --import tsx / tsx/esm)
            set(['tsx']);
            expect(isTsxRuntimeEnvironment()).toEqual(true);
            set(['tsx/esm']);
            expect(isTsxRuntimeEnvironment()).toEqual(true);

            // packages merely containing the substring must NOT match
            set(['/repo/node_modules/tsx-extra/dist/index.mjs', 'not-tsx']);
            expect(isTsxRuntimeEnvironment()).toEqual(false);
        } finally {
            if (previous) {
                Object.defineProperty(process, '_preload_modules', previous);
            } else {
                delete (process as unknown as Record<string, unknown>)._preload_modules;
            }
        }
    });

    it('should detect tsx runtime environment via execArgv', () => {
        const previous = Object.getOwnPropertyDescriptor(process, 'execArgv');

        try {
            Object.defineProperty(process, 'execArgv', {
                configurable: true,
                value: ['--import=tsx'],
            });
            expect(isTsxRuntimeEnvironment()).toEqual(true);

            Object.defineProperty(process, 'execArgv', {
                configurable: true,
                value: ['--import', 'tsx'],
            });
            expect(isTsxRuntimeEnvironment()).toEqual(true);

            Object.defineProperty(process, 'execArgv', {
                configurable: true,
                value: ['--inspect'],
            });
            expect(isTsxRuntimeEnvironment()).toEqual(false);
        } finally {
            if (previous) {
                Object.defineProperty(process, 'execArgv', previous);
            }
        }
    });

    it('should build LocatorInfo for an extensionless path', () => {
        const filePath = path.resolve('/repo/Makefile');
        const info = pathToLocatorInfo(filePath);

        expect(info).toEqual({
            directory: path.resolve('/repo'),
            name: 'Makefile',
            extension: undefined,
            path: filePath,
        });
        expect(isLocatorInfo(info)).toBe(true);
    });

    it('should reject objects with non-string extension', () => {
        expect(isLocatorInfo({
            directory: '/repo',
            name: 'file',
            extension: 123,
            path: '/repo/file',
        })).toBe(false);
    });
});
