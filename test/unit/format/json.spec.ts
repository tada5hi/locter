/*
 * Copyright (c) 2024.
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
    JSONWriter, 
    read, 
    readSync, 
    write, 
    writeSync,
} from '../../../src';
import { expectParity } from '../../helpers/parity';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'locter-json-'));

afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('src/format/**', () => {
    it('should read .json file', async () => {
        const content = await expectParity(
            () => read('./test/data/file.json'),
            () => readSync('./test/data/file.json'),
        );
        expect(content).toBeDefined();
        expect(content.foo).toEqual('bar');
        expect(content.default).toEqual({ foo: 'bar' });
    });

    it('should wrap data containing an __esModule key', async () => {
        const content = await expectParity(
            () => read('./test/data/file-es-module.json'),
            () => readSync('./test/data/file-es-module.json'),
        );
        expect(content.foo).toEqual('bar');
        expect(content.default).toEqual({ __esModule: true, foo: 'bar' });
    });

    it('should write with 4-space indent and a trailing newline by default', async () => {
        const target = path.join(tmpDir, 'default-indent.json');
        await write(target, { a: { b: 1 } });

        const content = fs.readFileSync(target, 'utf-8');
        expect(content.endsWith('}\n')).toBe(true);
        expect(content).toContain('\n    "a": {');
        expect(content).toContain('\n        "b": 1');
    });

    it('should respect a configured indent', async () => {
        const writer = new JSONWriter({ indent: 2 });

        const asyncPath = path.join(tmpDir, 'indent-2-async.json');
        const syncPath = path.join(tmpDir, 'indent-2-sync.json');
        await writer.write(asyncPath, { a: { b: 1 } });
        writer.writeSync(syncPath, { a: { b: 1 } });

        const content = fs.readFileSync(asyncPath, 'utf-8');
        expect(content).toContain('\n  "a": {');
        expect(fs.readFileSync(syncPath, 'utf-8')).toEqual(content);
    });

    it('should keep the indentation of the existing file with indent auto', async () => {
        const writer = new JSONWriter({ indent: 'auto' });

        const spaced = path.join(tmpDir, 'auto-spaced.json');
        fs.writeFileSync(spaced, '{\n  "a": 1\n}\n');
        await writer.write(spaced, { a: 2 });
        expect(fs.readFileSync(spaced, 'utf-8')).toEqual('{\n  "a": 2\n}\n');

        const tabbed = path.join(tmpDir, 'auto-tabbed.json');
        fs.writeFileSync(tabbed, '{\n\t"a": 1\n}\n');
        writer.writeSync(tabbed, { a: 2 });
        expect(fs.readFileSync(tabbed, 'utf-8')).toEqual('{\n\t"a": 2\n}\n');
    });

    it('should fall back to 4-space indent with indent auto on new files', async () => {
        const writer = new JSONWriter({ indent: 'auto' });

        const target = path.join(tmpDir, 'auto-new.json');
        await writer.write(target, { a: 1 });
        expect(fs.readFileSync(target, 'utf-8')).toEqual('{\n    "a": 1\n}\n');
    });

    it('should throw for values JSON cannot serialize', async () => {
        const target = path.join(tmpDir, 'unserializable.json');
        await expect(write(target, undefined)).rejects.toThrow('not JSON-serializable');
        expect(() => writeSync(target, () => {})).toThrow('not JSON-serializable');
    });
});
