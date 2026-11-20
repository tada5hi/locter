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
    LoadError,
    LocterError,
    ModuleReader,
    NotFoundError,
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
});
