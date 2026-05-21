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

const pkgBase = path.join(import.meta.dirname, '..', '..', 'data', 'pkg');
const withField = path.join(pkgBase, 'with-field');
const withFieldNested = path.join(withField, 'nested');
const emptyDir = path.join(pkgBase, 'empty');
const malformed = path.join(pkgBase, 'malformed');

describe('src/loader/package-field.ts', () => {
    it('should return a top-level field from the cwd package.json', async () => {
        const asyncResult = await loadPackageField<string>('name', { cwd: withField });
        expect(asyncResult).toEqual('with-field');

        const syncResult = loadPackageFieldSync<string>('name', { cwd: withField });
        expect(syncResult).toEqual('with-field');
    });

    it('should return a nested object value when the field is an object', async () => {
        const asyncResult = await loadPackageField<{ foo: string }>('myapp', { cwd: withField });
        expect(asyncResult).toEqual({ foo: 'bar' });

        const syncResult = loadPackageFieldSync<{ foo: string }>('myapp', { cwd: withField });
        expect(syncResult).toEqual({ foo: 'bar' });
    });

    it('should return undefined when the field is absent', async () => {
        const asyncResult = await loadPackageField('does-not-exist', { cwd: withField });
        expect(asyncResult).toBeUndefined();

        const syncResult = loadPackageFieldSync('does-not-exist', { cwd: withField });
        expect(syncResult).toBeUndefined();
    });

    it('should return undefined when package.json is absent (no walkUp)', async () => {
        const asyncResult = await loadPackageField('name', { cwd: emptyDir });
        expect(asyncResult).toBeUndefined();

        const syncResult = loadPackageFieldSync('name', { cwd: emptyDir });
        expect(syncResult).toBeUndefined();
    });

    it('should walk up to find a package.json when `walkUp: true`', async () => {
        const asyncResult = await loadPackageField<string>('name', {
            cwd: withFieldNested,
            walkUp: true,
            stopAt: withField,
        });
        expect(asyncResult).toEqual('with-field');

        const syncResult = loadPackageFieldSync<string>('name', {
            cwd: withFieldNested,
            walkUp: true,
            stopAt: withField,
        });
        expect(syncResult).toEqual('with-field');
    });

    it('should return undefined when walkUp finds no package.json before `stopAt`', async () => {
        const asyncResult = await loadPackageField('name', {
            cwd: withFieldNested,
            walkUp: true,
            stopAt: withFieldNested,
        });
        expect(asyncResult).toBeUndefined();

        const syncResult = loadPackageFieldSync('name', {
            cwd: withFieldNested,
            walkUp: true,
            stopAt: withFieldNested,
        });
        expect(syncResult).toBeUndefined();
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
