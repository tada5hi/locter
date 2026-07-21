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
    WriteError, 
    read, 
    readSync, 
    write, 
    writeSync,
} from '../../../src';
import { expectParity } from '../../helpers/parity';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'locter-yaml-'));

afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('src/format/**', () => {
    it('should read .yml file', async () => {
        const content = await expectParity(
            () => read('./test/data/file.yml'),
            () => readSync('./test/data/file.yml'),
        );
        expect(content).toBeDefined();
        expect(content.YAML).toBeDefined();
        expect(content.yaml).toBeDefined();
    });

    it('should keep a literal __esModule key as plain data', async () => {
        const content = await expectParity(
            () => read('./test/data/file-es-module.yml'),
            () => readSync('./test/data/file-es-module.yml'),
        );
        expect(content).toEqual({ __esModule: true, foo: 'bar' });
    });

    it('should write a new .yml file with sync/async parity', async () => {
        const value = { port: 3000, db: { host: 'localhost' } };
        const asyncPath = path.join(tmpDir, 'parity-async.yml');
        const syncPath = path.join(tmpDir, 'parity-sync.yml');

        await write(asyncPath, value);
        writeSync(syncPath, value);

        const content = fs.readFileSync(asyncPath, 'utf-8');
        expect(content).toEqual('port: 3000\ndb:\n  host: localhost\n');
        expect(fs.readFileSync(syncPath, 'utf-8')).toEqual(content);

        expect(await read(asyncPath)).toEqual(value);
    });

    it('should preserve comments of surviving keys on write-back', async () => {
        const target = path.join(tmpDir, 'comments.yml');
        fs.writeFileSync(target, [
            '# port used by the dev server',
            'port: 3000 # trailing note',
            'host: localhost',
            '',
        ].join('\n'));

        await write(target, { port: 8080, host: 'localhost' });

        const content = fs.readFileSync(target, 'utf-8');
        expect(content).toContain('# port used by the dev server');
        expect(content).toContain('port: 8080 # trailing note');
        expect(content).toContain('host: localhost');
    });

    it('should preserve sibling comments when changing nested values', async () => {
        const target = path.join(tmpDir, 'nested.yml');
        fs.writeFileSync(target, [
            'db:',
            '  # keep me',
            '  host: localhost',
            '  port: 5432',
            '',
        ].join('\n'));

        writeSync(target, { db: { host: 'localhost', port: 5433 } });

        const content = fs.readFileSync(target, 'utf-8');
        expect(content).toContain('# keep me');
        expect(content).toContain('host: localhost');
        expect(content).toContain('port: 5433');
    });

    it('should delete keys absent from the new value', async () => {
        const target = path.join(tmpDir, 'delete.yml');
        fs.writeFileSync(target, '# header\nkeep: 1\ndrop: 2\n');

        await write(target, { keep: 1 });

        const content = fs.readFileSync(target, 'utf-8');
        expect(content).toContain('# header');
        expect(content).toContain('keep: 1');
        expect(content).not.toContain('drop');
    });

    it('should add new keys on write-back', async () => {
        const target = path.join(tmpDir, 'add.yml');
        fs.writeFileSync(target, '# header\nport: 3000\n');

        await write(target, { port: 3000, host: 'localhost' });

        const content = fs.readFileSync(target, 'utf-8');
        expect(content).toContain('# header');
        expect(content).toContain('host: localhost');

        expect(await read(target)).toEqual({ port: 3000, host: 'localhost' });
    });

    it('should replace arrays and type-changed nodes wholesale', async () => {
        const target = path.join(tmpDir, 'replace.yml');
        fs.writeFileSync(target, 'tags:\n  - a\n  - b\nvalue:\n  nested: 1\n');

        await write(target, { tags: ['c'], value: 'scalar' });

        expect(await read(target)).toEqual({ tags: ['c'], value: 'scalar' });
    });

    it('should throw instead of overwriting a corrupt existing file', async () => {
        const target = path.join(tmpDir, 'corrupt.yml');
        const corrupt = 'key: [unclosed\n  - broken: {\n';
        fs.writeFileSync(target, corrupt);

        await expect(write(target, { a: 1 })).rejects.toBeInstanceOf(WriteError);
        expect(() => writeSync(target, { a: 1 })).toThrow(WriteError);

        // the corrupt file is untouched
        expect(fs.readFileSync(target, 'utf-8')).toEqual(corrupt);

        try {
            await write(target, { a: 1 });
        } catch (e) {
            expect((e as WriteError).cause).toBeDefined();
            expect((e as WriteError).path).toEqual(target);
        }
    });
});
