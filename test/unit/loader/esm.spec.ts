/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { load, loadSync } from '../../../src';
import { expectParity } from '../../helpers/parity';

describe('src/loader/**', () => {
    it('should load .mjs file', async () => {
        const loaderContent = await expectParity(
            () => load('./test/data/file.mjs'),
            () => loadSync('./test/data/file.mjs'),
        );
        expect(loaderContent).toBeDefined();
        expect(loaderContent.foo).toEqual('bar');
        expect(loaderContent.default).toEqual({ foo: 'bar' });
    });

    it('should load .mts file', async () => {
        const loaderContent = await expectParity(
            () => load('./test/data/file.mts'),
            () => loadSync('./test/data/file.mts'),
        );
        expect(loaderContent).toBeDefined();
        expect(loaderContent.bar).toEqual('baz');
        expect(loaderContent.default).toEqual({ bar: 'baz' });
    });

    it('should load .mjs file with default export', async () => {
        const loaderContent = await expectParity(
            () => load('./test/data/file-default.mjs'),
            () => loadSync('./test/data/file-default.mjs'),
        );
        expect(loaderContent.bar).toEqual('baz');
        expect(loaderContent.default).toBeDefined();
        expect(loaderContent.default.foo).toEqual('bar');
    });

    it('should load .mts file with default export', async () => {
        const loaderContent = await expectParity(
            () => load('./test/data/file-default.mts'),
            () => loadSync('./test/data/file-default.mts'),
        );
        expect(loaderContent.foo).toEqual('bar');
        expect(loaderContent.default).toBeDefined();
        expect(loaderContent.default.bar).toEqual('baz');
    });
});
