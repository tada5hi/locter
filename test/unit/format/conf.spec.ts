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
    read, 
    readSync, 
    write, 
    writeSync,
} from '../../../src';
import { expectParity } from '../../helpers/parity';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'locter-conf-'));

afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('src/format/**', () => {
    it('should read .conf file', async () => {
        const content = await expectParity(
            () => read('./test/data/file.conf'),
            () => readSync('./test/data/file.conf'),
        );
        expect(content).toEqual({ foo: 'bar', bar: { a: 'baz', b: 'boz' } });
    });

    it('should write nested objects as dot-separated key=value lines', async () => {
        const value = { foo: 'bar', bar: { a: 'baz', b: 'boz' } };
        const asyncPath = path.join(tmpDir, 'parity-async.conf');
        const syncPath = path.join(tmpDir, 'parity-sync.conf');

        await write(asyncPath, value);
        writeSync(syncPath, value);

        const content = fs.readFileSync(asyncPath, 'utf-8');
        expect(content).toEqual('foo=bar\nbar.a=baz\nbar.b=boz\n');
        expect(fs.readFileSync(syncPath, 'utf-8')).toEqual(content);
    });

    it('should round-trip structurally (values, nesting, arrays, booleans, numbers)', async () => {
        const value = {
            name: 'app',
            port: 3000,
            debug: true,
            db: { host: 'localhost', ports: [5432, 5433] },
            tags: ['a', 'b'],
        };

        const target = path.join(tmpDir, 'roundtrip.conf');
        await write(target, value);

        const value2 = await read(target);
        expect(value2).toEqual(value);
    });

    it('should write arrays as repeated key[]= lines', async () => {
        const target = path.join(tmpDir, 'arrays.conf');
        await write(target, { db: { ports: [1, 2] } });

        expect(fs.readFileSync(target, 'utf-8')).toEqual('db.ports[]=1\ndb.ports[]=2\n');
    });

    it('should skip undefined values', async () => {
        const target = path.join(tmpDir, 'undefined.conf');
        await write(target, { a: 1, b: undefined });

        expect(fs.readFileSync(target, 'utf-8')).toEqual('a=1\n');
    });

    it('should reject non-object values', async () => {
        const target = path.join(tmpDir, 'non-object.conf');
        await expect(write(target, 42)).rejects.toThrow('must be an object');
        expect(() => writeSync(target, 'text')).toThrow('must be an object');
    });

    it('should not pollute Object.prototype via dotted keys', async () => {
        // isSafeObjectKey only rejects keys EQUAL to __proto__/prototype/
        // constructor; dotted paths reach flat.unflatten — this pins that
        // flat's own guard drops __proto__ segments and that constructor
        // paths land as harmless own keys
        const target = path.join(tmpDir, 'pollution.conf');
        fs.writeFileSync(target, [
            '__proto__.polluted=x',
            'a.__proto__.polluted=y',
            'constructor.prototype.polluted=z',
            'safe=1',
        ].join('\n'));

        const value = await expectParity(
            () => read(target),
            () => readSync(target),
        );

        expect(({} as Record<string, unknown>).polluted).toBeUndefined();
        expect(Object.prototype).not.toHaveProperty('polluted');
        expect(value.safe).toEqual(1);
        expect(value.a).toEqual({});
    });

    it('should pin the documented lossy edge: numeric strings read back as numbers', async () => {
        const target = path.join(tmpDir, 'lossy.conf');
        await write(target, { version: '123' });

        const value = await read(target);
        expect(value.version).toEqual(123);
    });
});
