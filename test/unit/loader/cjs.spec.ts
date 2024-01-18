/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { load, loadSync } from '../../../src';

describe('src/loader/**', () => {
    it('should load .cjs file', async () => {
        const loaderContent = await load('./test/data/file.cjs');
        expect(loaderContent).toBeDefined();
        expect(loaderContent.foo).toEqual('bar');
        expect(loaderContent.default).toEqual({ foo: 'bar' });
    });

    it('should load .cjs file sync', () => {
        const loaderContent = loadSync('./test/data/file.cjs');
        expect(loaderContent).toBeDefined();
        expect(loaderContent.foo).toEqual('bar');
        expect(loaderContent.default).toEqual({ foo: 'bar' });
    });

    it('should load .cts file', async () => {
        const loaderContent = await load('./test/data/file.cts');
        expect(loaderContent).toBeDefined();
        expect(loaderContent.bar).toEqual('baz');
        expect(loaderContent.default).toEqual({ bar: 'baz' });
    });

    it('should load .cts file sync', () => {
        const loaderContent = loadSync('./test/data/file.cts');
        expect(loaderContent).toBeDefined();
        expect(loaderContent.bar).toEqual('baz');
        expect(loaderContent.default).toEqual({ bar: 'baz' });
    });

    it('should load .cjs file with default export', async () => {
        const loaderContent = await load('./test/data/file-default.cjs');
        expect(loaderContent.bar).toEqual('baz');
        expect(loaderContent.default).toBeDefined();
        expect(loaderContent.default.foo).toEqual('bar');
    });

    it('should load .cjs file with default export sync', async () => {
        const loaderContent = loadSync('./test/data/file-default.cjs');
        expect(loaderContent.bar).toEqual('baz');
        expect(loaderContent.default).toBeDefined();
        expect(loaderContent.default.foo).toEqual('bar');
    });

    it('should load .cts file with default export', async () => {
        const loaderContent = await load('./test/data/file-default.cts');
        expect(loaderContent.foo).toEqual('bar');
        expect(loaderContent.default).toBeDefined();
        expect(loaderContent.default.bar).toEqual('baz');
    });

    it('should load .cts file with default export sync', async () => {
        const loaderContent = loadSync('./test/data/file-default.cts');
        expect(loaderContent.foo).toEqual('bar');
        expect(loaderContent.default).toBeDefined();
        expect(loaderContent.default.bar).toEqual('baz');
    });
});
