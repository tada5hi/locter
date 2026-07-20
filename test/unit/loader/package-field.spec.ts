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
    loadPackageField,
    loadPackageFieldSync,
} from '../../../src';
import { expectParity } from '../../helpers/parity';

const pkgBase = path.join(import.meta.dirname, '..', '..', 'data', 'pkg');
const withField = path.join(pkgBase, 'with-field');
const withFieldNested = path.join(withField, 'nested');
const emptyDir = path.join(pkgBase, 'empty');
const malformed = path.join(pkgBase, 'malformed');

describe('src/loader/package-field.ts', () => {
    it('should return a top-level field from the cwd package.json', async () => {
        const result = await expectParity(
            () => loadPackageField<string>('name', { cwd: withField }),
            () => loadPackageFieldSync<string>('name', { cwd: withField }),
        );
        expect(result).toEqual('with-field');
    });

    it('should return a nested object value when the field is an object', async () => {
        const result = await expectParity(
            () => loadPackageField<{ foo: string }>('myapp', { cwd: withField }),
            () => loadPackageFieldSync<{ foo: string }>('myapp', { cwd: withField }),
        );
        expect(result).toEqual({ foo: 'bar' });
    });

    it('should return undefined when the field is absent', async () => {
        const result = await expectParity(
            () => loadPackageField('does-not-exist', { cwd: withField }),
            () => loadPackageFieldSync('does-not-exist', { cwd: withField }),
        );
        expect(result).toBeUndefined();
    });

    it('should not resolve synthetic module-record keys as fields', async () => {
        // `default` / `__esModule` exist on the record load() returns, but
        // not in the raw package.json — they must read as absent fields
        for (const field of ['default', '__esModule']) {
            const result = await expectParity(
                () => loadPackageField(field, { cwd: withField }),
                () => loadPackageFieldSync(field, { cwd: withField }),
            );
            expect(result, field).toBeUndefined();
        }
    });

    it('should return undefined when package.json is absent (no walkUp)', async () => {
        const result = await expectParity(
            () => loadPackageField('name', { cwd: emptyDir }),
            () => loadPackageFieldSync('name', { cwd: emptyDir }),
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
            () => loadPackageField<string>('name', options),
            () => loadPackageFieldSync<string>('name', options),
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
            () => loadPackageField('name', options),
            () => loadPackageFieldSync('name', options),
        );
        expect(result).toBeUndefined();
    });

    it('should throw LocterLoadError when package.json is malformed', async () => {
        let asyncError: unknown;
        try {
            await loadPackageField('name', { cwd: malformed });
        } catch (e) {
            asyncError = e;
        }
        expect(asyncError).toBeInstanceOf(LocterLoadError);

        let syncError: unknown;
        try {
            loadPackageFieldSync('name', { cwd: malformed });
        } catch (e) {
            syncError = e;
        }
        expect(syncError).toBeInstanceOf(LocterLoadError);
    });
});
