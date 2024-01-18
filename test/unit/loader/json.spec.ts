/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { load, loadSync } from '../../../src';

describe('src/loader/**', () => {
    it('should load .json file', async () => {
        const loaderContent = await load('./test/data/file.json');
        expect(loaderContent).toBeDefined();
        expect(loaderContent.foo).toEqual('bar');
    });

    it('should load .json file sync', async () => {
        const loaderContent = loadSync('./test/data/file.json');
        expect(loaderContent).toBeDefined();
        expect(loaderContent.foo).toEqual('bar');
    });
});
