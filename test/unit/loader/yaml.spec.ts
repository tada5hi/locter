/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { load, loadSync } from '../../../src';

describe('src/loader/**', () => {
    it('should load .yml file', async () => {
        const loaderContent = await load('./test/data/file.yml');
        expect(loaderContent).toBeDefined();
        expect(loaderContent.YAML).toBeDefined();
        expect(loaderContent.yaml).toBeDefined();
    });

    it('should load .yml file sync', () => {
        const loaderContent = loadSync('./test/data/file.yml');
        expect(loaderContent).toBeDefined();
        expect(loaderContent.YAML).toBeDefined();
        expect(loaderContent.yaml).toBeDefined();
    });
});
