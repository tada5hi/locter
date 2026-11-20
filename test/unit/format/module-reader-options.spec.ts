/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
    afterAll,
    describe,
    expect,
    it,
} from 'vitest';
import {
    FormatRegistry,
    LoadError,
    LocterError,
    ModuleReader,
    NotFoundError,
    read,
    setModuleReader,
    useFormatRegistry,
} from '../../../src';
import { expectParity } from '../../helpers/parity';

const dataDir = path.join(import.meta.dirname, '..', '..', 'data');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'locter-module-options-'));

let counter = 0;

/**
 * Every scenario gets its own directory, so module caches of one test
 * never leak into another.
 */
function createScenario() : string {
    counter++;

    const dir = path.join(tmpDir, `scenario-${counter}`);

    fs.mkdirSync(dir);

    return dir;
}

function writeModule(dir: string, name: string, source: string) : string {
    const filePath = path.join(dir, name);

    fs.writeFileSync(filePath, source);

    return filePath;
}

function createEntryWithDependency(value: number) : { entry: string, dir: string } {
    const dir = createScenario();

    writeModule(dir, 'dep.ts', `export const value = ${value};\n`);

    const entry = writeModule(dir, 'entry.ts', 'import { value } from \'./dep.ts\';\nexport default value;\n');

    return { entry, dir };
}

function defaultOf(input: unknown) : unknown {
    return (input as { default: unknown }).default;
}

afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('src/format/built-in/module (options)', () => {
    it('should reject cache: false with the native strategy', () => {
        expect(() => new ModuleReader({ cache: false })).toThrow(LocterError);
        expect(() => new ModuleReader({ strategy: 'native', cache: false })).toThrow(LocterError);
    });

    it('should reject custom loaders with the transpile strategy', () => {
        expect(() => new ModuleReader({
            strategy: 'transpile',
            load: (id) => import(id),
        })).toThrow(LocterError);

        expect(() => new ModuleReader({
            strategy: 'transpile',
            loadSync: () => ({}),
        })).toThrow(LocterError);
    });

    it('should read fresh code, including transitive imports, with cache disabled', async () => {
        const { entry, dir } = createEntryWithDependency(1);
        const reader = new ModuleReader({
            strategy: 'transpile',
            cache: false,
            transpileCache: false,
        });

        const first = await expectParity(
            async () => defaultOf(await reader.read(entry)),
            () => defaultOf(reader.readSync(entry)),
        );

        expect(first).toEqual(1);

        writeModule(dir, 'dep.ts', 'export const value = 2;\n');

        const second = await expectParity(
            async () => defaultOf(await reader.read(entry)),
            () => defaultOf(reader.readSync(entry)),
        );

        expect(second).toEqual(2);
    });

    it('should keep cached modules with cache enabled', async () => {
        const { entry, dir } = createEntryWithDependency(1);
        const reader = new ModuleReader({
            strategy: 'transpile',
            transpileCache: false,
        });

        expect(defaultOf(await reader.read(entry))).toEqual(1);

        writeModule(dir, 'dep.ts', 'export const value = 2;\n');

        expect(defaultOf(await reader.read(entry))).toEqual(1);
    });

    it('should resolve aliased specifiers', async () => {
        const dir = createScenario();
        const target = writeModule(dir, 'target.ts', 'export default \'aliased\';\n');
        const entry = writeModule(dir, 'uses-alias.ts', 'import v from \'locter-test-alias\';\nexport default v;\n');
        const alias = { 'locter-test-alias': target };

        const transpile = new ModuleReader({
            strategy: 'transpile',
            transpileCache: false,
            alias,
        });

        const value = await expectParity(
            async () => defaultOf(await transpile.read(entry)),
            () => defaultOf(transpile.readSync(entry)),
        );

        expect(value).toEqual('aliased');

        // native: Node cannot resolve the alias, the jiti fallback can
        const native = new ModuleReader({ transpileCache: false, alias });

        expect(defaultOf(native.readSync(entry))).toEqual('aliased');
    });

    it('should load node_modules ESM packages as the shared native instance', async () => {
        const reader = new ModuleReader({
            strategy: 'transpile',
            transpileCache: false,
        });

        const result = await reader.read(path.join(dataDir, 'transpile', 'uses-destr.ts')) as { destr: unknown };
        const native = await import('destr');

        expect(result.destr).toBe(native.destr);
    });

    it('should wrap transpile errors without retrying', async () => {
        const reader = new ModuleReader({
            strategy: 'transpile',
            cache: false,
            transpileCache: false,
        });

        const dir = createScenario();
        const missing = path.join(dir, 'missing.ts');

        await expect(reader.read(missing)).rejects.toThrow(NotFoundError);
        expect(() => reader.readSync(missing)).toThrow(NotFoundError);

        const broken = writeModule(dir, 'broken.ts', 'export const = ;\n');

        await expect(reader.read(broken)).rejects.toThrow(LoadError);
        expect(() => reader.readSync(broken)).toThrow(LoadError);
    });

    it('should switch strategy at runtime via configure and restore', async () => {
        const { entry, dir } = createEntryWithDependency(1);
        const reader = new ModuleReader();

        const previous = reader.configure({
            strategy: 'transpile',
            cache: false,
            transpileCache: false,
        });

        expect(previous).toEqual({
            load: undefined,
            loadSync: undefined,
            strategy: undefined,
            cache: undefined,
            transpileCache: undefined,
            alias: undefined,
        });

        expect(defaultOf(await reader.read(entry))).toEqual(1);
        writeModule(dir, 'dep.ts', 'export const value = 2;\n');
        expect(defaultOf(await reader.read(entry))).toEqual(2);

        const current = reader.configure(previous);

        expect(current).toEqual({
            load: undefined,
            loadSync: undefined,
            strategy: 'transpile',
            cache: false,
            transpileCache: false,
            alias: undefined,
        });
    });

    it('should validate the merged configuration', () => {
        const reader = new ModuleReader({ load: (id) => import(id) });

        expect(() => reader.configure({ strategy: 'transpile' })).toThrow(LocterError);
    });

    it('should keep the previous configuration when configure fails', async () => {
        const { entry, dir } = createEntryWithDependency(1);
        const reader = new ModuleReader({
            strategy: 'transpile',
            cache: false,
            transpileCache: false,
        });

        expect(() => reader.configure({ strategy: 'native' })).toThrow(LocterError);

        expect(defaultOf(await reader.read(entry))).toEqual(1);
        writeModule(dir, 'dep.ts', 'export const value = 2;\n');
        expect(defaultOf(await reader.read(entry))).toEqual(2);
    });

    it('should rebuild the transpiling loader when alias changes', async () => {
        const dir = createScenario();
        const a = writeModule(dir, 'a.ts', 'export default \'a\';\n');
        const b = writeModule(dir, 'b.ts', 'export default \'b\';\n');
        const entry = writeModule(dir, 'uses-alias.ts', 'import v from \'locter-test-switch\';\nexport default v;\n');

        const reader = new ModuleReader({
            strategy: 'transpile',
            cache: false,
            transpileCache: false,
            alias: { 'locter-test-switch': a },
        });

        expect(defaultOf(await reader.read(entry))).toEqual('a');

        reader.configure({ alias: { 'locter-test-switch': b } });

        expect(defaultOf(await reader.read(entry))).toEqual('b');
    });

    it('should configure the singleton through setModuleReader and restore it', async () => {
        const { entry, dir } = createEntryWithDependency(1);
        const restore = setModuleReader({
            strategy: 'transpile',
            cache: false,
            transpileCache: false,
        });

        try {
            expect((await read(entry)).default).toEqual(1);
            writeModule(dir, 'dep.ts', 'export const value = 2;\n');
            expect((await read(entry)).default).toEqual(2);
        } finally {
            restore();
        }

        const reader = useFormatRegistry().builtInReader('module');
        const current = reader.configure({});

        expect(current.strategy).toBeUndefined();
        expect(current.cache).toBeUndefined();
    });

    it('should configure the built-in module reader of a scoped registry', async () => {
        const { entry, dir } = createEntryWithDependency(1);
        const registry = new FormatRegistry({
            module: {
                strategy: 'transpile',
                cache: false,
                transpileCache: false,
            },
        });

        expect((await registry.read(entry)).default).toEqual(1);
        writeModule(dir, 'dep.ts', 'export const value = 2;\n');
        expect((await registry.read(entry)).default).toEqual(2);
        expect(registry.readSync(entry).default).toEqual(2);

        // the global registry is unaffected
        const globalReader = useFormatRegistry().builtInReader('module');
        const current = globalReader.configure({});

        expect(current.strategy).toBeUndefined();
    });

    it('should reject an invalid module configuration at construction', () => {
        expect(() => new FormatRegistry({ module: { cache: false } })).toThrow(LocterError);
    });

    it('should read bare specifiers with the transpile strategy', async () => {
        const registry = new FormatRegistry({
            module: {
                strategy: 'transpile',
                cache: false,
                transpileCache: false,
            },
        });

        const result = await registry.read('yaml');

        expect(typeof result.parse).toEqual('function');

        const resultSync = registry.readSync('yaml');

        expect(typeof resultSync.parse).toEqual('function');
    });

    it('should restore construction module options on reset', async () => {
        const { entry, dir } = createEntryWithDependency(1);
        const registry = new FormatRegistry({
            module: {
                strategy: 'transpile',
                cache: false,
                transpileCache: false,
            },
        });

        registry.builtInReader('module').configure({ strategy: 'native', cache: true });
        registry.reset();

        expect((await registry.read(entry)).default).toEqual(1);
        writeModule(dir, 'dep.ts', 'export const value = 2;\n');
        expect((await registry.read(entry)).default).toEqual(2);
    });

    it('should resolve bare specifiers like the native strategy, independent of the working directory', async () => {
        const reader = new ModuleReader({
            strategy: 'transpile',
            cache: false,
            transpileCache: false,
        });

        const cwd = process.cwd();

        // a directory from which the yaml package is not resolvable
        process.chdir(createScenario());

        try {
            const result = await reader.read('yaml') as { parse: unknown };

            expect(typeof result.parse).toEqual('function');

            const resultSync = reader.readSync('yaml') as { parse: unknown };

            expect(typeof resultSync.parse).toEqual('function');
        } finally {
            process.chdir(cwd);
        }
    });

    it('should reject an unknown strategy', () => {
        expect(() => new ModuleReader({ strategy: 'jiti' as never })).toThrow(LocterError);
        expect(() => new ModuleReader().configure({ strategy: 'jiti' as never })).toThrow(LocterError);
    });

    it('should resolve relative file paths against the current working directory on every read', async () => {
        const reader = new ModuleReader({
            strategy: 'transpile',
            cache: false,
            transpileCache: false,
        });

        const a = createScenario();
        const b = createScenario();

        writeModule(a, 'rel.ts', 'export default \'a\';\n');
        writeModule(b, 'rel.ts', 'export default \'b\';\n');

        const cwd = process.cwd();

        try {
            process.chdir(a);
            expect(defaultOf(await reader.read('./rel.ts'))).toEqual('a');

            process.chdir(b);
            expect(defaultOf(await reader.read('./rel.ts'))).toEqual('b');
            expect(defaultOf(reader.readSync('./rel.ts'))).toEqual('b');
        } finally {
            process.chdir(cwd);
        }
    });

    it('should read package subpaths with an extension as packages, not as cwd-relative files', async () => {
        const reader = new ModuleReader({
            strategy: 'transpile',
            cache: false,
            transpileCache: false,
        });

        const cwd = process.cwd();

        // sub-pkg is only resolvable from this directory
        process.chdir(path.join(dataDir, 'transpile'));

        try {
            expect(defaultOf(await reader.read('sub-pkg/feature.js'))).toEqual('feature');
            expect(defaultOf(reader.readSync('sub-pkg/feature.js'))).toEqual('feature');
        } finally {
            process.chdir(cwd);
        }
    });

    it('should apply alias changes only to modules not loaded yet when cache is enabled', async () => {
        // documented boundary: like native imports, a cached module is not
        // re-evaluated when resolution settings change (use cache: false)
        const dir = createScenario();
        const a = writeModule(dir, 'a.ts', 'export default \'a\';\n');
        const b = writeModule(dir, 'b.ts', 'export default \'b\';\n');
        const entry = writeModule(dir, 'uses-alias.ts', 'import v from \'locter-cached-alias\';\nexport default v;\n');
        const other = writeModule(dir, 'other.ts', 'import v from \'locter-cached-alias\';\nexport default v;\n');

        const reader = new ModuleReader({
            strategy: 'transpile',
            transpileCache: false,
            alias: { 'locter-cached-alias': a },
        });

        expect(defaultOf(await reader.read(entry))).toEqual('a');

        reader.configure({ alias: { 'locter-cached-alias': b } });

        expect(defaultOf(await reader.read(entry))).toEqual('a');
        expect(defaultOf(await reader.read(other))).toEqual('b');
    });

    it('should keep plain JavaScript cached natively even with cache disabled', async () => {
        // documented boundary: cache: false reloads TypeScript files; plain
        // JavaScript is loaded by Node itself, whose cache cannot be bypassed
        const dir = createScenario();

        writeModule(dir, 'dep.mjs', 'export const value = 1;\n');

        const entry = writeModule(dir, 'entry.ts', 'import { value } from \'./dep.mjs\';\nexport default value;\n');

        const reader = new ModuleReader({
            strategy: 'transpile',
            cache: false,
            transpileCache: false,
        });

        expect(defaultOf(await reader.read(entry))).toEqual(1);
        writeModule(dir, 'dep.mjs', 'export const value = 2;\n');
        expect(defaultOf(await reader.read(entry))).toEqual(1);
    });
});

