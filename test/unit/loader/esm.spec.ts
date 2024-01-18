/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { load, loadSync } from '../../../src';

describe('src/loader/**', () => {
    it('should load .mjs file', async () => {
        const loaderContent = await load('./test/data/file.mjs');
        expect(loaderContent).toBeDefined();
        expect(loaderContent.foo).toEqual('bar');
        expect(loaderContent.default).toBeUndefined();
    });

    it('should load .mjs file sync', () => {
        const loaderContent = loadSync('./test/data/file.mjs');
        expect(loaderContent).toBeDefined();
        expect(loaderContent.foo).toEqual('bar');
        expect(loaderContent.default).toBeUndefined();
    });

    it('should load .mts file', async () => {
        const loaderContent = await load('./test/data/file.mts');
        expect(loaderContent).toBeDefined();
        expect(loaderContent.bar).toEqual('baz');
        expect(loaderContent.default).toBeUndefined();
    });

    it('should load .mts file sync', () => {
        const loaderContent = loadSync('./test/data/file.mts');
        expect(loaderContent).toBeDefined();
        expect(loaderContent.bar).toEqual('baz');
        expect(loaderContent.default).toBeUndefined();
    });

    it('should load .mjs file with default export', async () => {
        const loaderContent = await load('./test/data/file-default.mjs');
        expect(loaderContent.bar).toEqual('baz');
        expect(loaderContent.default).toBeDefined();
        expect(loaderContent.default.foo).toEqual('bar');
    });

    it('should load .mjs file with default export sync', async () => {
        const loaderContent = loadSync('./test/data/file-default.mjs');
        expect(loaderContent.bar).toEqual('baz');
        expect(loaderContent.default).toBeDefined();
        expect(loaderContent.default.foo).toEqual('bar');
    });

    it('should load .mts file with default export', async () => {
        const loaderContent = await load('./test/data/file-default.mts');
        expect(loaderContent.foo).toEqual('bar');
        expect(loaderContent.default).toBeDefined();
        expect(loaderContent.default.bar).toEqual('baz');
    });

    it('should load .mts file with default export sync', async () => {
        const loaderContent = loadSync('./test/data/file-default.mts');
        expect(loaderContent.foo).toEqual('bar');
        expect(loaderContent.default).toBeDefined();
        expect(loaderContent.default.bar).toEqual('baz');
    });
});
