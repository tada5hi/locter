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
    it('should read .json file', async () => {
        const loaderContent = await expectParity(
            () => read('./test/data/file.json'),
            () => readSync('./test/data/file.json'),
        );
        expect(loaderContent).toBeDefined();
        expect(loaderContent.foo).toEqual('bar');
        expect(loaderContent.default).toEqual({ foo: 'bar' });
    });

    it('should wrap data containing an __esModule key', async () => {
        const loaderContent = await expectParity(
            () => read('./test/data/file-es-module.json'),
            () => readSync('./test/data/file-es-module.json'),
        );
        expect(loaderContent.foo).toEqual('bar');
        expect(loaderContent.default).toEqual({ __esModule: true, foo: 'bar' });
    });
});
