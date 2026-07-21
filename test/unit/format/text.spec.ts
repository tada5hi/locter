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
    read, 
    readAsModule, 
    readSync, 
    write, 
    writeSync,
} from '../../../src';
import { expectParity } from '../../helpers/parity';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'locter-text-'));

afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('src/format/**', () => {
    it('should read .txt file as raw string', async () => {
        const content = await expectParity(
            () => read('./test/data/file.txt'),
            () => readSync('./test/data/file.txt'),
        );
        expect(content).toEqual('hello\nworld\n');
    });

    it('should not coerce numeric text content', async () => {
        const target = path.join(tmpDir, 'count.txt');
        fs.writeFileSync(target, '123\n');

        expect(await read(target)).toEqual('123\n');
    });

    it('should readAsModule .txt file as module record', async () => {
        const record = await readAsModule('./test/data/file.txt');
        expect(record.default).toEqual('hello\nworld\n');
    });

    it('should write strings with sync/async parity and a trailing newline', async () => {
        const asyncPath = path.join(tmpDir, 'parity-async.txt');
        const syncPath = path.join(tmpDir, 'parity-sync.txt');

        await write(asyncPath, 'hello');
        writeSync(syncPath, 'hello');

        const content = fs.readFileSync(asyncPath, 'utf-8');
        expect(content).toEqual('hello\n');
        expect(fs.readFileSync(syncPath, 'utf-8')).toEqual(content);

        // idempotent from the first write on
        await write(asyncPath, await read(asyncPath));
        expect(fs.readFileSync(asyncPath, 'utf-8')).toEqual('hello\n');
    });

    it('should reject non-string values', async () => {
        const target = path.join(tmpDir, 'non-string.txt');
        await expect(write(target, { a: 1 })).rejects.toThrow('must be a string');
        expect(() => writeSync(target, 42)).toThrow('must be a string');
    });
});
