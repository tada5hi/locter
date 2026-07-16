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

    it('should register loader', async () => {
        const manager = new LoaderManager();
        manager.register(['.foo'], {
            async execute(input) {
                return input;
            },
            executeSync(input: string) {
                return input;
            },
        });

        const record = await manager.execute('file.foo');
        expect(record.default).toEqual('file.foo');

        const recordSync = manager.executeSync('file.foo');
        expect(recordSync.default).toEqual('file.foo');
    });

    it('should register loader with regexp test', async () => {
        const manager = new LoaderManager();
        manager.register(/\.foo$/, {
            async execute() {
                return { matched: true };
            },
            executeSync() {
                return { matched: true };
            },
        });

        const record = await manager.execute('file.foo');
        expect(record.matched).toBe(true);

        const recordSync = manager.executeSync('file.foo');
        expect(recordSync.matched).toBe(true);
    });

    it('should register loader lazily via factory', async () => {
        let constructed = 0;
        const manager = new LoaderManager();
        manager.register(['.foo'], () => {
            constructed++;
            return {
                async execute(input) {
                    return input;
                },
                executeSync(input: string) {
                    return input;
                },
            };
        });

        expect(constructed).toEqual(0);

        const record = await manager.execute('file.foo');
        expect(record.default).toEqual('file.foo');

        const recordSync = manager.executeSync('file.foo');
        expect(recordSync.default).toEqual('file.foo');

        expect(constructed).toEqual(1);
    });

    it('should override a built-in loader', async () => {
        const manager = new LoaderManager();
        manager.register(['.json'], {
            async execute() {
                return { sentinel: true };
            },
            executeSync() {
                return { sentinel: true };
            },
        });

        const record = await manager.execute('./test/data/file.json');
        expect(record.sentinel).toBe(true);

        const recordSync = manager.executeSync('./test/data/file.json');
        expect(recordSync.sentinel).toBe(true);
    });

    it('should cache built-in loader instances', () => {
        const manager = new LoaderManager();
        expect(manager.builtIn('json')).toBe(manager.builtIn('json'));
    });

    it('should unregister loader by id', async () => {
        const manager = new LoaderManager();
        const registration = manager.register(['.foo'], {
            async execute(input) {
                return input;
            },
            executeSync(input: string) {
                return input;
            },
        });

        expect(manager.has(registration.id)).toBe(true);

        expect(manager.unregister(registration.id)).toBe(true);
        expect(manager.has(registration.id)).toBe(false);
        expect(manager.unregister(registration.id)).toBe(false);

        await expect(manager.execute('file.foo')).rejects.toBeInstanceOf(LocterUnknownExtensionError);
        expect(() => manager.executeSync('file.foo')).toThrow(LocterUnknownExtensionError);
    });

    it('should replace loader registered with an existing id', async () => {
        const manager = new LoaderManager();
        manager.register({
            id: 'custom',
            test: ['.foo'],
            loader: {
                async execute() {
                    return { version: 1 };
                },
                executeSync() {
                    return { version: 1 };
                },
            },
        });
        manager.register({
            id: 'custom',
            test: ['.foo'],
            loader: {
                async execute() {
                    return { version: 2 };
                },
                executeSync() {
                    return { version: 2 };
                },
            },
        });

        const record = await manager.execute('file.foo');
        expect(record.version).toEqual(2);

        const recordSync = manager.executeSync('file.foo');
        expect(recordSync.version).toEqual(2);

        const ids = manager.entries().map((entry) => entry.id);
        expect(ids.filter((id) => id === 'custom')).toHaveLength(1);
    });

    it('should reject rules with a built-in id', () => {
        const manager = new LoaderManager();
        expect(() => manager.register({
            id: 'json',
            test: ['.foo'],
            loader: {
                async execute(input) {
                    return input;
                },
                executeSync(input: string) {
                    return input;
                },
            },
        })).toThrow('reserved');
    });

    it('should list registrations in match order', () => {
        const manager = new LoaderManager();
        manager.register({
            id: 'custom',
            test: ['.foo'],
            loader: {
                async execute(input) {
                    return input;
                },
                executeSync(input: string) {
                    return input;
                },
            },
        });

        const entries = manager.entries();
        expect(entries[0]).toEqual({
            id: 'custom', 
            test: ['.foo'], 
            builtIn: false, 
        });

        const builtIns = entries.filter((entry) => entry.builtIn);
        expect(builtIns.map((entry) => entry.id)).toEqual(['module', 'conf', 'json', 'yaml']);
        expect(manager.has('json')).toBe(true);
    });

    it('should reset to construction state', async () => {
        let constructed = 0;
        const manager = new LoaderManager();
        manager.register(['.foo'], () => {
            constructed++;
            return {
                async execute(input) {
                    return input;
                },
                executeSync(input: string) {
                    return input;
                },
            };
        });

        await manager.execute('file.foo');
        expect(constructed).toEqual(1);

        manager.reset();

        await expect(manager.execute('file.foo')).rejects.toBeInstanceOf(LocterUnknownExtensionError);
        expect(manager.entries().every((entry) => entry.builtIn)).toBe(true);
    });

    it('should use module loader as fallback', () => {
        const manager = new LoaderManager();
        expect(manager.find('foo')).toBe(manager.builtIn('module'));
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

        const restore = setModuleLoader({
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
            restore();
        }

        // verify the singleton is fully restored
        const restored = await load('yaml');
        expect(restored).toBeDefined();
        expect(restored.parse).toBeDefined();
    });
});
