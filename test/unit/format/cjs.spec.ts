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
    it('should read .cjs file', async () => {
        const loaderContent = await expectParity(
            () => read('./test/data/file.cjs'),
            () => readSync('./test/data/file.cjs'),
        );
        expect(loaderContent).toBeDefined();
        expect(loaderContent.foo).toEqual('bar');
        expect(loaderContent.default).toEqual({ foo: 'bar' });
    });

    it('should read .cts file', async () => {
        const loaderContent = await expectParity(
            () => read('./test/data/file.cts'),
            () => readSync('./test/data/file.cts'),
        );
        expect(loaderContent).toBeDefined();
        expect(loaderContent.bar).toEqual('baz');
        expect(loaderContent.default).toEqual({ bar: 'baz' });
    });

    it('should readAsModule .cjs file with default export', async () => {
        const record = await expectParity(
            () => readAsModule('./test/data/file-default.cjs'),
            () => readAsModuleSync('./test/data/file-default.cjs'),
        );
        expect(record.bar).toEqual('baz');
        expect(record.default).toBeDefined();
        expect(record.default.foo).toEqual('bar');

        // read() returns the same normalized record for modules
        const value = await expectParity(
            () => read('./test/data/file-default.cjs'),
            () => readSync('./test/data/file-default.cjs'),
        );
        expect(value.default.foo).toEqual('bar');
    });

    it('should readAsModule .cts file with default export', async () => {
        const record = await expectParity(
            () => readAsModule('./test/data/file-default.cts'),
            () => readAsModuleSync('./test/data/file-default.cts'),
        );
        expect(record.foo).toEqual('bar');
        expect(record.default).toBeDefined();
        expect(record.default.bar).toEqual('baz');

        // read() returns the same normalized record for modules
        const value = await expectParity(
            () => read('./test/data/file-default.cts'),
            () => readSync('./test/data/file-default.cts'),
        );
        expect(value.default.bar).toEqual('baz');
    });
});
