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
    LocterUnknownExtensionError,
    LocterWriteError,
    isModuleRecord,
    read,
    readAsModule,
    readSync,
    write,
    writeSync,
} from '../../../src';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'locter-write-'));

afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('src/format/** (write)', () => {
    it('should write a .json file with sync/async parity', async () => {
        const value = { foo: 'bar', nested: { n: 1 } };
        const asyncPath = path.join(tmpDir, 'parity-async.json');
        const syncPath = path.join(tmpDir, 'parity-sync.json');

        await write(asyncPath, value);
        writeSync(syncPath, value);

        expect(fs.readFileSync(syncPath, 'utf-8')).toEqual(fs.readFileSync(asyncPath, 'utf-8'));

        expect(await read(asyncPath)).toEqual(value);
        expect(readSync(syncPath)).toEqual(value);
    });

    it('should unwrap records produced by readAsModule() on write-back', async () => {
        const source = path.join(tmpDir, 'roundtrip.json');
        await write(source, { port: 3000 });

        const record = await readAsModule(source);
        expect(isModuleRecord(record)).toBe(true);

        record.default.port = 8080;
        const target = path.join(tmpDir, 'roundtrip-out.json');
        await write(target, record);

        // no default / __esModule wrapper ends up in the file
        const written = JSON.parse(fs.readFileSync(target, 'utf-8'));
        expect(written).toEqual({ port: 8080 });
    });

    it('should round-trip read() values symmetrically', async () => {
        const source = path.join(tmpDir, 'symmetric.yml');
        await write(source, { port: 3000 });

        const value = await read(source);
        value.port = 8080;
        await write(source, value);

        expect(await read(source)).toEqual({ port: 8080 });
    });

    it('should write plain values carrying a literal __esModule key as-is', async () => {
        const target = path.join(tmpDir, 'esmodule-key.json');
        const value = { __esModule: true, foo: 'bar' };
        expect(isModuleRecord(value)).toBe(false);

        await write(target, value);
        expect(JSON.parse(fs.readFileSync(target, 'utf-8'))).toEqual(value);
    });

    it('should create missing parent directories', async () => {
        const target = path.join(tmpDir, 'deep', 'nested', 'dir', 'file.json');
        await write(target, { ok: true });
        expect(JSON.parse(fs.readFileSync(target, 'utf-8'))).toEqual({ ok: true });

        const targetSync = path.join(tmpDir, 'deep-sync', 'nested', 'file.json');
        writeSync(targetSync, { ok: true });
        expect(JSON.parse(fs.readFileSync(targetSync, 'utf-8'))).toEqual({ ok: true });
    });

    it('should throw LocterWriteError for read-only formats', async () => {
        const target = path.join(tmpDir, 'file.ts');
        await expect(write(target, {})).rejects.toBeInstanceOf(LocterWriteError);
        expect(() => writeSync(target, {})).toThrow(LocterWriteError);

        try {
            await write(target, {});
        } catch (e) {
            expect((e as LocterWriteError).message).toContain('read-only');
            expect((e as LocterWriteError).path).toEqual(target);
        }
    });

    it('should throw LocterUnknownExtensionError for unknown extensions', async () => {
        const target = path.join(tmpDir, 'file.foo');
        await expect(write(target, {})).rejects.toBeInstanceOf(LocterUnknownExtensionError);
        expect(() => writeSync(target, {})).toThrow(LocterUnknownExtensionError);
    });

    it('should reject bare module specifiers', async () => {
        await expect(write('yaml', {})).rejects.toBeInstanceOf(LocterWriteError);
        expect(() => writeSync('yaml', {})).toThrow(LocterWriteError);
    });

    it('should not shadow the built-in writer with a reader-only rule', async () => {
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

        const target = path.join(tmpDir, 'reader-only.json');
        await manager.write(target, { a: 1 });
        expect(JSON.parse(fs.readFileSync(target, 'utf-8'))).toEqual({ a: 1 });

        const record = await manager.read(target);
        expect(record.sentinel).toBe(true);
    });

    it('should not shadow the built-in reader with a writer-only rule', async () => {
        const manager = new FormatRegistry();
        const written : unknown[] = [];
        manager.register({
            test: ['.json'],
            writer: {
                async write(_input, value) {
                    written.push(value);
                },
                writeSync(_input, value) {
                    written.push(value);
                },
            },
        });

        const target = path.join(tmpDir, 'writer-only.json');
        await manager.write(target, { a: 1 });
        manager.writeSync(target, { b: 2 });
        expect(written).toEqual([{ a: 1 }, { b: 2 }]);

        // read still routes to the built-in JSON reader
        fs.writeFileSync(target, '{"real": true}');
        const record = await manager.read(target);
        expect(record.real).toBe(true);
    });

    it('should register writer lazily via factory', async () => {
        let constructed = 0;
        const manager = new FormatRegistry();
        manager.register({
            test: ['.custom'],
            writer: () => {
                constructed++;
                return {
                    async write() { /* noop */ },
                    writeSync() { /* noop */ },
                };
            },
        });

        expect(constructed).toEqual(0);

        await manager.write(path.join(tmpDir, 'lazy.custom'), {});
        manager.writeSync(path.join(tmpDir, 'lazy.custom'), {});
        expect(constructed).toEqual(1);
    });

    it('should reject rules with neither reader nor writer', () => {
        const manager = new FormatRegistry();
        expect(() => manager.register({ test: ['.foo'] })).toThrow('at least one');
    });

    it('should cache built-in writer instances and evict them on reset', () => {
        const manager = new FormatRegistry();
        const writer = manager.builtInWriter('json');
        expect(manager.builtInWriter('json')).toBe(writer);

        manager.reset();
        expect(manager.builtInWriter('json')).not.toBe(writer);
    });
});
