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
    LocterError,
    LocterLoadError,
    LocterNotFoundError,
    readPackageField,
    readPackageFieldSync,
    writePackageField,
    writePackageFieldSync,
} from '../../../src';
import { expectParity } from '../../helpers/parity';

const pkgBase = path.join(import.meta.dirname, '..', '..', 'data', 'pkg');
const withField = path.join(pkgBase, 'with-field');
const withFieldNested = path.join(withField, 'nested');
const emptyDir = path.join(pkgBase, 'empty');
const malformed = path.join(pkgBase, 'malformed');

const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'locter-pkg-'));
let tmpCounter = 0;

function makePkgDir(content: string) : string {
    tmpCounter++;
    const dir = path.join(tmpBase, `pkg-${tmpCounter}`);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'package.json'), content);
    return dir;
}

afterAll(() => {
    fs.rmSync(tmpBase, { recursive: true, force: true });
});

describe('src/format/package-field.ts', () => {
    it('should return a top-level field from the cwd package.json', async () => {
        const result = await expectParity(
            () => readPackageField<string>('name', { cwd: withField }),
            () => readPackageFieldSync<string>('name', { cwd: withField }),
        );
        expect(result).toEqual('with-field');
    });

    it('should return a nested object value when the field is an object', async () => {
        const result = await expectParity(
            () => readPackageField<{ foo: string }>('myapp', { cwd: withField }),
            () => readPackageFieldSync<{ foo: string }>('myapp', { cwd: withField }),
        );
        expect(result).toEqual({ foo: 'bar' });
    });

    it('should return undefined when the field is absent', async () => {
        const result = await expectParity(
            () => readPackageField('does-not-exist', { cwd: withField }),
            () => readPackageFieldSync('does-not-exist', { cwd: withField }),
        );
        expect(result).toBeUndefined();
    });

    it('should not resolve synthetic module-record keys as fields', async () => {
        // `default` / `__esModule` exist on the record read() returns, but
        // not in the raw package.json — they must read as absent fields
        for (const field of ['default', '__esModule']) {
            const result = await expectParity(
                () => readPackageField(field, { cwd: withField }),
                () => readPackageFieldSync(field, { cwd: withField }),
            );
            expect(result, field).toBeUndefined();
        }
    });

    it('should return undefined when package.json is absent (no walkUp)', async () => {
        const result = await expectParity(
            () => readPackageField('name', { cwd: emptyDir }),
            () => readPackageFieldSync('name', { cwd: emptyDir }),
        );
        expect(result).toBeUndefined();
    });

    it('should walk up to find a package.json when `walkUp: true`', async () => {
        const options = {
            cwd: withFieldNested,
            walkUp: true,
            stopAt: withField,
        };

        const result = await expectParity(
            () => readPackageField<string>('name', options),
            () => readPackageFieldSync<string>('name', options),
        );
        expect(result).toEqual('with-field');
    });

    it('should return undefined when walkUp finds no package.json before `stopAt`', async () => {
        const options = {
            cwd: withFieldNested,
            walkUp: true,
            stopAt: withFieldNested,
        };

        const result = await expectParity(
            () => readPackageField('name', options),
            () => readPackageFieldSync('name', options),
        );
        expect(result).toBeUndefined();
    });

    it('should throw LocterLoadError when package.json is malformed', async () => {
        let asyncError: unknown;
        try {
            await readPackageField('name', { cwd: malformed });
        } catch (e) {
            asyncError = e;
        }
        expect(asyncError).toBeInstanceOf(LocterLoadError);

        let syncError: unknown;
        try {
            readPackageFieldSync('name', { cwd: malformed });
        } catch (e) {
            syncError = e;
        }
        expect(syncError).toBeInstanceOf(LocterLoadError);
    });

    it('should write a field preserving the existing indentation', async () => {
        const content = '{\n  "name": "app",\n  "version": "1.0.0"\n}\n';
        const asyncDir = makePkgDir(content);
        const syncDir = makePkgDir(content);

        await writePackageField('myapp', { entry: 'src' }, { cwd: asyncDir });
        writePackageFieldSync('myapp', { entry: 'src' }, { cwd: syncDir });

        const written = fs.readFileSync(path.join(asyncDir, 'package.json'), 'utf-8');
        expect(written).toEqual([
            '{',
            '  "name": "app",',
            '  "version": "1.0.0",',
            '  "myapp": {',
            '    "entry": "src"',
            '  }',
            '}',
            '',
        ].join('\n'));
        expect(fs.readFileSync(path.join(syncDir, 'package.json'), 'utf-8')).toEqual(written);

        const value = await expectParity(
            () => readPackageField('myapp', { cwd: asyncDir }),
            () => readPackageFieldSync('myapp', { cwd: syncDir }),
        );
        expect(value).toEqual({ entry: 'src' });
    });

    it('should replace an existing field', async () => {
        const dir = makePkgDir('{\n  "name": "app",\n  "myapp": {"old": true}\n}\n');

        await writePackageField('myapp', { fresh: true }, { cwd: dir });

        expect(await readPackageField('myapp', { cwd: dir })).toEqual({ fresh: true });
    });

    it('should remove a field when the value is undefined', async () => {
        const dir = makePkgDir('{\n  "name": "app",\n  "myapp": {"old": true}\n}\n');

        await writePackageField('myapp', undefined, { cwd: dir });

        const written = fs.readFileSync(path.join(dir, 'package.json'), 'utf-8');
        expect(written).not.toContain('myapp');
        expect(await readPackageField('myapp', { cwd: dir })).toBeUndefined();
    });

    it('should walk up to the nearest package.json when `walkUp: true`', async () => {
        const dir = makePkgDir('{\n  "name": "app"\n}\n');
        const nested = path.join(dir, 'deeply', 'nested');
        fs.mkdirSync(nested, { recursive: true });

        await writePackageField('myapp', 'from-nested', { cwd: nested, walkUp: true });

        expect(await readPackageField('myapp', { cwd: dir })).toEqual('from-nested');
    });

    it('should throw LocterNotFoundError when no package.json can be located', async () => {
        await expect(writePackageField('myapp', 1, { cwd: emptyDir }))
            .rejects.toBeInstanceOf(LocterNotFoundError);
        expect(() => writePackageFieldSync('myapp', 1, { cwd: emptyDir }))
            .toThrow(LocterNotFoundError);
    });

    it('should reject unsafe field names', async () => {
        const dir = makePkgDir('{\n  "name": "app"\n}\n');

        await expect(writePackageField('__proto__', 1, { cwd: dir }))
            .rejects.toBeInstanceOf(LocterError);
        expect(() => writePackageFieldSync('constructor', 1, { cwd: dir }))
            .toThrow('not a safe object key');
    });

    it('should propagate LocterLoadError for a malformed package.json on write', async () => {
        const dir = makePkgDir('{ not json');

        await expect(writePackageField('myapp', 1, { cwd: dir }))
            .rejects.toBeInstanceOf(LocterLoadError);
        expect(() => writePackageFieldSync('myapp', 1, { cwd: dir }))
            .toThrow(LocterLoadError);
    });
});
