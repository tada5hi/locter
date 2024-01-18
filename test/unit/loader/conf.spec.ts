/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { load, loadSync } from '../../../src';

describe('src/loader/**', () => {
    it('should load .conf file', async () => {
        const loaderContent = await load('./test/data/file.conf');
        expect(loaderContent).toBeDefined();
        expect(loaderContent.foo).toEqual('bar');
        expect(loaderContent.bar).toBeDefined();
        expect(loaderContent.bar.a).toEqual('baz');
        expect(loaderContent.bar.b).toEqual('boz');
    });

    it('should load .conf file sync', async () => {
        const loaderContent = loadSync('./test/data/file.conf');
        expect(loaderContent).toBeDefined();
        expect(loaderContent.foo).toEqual('bar');
        expect(loaderContent.bar).toBeDefined();
        expect(loaderContent.bar.a).toEqual('baz');
        expect(loaderContent.bar.b).toEqual('boz');
    });
});
