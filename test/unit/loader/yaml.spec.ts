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
    it('should load .yml file', async () => {
        const loaderContent = await expectParity(
            () => load('./test/data/file.yml'),
            () => loadSync('./test/data/file.yml'),
        );
        expect(loaderContent).toBeDefined();
        expect(loaderContent.YAML).toBeDefined();
        expect(loaderContent.yaml).toBeDefined();
        expect(loaderContent.default).toBeDefined();
        expect(loaderContent.default.YAML).toEqual(loaderContent.YAML);
    });

    it('should wrap data containing an __esModule key', async () => {
        const loaderContent = await expectParity(
            () => load('./test/data/file-es-module.yml'),
            () => loadSync('./test/data/file-es-module.yml'),
        );
        expect(loaderContent.foo).toEqual('bar');
        expect(loaderContent.default).toEqual({ __esModule: true, foo: 'bar' });
    });
});
