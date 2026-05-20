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
    isVitestRuntimeEnvironment,
    pathToLocatorInfo,
    removeFileNameExtension,
} from '../../src';

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
