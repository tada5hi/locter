/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { read, readSync } from '../../../src';
import { expectParity } from '../../helpers/parity';

describe('src/format/**', () => {
    it('should read .mjs file', async () => {
        const loaderContent = await expectParity(
            () => read('./test/data/file.mjs'),
            () => readSync('./test/data/file.mjs'),
        );
        expect(loaderContent).toBeDefined();
        expect(loaderContent.foo).toEqual('bar');
        expect(loaderContent.default).toEqual({ foo: 'bar' });
    });

    it('should read .mts file', async () => {
        const loaderContent = await expectParity(
            () => read('./test/data/file.mts'),
            () => readSync('./test/data/file.mts'),
        );
        expect(loaderContent).toBeDefined();
        expect(loaderContent.bar).toEqual('baz');
        expect(loaderContent.default).toEqual({ bar: 'baz' });
    });

    it('should read .mjs file with default export', async () => {
        const loaderContent = await expectParity(
            () => read('./test/data/file-default.mjs'),
            () => readSync('./test/data/file-default.mjs'),
        );
        expect(loaderContent.bar).toEqual('baz');
        expect(loaderContent.default).toBeDefined();
        expect(loaderContent.default.foo).toEqual('bar');
    });

    it('should read .mts file with default export', async () => {
        const loaderContent = await expectParity(
            () => read('./test/data/file-default.mts'),
            () => readSync('./test/data/file-default.mts'),
        );
        expect(loaderContent.foo).toEqual('bar');
        expect(loaderContent.default).toBeDefined();
        expect(loaderContent.default.bar).toEqual('baz');
    });
});
