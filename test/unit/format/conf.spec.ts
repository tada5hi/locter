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
    it('should read .conf file', async () => {
        const loaderContent = await expectParity(
            () => read('./test/data/file.conf'),
            () => readSync('./test/data/file.conf'),
        );
        expect(loaderContent).toBeDefined();
        expect(loaderContent.foo).toEqual('bar');
        expect(loaderContent.bar).toBeDefined();
        expect(loaderContent.bar.a).toEqual('baz');
        expect(loaderContent.bar.b).toEqual('boz');
        expect(loaderContent.default).toEqual({ foo: 'bar', bar: { a: 'baz', b: 'boz' } });
    });
});
