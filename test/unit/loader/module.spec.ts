/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import {
    LoaderManager,
    LocterUnknownExtensionError,
    ModuleLoader,
    getModuleExport,
    load,
    loadSync,
    setModuleLoader,
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
        await expect(load('file.foo')).rejects.toBeInstanceOf(LocterUnknownExtensionError);
        expect(() => loadSync('file.foo')).toThrow(LocterUnknownExtensionError);
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

    it('should use injected load / loadSync functions', async () => {
        const calls: { id: string, sync: boolean }[] = [];
        const moduleLoader = new ModuleLoader({
            load: (id) => {
                calls.push({ id, sync: false });
                return { injected: 'async', id };
            },
            loadSync: (id) => {
                calls.push({ id, sync: true });
                return { injected: 'sync', id };
            },
        });

        const asyncResult = await moduleLoader.load('virtual-module-id');
        expect(calls).toEqual([{ id: 'virtual-module-id', sync: false }]);
        expect(asyncResult).toEqual({ injected: 'async', id: 'virtual-module-id' });

        const syncResult = moduleLoader.loadSync('virtual-module-id');
        expect(calls).toEqual([
            { id: 'virtual-module-id', sync: false },
            { id: 'virtual-module-id', sync: true },
        ]);
        expect(syncResult).toEqual({ injected: 'sync', id: 'virtual-module-id' });
    });

    it('should reconfigure module loader at runtime', async () => {
        const moduleLoader = new ModuleLoader();
        let called = false;
        moduleLoader.configure({
            load: (id) => {
                called = true;
                return { id };
            },
        });

        const result = await moduleLoader.load('any-id');
        expect(called).toBe(true);
        expect(result).toEqual({ id: 'any-id' });
    });

    it('should clear configured loader functions via configure({ load: undefined })', async () => {
        const moduleLoader = new ModuleLoader({ load: () => ({ source: 'injected' }) });

        let result = await moduleLoader.load('yaml');
        expect(result).toEqual({ source: 'injected' });

        moduleLoader.configure({ load: undefined });

        result = await moduleLoader.load('yaml');
        expect(result).toBeDefined();
        expect((result as any).parse).toBeDefined();
    });

    it('should override the singleton module loader via setModuleLoader', async () => {
        const seenAsync: string[] = [];
        const seenSync: string[] = [];

        setModuleLoader({
            load: (id) => {
                seenAsync.push(id);
                return {
                    __esModule: true, 
                    from: 'setModuleLoader-async', 
                    id, 
                };
            },
            loadSync: (id) => {
                seenSync.push(id);
                return {
                    __esModule: true, 
                    from: 'setModuleLoader-sync', 
                    id, 
                };
            },
        });

        try {
            const asyncResult = await load('yaml');
            expect(seenAsync).toEqual(['yaml']);
            expect(asyncResult.from).toEqual('setModuleLoader-async');
            expect(asyncResult.id).toEqual('yaml');

            const syncResult = loadSync('yaml');
            expect(seenSync).toEqual(['yaml']);
            expect(syncResult.from).toEqual('setModuleLoader-sync');
            expect(syncResult.id).toEqual('yaml');
        } finally {
            // restore singleton so we don't leak state to later tests in this file
            setModuleLoader({ load: undefined, loadSync: undefined });
        }

        // verify the singleton is fully restored
        const restored = await load('yaml');
        expect(restored).toBeDefined();
        expect(restored.parse).toBeDefined();
    });
});
