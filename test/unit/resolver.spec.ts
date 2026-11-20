/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
    afterAll,
    describe,
    expect,
    it,
} from 'vitest';
import {
    LocterError,
    NotFoundError,
    resolveModule,
    resolveModuleSync,
} from '../../src';
import type { ResolveModuleOptions } from '../../src';
import { expectParity } from '../helpers/parity';

const basePath = path.join(import.meta.dirname, '..', 'data', 'resolver');
const pkgPath = path.join(basePath, 'node_modules', 'fake-pkg');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'locter-resolver-'));

afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
});

function resolveBoth(specifier: string, options?: ResolveModuleOptions) {
    return expectParity(
        () => resolveModule(specifier, options),
        () => resolveModuleSync(specifier, options),
    );
}

async function catchBoth(specifier: string, options?: ResolveModuleOptions) {
    let error : unknown;
    let errorSync : unknown;

    try {
        await resolveModule(specifier, options);
    } catch (e) {
        error = e;
    }

    try {
        resolveModuleSync(specifier, options);
    } catch (e) {
        errorSync = e;
    }

    expect(error).toBeDefined();
    expect(errorSync).toBeDefined();
    expect((errorSync as Error).constructor).toBe((error as Error).constructor);

    return error;
}

describe('src/resolver', () => {
    it('should resolve a package entry with the default conditions', async () => {
        const result = await resolveBoth('fake-pkg', { cwd: basePath });

        expect(result).toEqual(path.join(pkgPath, 'import.js'));
    });

    it('should prepend custom conditions to the defaults', async () => {
        const result = await resolveBoth('fake-pkg', {
            cwd: basePath,
            conditions: ['locter-test'],
        });

        expect(result).toEqual(path.join(pkgPath, 'custom.js'));
    });

    it('should tolerate conditions that duplicate the defaults', async () => {
        const result = await resolveBoth('fake-pkg', {
            cwd: basePath,
            conditions: ['import', 'node'],
        });

        expect(result).toEqual(path.join(pkgPath, 'import.js'));
    });

    it('should resolve a subpath export', async () => {
        const result = await resolveBoth('fake-pkg/sub', { cwd: basePath });

        expect(result).toEqual(path.join(pkgPath, 'sub.js'));
    });

    it('should resolve a relative specifier against cwd', async () => {
        const result = await resolveBoth('./local.js', { cwd: basePath });

        expect(result).toEqual(path.join(basePath, 'local.js'));
    });

    it('should resolve against process.cwd() by default', async () => {
        const result = await resolveBoth('./test/data/resolver/local.js');

        expect(result).toEqual(path.join(process.cwd(), 'test', 'data', 'resolver', 'local.js'));
    });

    it('should resolve against a parentURL given as path or URL', async () => {
        const parentPath = path.join(basePath, 'local.js');
        const expected = path.join(basePath, 'local.js');

        expect(await resolveBoth('./local.js', { parentURL: parentPath })).toEqual(expected);
        expect(await resolveBoth('./local.js', { parentURL: pathToFileURL(parentPath) })).toEqual(expected);
        expect(await resolveBoth('./local.js', { parentURL: pathToFileURL(parentPath).href })).toEqual(expected);
    });

    it('should prefer parentURL over cwd', async () => {
        const result = await resolveBoth('./local.js', {
            cwd: tmpDir,
            parentURL: path.join(basePath, 'local.js'),
        });

        expect(result).toEqual(path.join(basePath, 'local.js'));
    });

    it('should throw NotFoundError for a missing package', async () => {
        const error = await catchBoth('locter-nope-xyz', { cwd: basePath });

        expect(error).toBeInstanceOf(NotFoundError);
        expect((error as NotFoundError).cause).toBeDefined();
    });

    it('should throw NotFoundError for a missing relative file', async () => {
        const error = await catchBoth('./nope.js', { cwd: basePath });

        expect(error).toBeInstanceOf(NotFoundError);
    });

    it('should throw NotFoundError for a non-exported subpath', async () => {
        const error = await catchBoth('fake-pkg/internal.js', { cwd: basePath });

        expect(error).toBeInstanceOf(NotFoundError);
    });

    it('should not fall back to require entries', async () => {
        const error = await catchBoth('require-only', { cwd: basePath });

        expect(error).toBeInstanceOf(NotFoundError);
    });

    it('should resolve require entries when the require condition is given', async () => {
        const result = await resolveBoth('require-only', {
            cwd: basePath,
            conditions: ['require'],
        });

        expect(result).toEqual(path.join(basePath, 'node_modules', 'require-only', 'index.cjs'));
    });

    it('should not probe extensions or directory indexes by default', async () => {
        expect(await catchBoth('./local', { cwd: basePath })).toBeInstanceOf(NotFoundError);
        expect(await catchBoth('./dir', { cwd: basePath })).toBeInstanceOf(NotFoundError);
    });

    it('should probe extensions when opted in', async () => {
        const result = await resolveBoth('./local', {
            cwd: basePath,
            extensions: ['.js'],
        });

        expect(result).toEqual(path.join(basePath, 'local.js'));
    });

    it('should resolve a directory index when opted in', async () => {
        const result = await resolveBoth('./dir', {
            cwd: basePath,
            extensions: ['.js'],
            suffixes: ['', '/index'],
        });

        expect(result).toEqual(path.join(basePath, 'dir', 'index.js'));
    });

    it('should reject builtin modules (no file path)', async () => {
        const error = await catchBoth('node:fs');

        expect(error).toBeInstanceOf(LocterError);
        expect(error).not.toBeInstanceOf(NotFoundError);
    });

    it('should always return the real path of a symlinked package', async () => {
        const linkDir = path.join(tmpDir, 'linked', 'node_modules');

        fs.mkdirSync(linkDir, { recursive: true });
        fs.symlinkSync(pkgPath, path.join(linkDir, 'fake-pkg'), 'dir');

        const cwd = path.join(tmpDir, 'linked');
        const expected = fs.realpathSync(path.join(pkgPath, 'import.js'));

        // The resolver follows symlinks like Node's default resolution.
        expect(await resolveBoth('fake-pkg', { cwd })).toEqual(expected);
    });
});
