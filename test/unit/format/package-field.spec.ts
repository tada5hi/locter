/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
    LocterLoadError,
    readPackageField,
    readPackageFieldSync,
} from '../../../src';
import { expectParity } from '../../helpers/parity';

const pkgBase = path.join(import.meta.dirname, '..', '..', 'data', 'pkg');
const withField = path.join(pkgBase, 'with-field');
const withFieldNested = path.join(withField, 'nested');
const emptyDir = path.join(pkgBase, 'empty');
const malformed = path.join(pkgBase, 'malformed');

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
});
