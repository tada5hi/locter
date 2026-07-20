/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
    FormatRegistry,
    LocterError,
    LocterUnknownExtensionError,
    ModuleReader,
    getModuleExport,
    read,
    readAsModule,
    readAsModuleSync,
    readSync,
    setModuleReader,
    useFormatRegistry,
} from '../../../src';
import { expectParity } from '../../helpers/parity';

const dataDir = path.join(import.meta.dirname, '..', '..', 'data');

describe('src/format/**', () => {
    it('should normalize every readAsModule result to a module record', async () => {
        const fixtures = [
            'file.json',
            'file.yml',
            'file.conf',
            'file.cjs',
            'file.mjs',
            'file.cts',
            'file.mts',
        ];

        for (const fixture of fixtures) {
            const record = await readAsModule(`./test/data/${fixture}`);
            expect(record.__esModule, fixture).toBe(true);
            expect(record.default, fixture).toBeDefined();

            const recordSync = readAsModuleSync(`./test/data/${fixture}`);
            expect(recordSync.__esModule, fixture).toBe(true);
            expect(recordSync.default, fixture).toBeDefined();
        }
    });

    it('should read raw: plain values for data, module records for modules', async () => {
        // data formats: the plain parsed value (equal to the record's .default)
        const record = await readAsModule('./test/data/file.json');
        const value = await expectParity(
            () => read('./test/data/file.json'),
            () => readSync('./test/data/file.json'),
        );
        expect(value).toEqual({ foo: 'bar' });
        expect(value).toEqual(record.default);

        // modules: the normalized record — NO default-export unwrapping
        const withDefault = await expectParity(
            () => read('./test/data/file-default.mjs'),
            () => readSync('./test/data/file-default.mjs'),
        );
        expect(withDefault.bar).toEqual('baz');
        expect(withDefault.default).toEqual({ foo: 'bar' });

        const withoutDefault = await read('./test/data/file.mjs');
        expect(withoutDefault.foo).toEqual('bar');
    });

    it('should wrap user-reader output even when it carries an __esModule key', async () => {
        const manager = new FormatRegistry();
        manager.register({
            test: ['.foo'],
            reader: {
                async read() {
                    return { __esModule: true, foo: 'bar' };
                },
                readSync() {
                    return { __esModule: true, foo: 'bar' };
                },
            },
        });

        const record = await manager.readAsModule('file.foo');
        expect(record.foo).toEqual('bar');
        expect(record.default).toEqual({ __esModule: true, foo: 'bar' });

        const recordSync = manager.readAsModuleSync('file.foo');
        expect(recordSync.foo).toEqual('bar');
        expect(recordSync.default).toEqual({ __esModule: true, foo: 'bar' });

        // read() hands back the parsed data untouched — a literal
        // __esModule key in DATA never triggers module unwrapping
        const value = await manager.read('file.foo');
        expect(value).toEqual({ __esModule: true, foo: 'bar' });
    });

    it('should filter file', async () => {
        const record = await expectParity(
            () => read('./test/data/file.mts'),
            () => readSync('./test/data/file.mts'),
        );

        const moduleContent = getModuleExport(record, (key) => key === 'bar');
        expect(moduleContent).toBeDefined();
        expect(moduleContent?.key).toEqual('bar');
        expect(moduleContent?.value).toEqual('baz');
    });

    it('should not read file', async () => {
        await expect(read('file.foo')).rejects.toBeInstanceOf(LocterUnknownExtensionError);
        expect(() => readSync('file.foo')).toThrow(LocterUnknownExtensionError);
    });

    it('should readAsModule a bare specifier', async () => {
        const yaml = await readAsModule('yaml');
        expect(yaml).toBeDefined();
        expect(yaml.parse).toBeDefined();
        expect(yaml.default.parse).toBeDefined();
    });

    it('should readAsModule a bare specifier sync', async () => {
        const yaml = readAsModuleSync('yaml');
        expect(yaml).toBeDefined();
        expect(yaml.parse).toBeDefined();
        expect(yaml.default.parse).toBeDefined();
    });

    it('should read a bare specifier as module record', async () => {
        const yaml = await read('yaml');
        expect(yaml.parse).toBeDefined();
        expect(yaml.default.parse).toBeDefined();

        const yamlSync = readSync('yaml');
        expect(yamlSync.parse).toBeDefined();
        expect(yamlSync.default.parse).toBeDefined();
    });

    it('should register reader rule', async () => {
        const manager = new FormatRegistry();
        manager.register({
            test: ['.foo'],
            reader: {
                async read(input) {
                    return input;
                },
                readSync(input: string) {
                    return input;
                },
            },
        });

        const record = await manager.readAsModule('file.foo');
        expect(record.default).toEqual('file.foo');

        // value semantics: the reader output itself
        expect(await manager.read('file.foo')).toEqual('file.foo');
        expect(manager.readSync('file.foo')).toEqual('file.foo');
    });

    it('should register reader rule with regexp test', async () => {
        const manager = new FormatRegistry();
        manager.register({
            test: /\.foo$/,
            reader: {
                async read() {
                    return { matched: true };
                },
                readSync() {
                    return { matched: true };
                },
            },
        });

        const record = await manager.read('file.foo');
        expect(record.matched).toBe(true);

        const recordSync = manager.readSync('file.foo');
        expect(recordSync.matched).toBe(true);
    });

    it('should dispatch a stateful (global) regexp rule consistently', async () => {
        const manager = new FormatRegistry();
        manager.register({
            test: /\.foo$/g,
            reader: {
                async read() {
                    return { matched: true };
                },
                readSync() {
                    return { matched: true };
                },
            },
        });

        // a g-flagged regex mutates lastIndex on test(); repeated identical
        // inputs must not alternate between matching and falling through
        for (let i = 0; i < 3; i++) {
            const record = await manager.read('file.foo');
            expect(record.matched).toBe(true);

            const recordSync = manager.readSync('file.foo');
            expect(recordSync.matched).toBe(true);
        }
    });

    it('should register reader lazily via factory', async () => {
        let constructed = 0;
        const manager = new FormatRegistry();
        manager.register({
            test: ['.foo'],
            reader: () => {
                constructed++;
                return {
                    async read(input) {
                        return input;
                    },
                    readSync(input: string) {
                        return input;
                    },
                };
            },
        });

        expect(constructed).toEqual(0);

        expect(await manager.read('file.foo')).toEqual('file.foo');
        expect(manager.readSync('file.foo')).toEqual('file.foo');

        expect(constructed).toEqual(1);
    });

    it('should override a built-in reader', async () => {
        const manager = new FormatRegistry();
        manager.register({
            test: ['.json'],
            reader: {
                async read() {
                    return { sentinel: true };
                },
                readSync() {
                    return { sentinel: true };
                },
            },
        });

        const record = await manager.read('./test/data/file.json');
        expect(record.sentinel).toBe(true);

        const recordSync = manager.readSync('./test/data/file.json');
        expect(recordSync.sentinel).toBe(true);
    });

    it('should cache built-in reader instances', () => {
        const manager = new FormatRegistry();
        expect(manager.builtInReader('json')).toBe(manager.builtInReader('json'));
    });

    it('should unregister rule by id', async () => {
        const manager = new FormatRegistry();
        const registration = manager.register({
            test: ['.foo'],
            reader: {
                async read(input) {
                    return input;
                },
                readSync(input: string) {
                    return input;
                },
            },
        });

        expect(manager.has(registration.id)).toBe(true);

        expect(manager.unregister(registration.id)).toBe(true);
        expect(manager.has(registration.id)).toBe(false);
        expect(manager.unregister(registration.id)).toBe(false);

        await expect(manager.read('file.foo')).rejects.toBeInstanceOf(LocterUnknownExtensionError);
        expect(() => manager.readSync('file.foo')).toThrow(LocterUnknownExtensionError);
    });

    it('should replace rule registered with an existing id', async () => {
        const manager = new FormatRegistry();
        manager.register({
            id: 'custom',
            test: ['.foo'],
            reader: {
                async read() {
                    return { version: 1 };
                },
                readSync() {
                    return { version: 1 };
                },
            },
        });
        manager.register({
            id: 'custom',
            test: ['.foo'],
            reader: {
                async read() {
                    return { version: 2 };
                },
                readSync() {
                    return { version: 2 };
                },
            },
        });

        const record = await manager.read('file.foo');
        expect(record.version).toEqual(2);

        const recordSync = manager.readSync('file.foo');
        expect(recordSync.version).toEqual(2);

        const ids = manager.entries().map((entry) => entry.id);
        expect(ids.filter((id) => id === 'custom')).toHaveLength(1);
    });

    it('should reject rules with a built-in id', () => {
        const manager = new FormatRegistry();
        expect(() => manager.register({
            id: 'json',
            test: ['.foo'],
            reader: {
                async read(input) {
                    return input;
                },
                readSync(input: string) {
                    return input;
                },
            },
        })).toThrow('reserved');
    });

    it('should list registrations in match order', () => {
        const manager = new FormatRegistry();
        manager.register({
            id: 'custom',
            test: ['.foo'],
            reader: {
                async read(input) {
                    return input;
                },
                readSync(input: string) {
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
        expect(builtIns.map((entry) => entry.id)).toEqual(['module', 'conf', 'json', 'yaml', 'text']);
        expect(manager.has('json')).toBe(true);
    });

    it('should reset to construction state', async () => {
        let constructed = 0;
        const manager = new FormatRegistry();
        manager.register({
            test: ['.foo'],
            reader: () => {
                constructed++;
                return {
                    async read(input) {
                        return input;
                    },
                    readSync(input: string) {
                        return input;
                    },
                };
            },
        });

        await manager.read('file.foo');
        expect(constructed).toEqual(1);

        manager.reset();

        await expect(manager.read('file.foo')).rejects.toBeInstanceOf(LocterUnknownExtensionError);
        expect(manager.entries().every((entry) => entry.builtIn)).toBe(true);
    });

    it('should use module reader as fallback', () => {
        const manager = new FormatRegistry();
        expect(manager.findReader('foo')).toBe(manager.builtInReader('module'));
    });

    it('should use injected load / loadSync functions', async () => {
        const calls: { id: string, sync: boolean }[] = [];
        const moduleReader = new ModuleReader({
            load: (id) => {
                calls.push({ id, sync: false });
                return { injected: 'async', id };
            },
            loadSync: (id) => {
                calls.push({ id, sync: true });
                return { injected: 'sync', id };
            },
        });

        const asyncResult = await moduleReader.load('virtual-module-id');
        expect(calls).toEqual([{ id: 'virtual-module-id', sync: false }]);
        expect(asyncResult).toEqual({ injected: 'async', id: 'virtual-module-id' });

        const syncResult = moduleReader.loadSync('virtual-module-id');
        expect(calls).toEqual([
            { id: 'virtual-module-id', sync: false },
            { id: 'virtual-module-id', sync: true },
        ]);
        expect(syncResult).toEqual({ injected: 'sync', id: 'virtual-module-id' });
    });

    it('should reconfigure module reader at runtime', async () => {
        const moduleReader = new ModuleReader();
        let called = false;
        moduleReader.configure({
            load: (id) => {
                called = true;
                return { id };
            },
        });

        const result = await moduleReader.load('any-id');
        expect(called).toBe(true);
        expect(result).toEqual({ id: 'any-id' });
    });

    it('should clear configured load functions via configure({ load: undefined })', async () => {
        const moduleReader = new ModuleReader({ load: () => ({ source: 'injected' }) });

        let result = await moduleReader.load('yaml');
        expect(result).toEqual({ source: 'injected' });

        moduleReader.configure({ load: undefined });

        result = await moduleReader.load('yaml');
        expect(result).toBeDefined();
        expect((result as any).parse).toBeDefined();
    });

    it('should override the singleton module reader via setModuleReader', async () => {
        const seenAsync: string[] = [];
        const seenSync: string[] = [];

        const restore = setModuleReader({
            load: (id) => {
                seenAsync.push(id);
                return {
                    __esModule: true,
                    from: 'setModuleReader-async',
                    id,
                };
            },
            loadSync: (id) => {
                seenSync.push(id);
                return {
                    __esModule: true,
                    from: 'setModuleReader-sync',
                    id,
                };
            },
        });

        try {
            const asyncResult = await read('yaml');
            expect(seenAsync).toEqual(['yaml']);
            expect(asyncResult.from).toEqual('setModuleReader-async');
            expect(asyncResult.id).toEqual('yaml');

            const syncResult = readSync('yaml');
            expect(seenSync).toEqual(['yaml']);
            expect(syncResult.from).toEqual('setModuleReader-sync');
            expect(syncResult.id).toEqual('yaml');
        } finally {
            // restore singleton so we don't leak state to later tests in this file
            restore();
        }

        // verify the singleton is fully restored
        const restored = await read('yaml');
        expect(restored).toBeDefined();
        expect(restored.parse).toBeDefined();
    });

    it('should scope setModuleReader restore to the configured instance (no-op after reset)', async () => {
        const restore = setModuleReader({
            load: (id) => ({
                __esModule: true,
                from: 'pre-reset',
                id,
            }),
        });

        const configured = await read('yaml');
        expect(configured.from).toEqual('pre-reset');

        // reset() discards the configured module reader instance; a stale
        // restore() must NOT re-apply pre-reset configuration to the fresh one
        useFormatRegistry().reset();
        restore();

        const fresh = await read('yaml');
        expect(fresh.from).toBeUndefined();
        expect(fresh.parse).toBeDefined();
    });

    // The read/readSync fallback paths deliberately diverge (see the
    // note on ModuleReader.read) — each branch is pinned explicitly here.

    it('should fall back to jiti when the primary async load fails recoverably', async () => {
        const moduleReader = new ModuleReader({
            load: () => {
                throw new Error('recoverable');
            },
        });

        const result = await moduleReader.read(path.join(dataDir, 'file.cjs'));
        expect(result.foo).toEqual('bar');
    });

    it('should fall back to jiti when the primary sync load fails recoverably', () => {
        const moduleReader = new ModuleReader({
            loadSync: () => {
                throw new Error('recoverable');
            },
        });

        const result = moduleReader.readSync(path.join(dataDir, 'file.cjs'));
        expect(result.foo).toEqual('bar');
    });

    it('should fall back to loadSync under ts-node when the async load fails recoverably', async () => {
        const tsNodeSymbol = Symbol.for('ts-node.register.instance');
        const proc = process as unknown as Record<symbol, unknown>;
        proc[tsNodeSymbol] = {};

        try {
            const moduleReader = new ModuleReader({
                load: () => {
                    throw new Error('recoverable');
                },
                loadSync: () => ({ from: 'load-sync-fallback' }),
            });

            const result = await moduleReader.read('virtual-module-id');
            expect(result.from).toEqual('load-sync-fallback');
        } finally {
            delete proc[tsNodeSymbol];
        }
    });

    it('should rethrow unrecoverable errors without falling back', async () => {
        // file.cjs IS loadable by jiti — a surfaced error proves no fallback ran
        const asyncReader = new ModuleReader({
            load: () => {
                throw new SyntaxError('broken');
            },
        });

        let asyncError : unknown;
        try {
            await asyncReader.read(path.join(dataDir, 'file.cjs'));
        } catch (e) {
            asyncError = e;
        }
        expect(asyncError).toBeInstanceOf(LocterError);
        expect((asyncError as LocterError).cause).toBeInstanceOf(SyntaxError);

        const syncReader = new ModuleReader({
            loadSync: () => {
                throw new SyntaxError('broken');
            },
        });

        let syncError : unknown;
        try {
            syncReader.readSync(path.join(dataDir, 'file.cjs'));
        } catch (e) {
            syncError = e;
        }
        expect(syncError).toBeInstanceOf(LocterError);
        expect((syncError as LocterError).cause).toBeInstanceOf(SyntaxError);
    });
});
