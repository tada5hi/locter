/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { load, loadSync } from '../../../src';

describe('src/loader/**', () => {
    it('should load .json file', async () => {
        const loaderContent = await load('./test/data/file.json');
        expect(loaderContent).toBeDefined();
        expect(loaderContent.foo).toEqual('bar');
        expect(loaderContent.default).toEqual({ foo: 'bar' });
    });

    it('should load .json file sync', async () => {
        const loaderContent = loadSync('./test/data/file.json');
        expect(loaderContent).toBeDefined();
        expect(loaderContent.foo).toEqual('bar');
        expect(loaderContent.default).toEqual({ foo: 'bar' });
    });

    it('should wrap data containing an __esModule key', async () => {
        const loaderContent = await load('./test/data/file-es-module.json');
        expect(loaderContent.foo).toEqual('bar');
        expect(loaderContent.default).toEqual({ __esModule: true, foo: 'bar' });

        const loaderContentSync = loadSync('./test/data/file-es-module.json');
        expect(loaderContentSync.foo).toEqual('bar');
        expect(loaderContentSync.default).toEqual({ __esModule: true, foo: 'bar' });
    });
});
