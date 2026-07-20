/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import {
    read, 
    readAsModule, 
    readAsModuleSync, 
    readSync,
} from '../../../src';
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

    it('should readAsModule .mjs file with default export', async () => {
        const record = await expectParity(
            () => readAsModule('./test/data/file-default.mjs'),
            () => readAsModuleSync('./test/data/file-default.mjs'),
        );
        expect(record.bar).toEqual('baz');
        expect(record.default).toBeDefined();
        expect(record.default.foo).toEqual('bar');

        // read() returns the same normalized record for modules
        const value = await expectParity(
            () => read('./test/data/file-default.mjs'),
            () => readSync('./test/data/file-default.mjs'),
        );
        expect(value.default.foo).toEqual('bar');
    });

    it('should readAsModule .mts file with default export', async () => {
        const record = await expectParity(
            () => readAsModule('./test/data/file-default.mts'),
            () => readAsModuleSync('./test/data/file-default.mts'),
        );
        expect(record.foo).toEqual('bar');
        expect(record.default).toBeDefined();
        expect(record.default.bar).toEqual('baz');

        // read() returns the same normalized record for modules
        const value = await expectParity(
            () => read('./test/data/file-default.mts'),
            () => readSync('./test/data/file-default.mts'),
        );
        expect(value.default.bar).toEqual('baz');
    });
});
