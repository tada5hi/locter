/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    LoaderManager,
    getModuleExport,
    load,
    loadSync,
} from '../../../src';
import { LoaderId } from '../../../src/loader/constants';

describe('src/loader/**', () => {
    it('should filter file', async () => {
        let loaderContent = await load('./test/data/file.mts');
        loaderContent = getModuleExport(loaderContent, (key) => key === 'bar');

        expect(loaderContent).toBeDefined();
        expect(loaderContent.key).toEqual('bar');
        expect(loaderContent.value).toEqual('baz');
    });

    it('should filter file sync', () => {
        let loaderContent = loadSync('./test/data/file.mts');
        loaderContent = getModuleExport(loaderContent, (key) => key === 'bar');
        expect(loaderContent).toBeDefined();
        expect(loaderContent.key).toEqual('bar');
        expect(loaderContent.value).toEqual('baz');
    });

    it('should not load file', async () => {
        try {
            await load('file.foo');
            expect(true).toBe(false);
        } catch (e) {
            expect(e).toBeDefined();
        }

        try {
            loadSync('file.foo');
            expect(true).toBe(false);
        } catch (e) {
            expect(e).toBeDefined();
        }
    });

    it('should load module', async () => {
        const yaml = await load('yaml');
        expect(yaml).toBeDefined();
        expect(yaml.parse).toBeDefined();
        expect(yaml.default.parse).toBeDefined();
    });

    it('should load module sync', async () => {
        const yaml = loadSync('yaml');
        expect(yaml).toBeDefined();
        expect(yaml.parse).toBeDefined();
        expect(yaml.default.parse).toBeDefined();
    });

    it('should register loader', () => {
        const manager = new LoaderManager();
        manager.register(['.foo'], {
            async execute(input) {
                return input;
            },
            executeSync(input: string) {
                return input;
            },
        });
    });

    it('should use module loader as fallback', () => {
        const manager = new LoaderManager();
        const loader = manager.findLoader('foo');
        expect(loader).toEqual(LoaderId.MODULE);
    });
});
