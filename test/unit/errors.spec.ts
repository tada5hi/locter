/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { markInstanceof } from '@ebec/core';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
    LOCTER_ERROR_MARKER,
    LOCTER_LOAD_ERROR_MARKER,
    LOCTER_NOT_FOUND_ERROR_MARKER,
    LOCTER_UNKNOWN_EXTENSION_ERROR_MARKER,
    LoaderManager,
    LocterError,
    LocterLoadError,
    LocterNotFoundError,
    LocterUnknownExtensionError,
    load,
    loadSync,
    setModuleLoader,
    wrapLoaderError,
} from '../../src';

const basePath = path.join(import.meta.dirname, '..', 'data');

describe('src/errors/**', () => {
    it('should throw LocterUnknownExtensionError when no rule matches', async () => {
        const manager = new LoaderManager();
        const missing = path.join(basePath, 'file.foo');

        await expect(manager.execute(missing)).rejects.toBeInstanceOf(LocterUnknownExtensionError);
        expect(() => manager.executeSync(missing)).toThrow(LocterUnknownExtensionError);

        try {
            await manager.execute(missing);
        } catch (e) {
            expect(e).toBeInstanceOf(LocterError);
            expect((e as LocterUnknownExtensionError).path).toEqual(missing);
            expect((e as LocterUnknownExtensionError).message).toContain('.foo');
        }
    });

    it('should throw LocterNotFoundError when a JSON file is missing', async () => {
        const missing = path.join(basePath, 'does-not-exist.json');

        await expect(load(missing)).rejects.toBeInstanceOf(LocterNotFoundError);
        expect(() => loadSync(missing)).toThrow(LocterNotFoundError);

        try {
            await load(missing);
        } catch (e) {
            expect(e).toBeInstanceOf(LocterError);
            expect((e as LocterNotFoundError).path).toEqual(missing);
            expect((e as LocterNotFoundError).cause).toBeDefined();
        }
    });

    it('should throw LocterLoadError when a JSON file is malformed', async () => {
        const malformed = path.join(basePath, 'malformed.json');

        await expect(load(malformed)).rejects.toBeInstanceOf(LocterLoadError);
        expect(() => loadSync(malformed)).toThrow(LocterLoadError);

        try {
            await load(malformed);
        } catch (e) {
            expect(e).toBeInstanceOf(LocterError);
            expect((e as LocterLoadError).cause).toBeInstanceOf(SyntaxError);
        }
    });

    it('should map known not-found codes via wrapLoaderError', () => {
        for (const code of ['ENOENT', 'MODULE_NOT_FOUND', 'ERR_MODULE_NOT_FOUND']) {
            const cause = Object.assign(new Error('boom'), { code });
            const wrapped = wrapLoaderError(cause, '/some/path');

            expect(wrapped).toBeInstanceOf(LocterNotFoundError);
            expect(wrapped.path).toEqual('/some/path');
            expect(wrapped.cause).toBe(cause);
        }
    });

    it('should map other errors to LocterLoadError', () => {
        const cause = new SyntaxError('bad');
        const wrapped = wrapLoaderError(cause, '/some/path');

        expect(wrapped).toBeInstanceOf(LocterLoadError);
        expect(wrapped.cause).toBe(cause);
    });

    it('should pass LocterError instances through unchanged', () => {
        const original = new LocterLoadError({ message: 'already typed', path: '/x' });
        const wrapped = wrapLoaderError(original, '/y');

        expect(wrapped).toBe(original);
        expect(wrapped.path).toEqual('/x');
    });

    it('should match via @ebec/core marker chain regardless of prototype chain', () => {
        // Simulate an error originating from a different bundle of locter
        // (e.g. duplicate npm install). Its prototype is unrelated to our
        // LocterError class, but it carries the same `@instanceof` markers.
        const alien = Object.create(Error.prototype) as object;
        markInstanceof(alien, LOCTER_ERROR_MARKER);
        markInstanceof(alien, LOCTER_NOT_FOUND_ERROR_MARKER);

        expect(alien instanceof LocterError).toBe(true);
        expect(alien instanceof LocterNotFoundError).toBe(true);
        expect(alien instanceof LocterLoadError).toBe(false);
        expect(alien instanceof LocterUnknownExtensionError).toBe(false);
    });

    it('should accumulate ancestor markers on subclass instances', () => {
        const loadErr = new LocterLoadError('x');
        const unknownExtErr = new LocterUnknownExtensionError('y');

        // Each subclass instance carries its own marker AND the base marker —
        // so a parent-class guard fast-paths a subclass.
        expect(loadErr instanceof LocterError).toBe(true);
        expect(loadErr instanceof LocterLoadError).toBe(true);
        expect(loadErr instanceof LocterNotFoundError).toBe(false);

        expect(unknownExtErr instanceof LocterError).toBe(true);
        expect(unknownExtErr instanceof LocterUnknownExtensionError).toBe(true);
        expect(unknownExtErr instanceof LocterLoadError).toBe(false);

        // Markers are reachable from the call sites that import them
        // (regression: keep them exported for cross-realm consumers).
        expect(LOCTER_LOAD_ERROR_MARKER).toBe(Symbol.for('@locter/load-error'));
        expect(LOCTER_UNKNOWN_EXTENSION_ERROR_MARKER).toBe(Symbol.for('@locter/unknown-extension-error'));
    });

    it('should not fall back to jiti when the module load throws SyntaxError', async () => {
        const syntaxErr = new SyntaxError('bad code');
        const refErr = new ReferenceError('missing');

        const restore = setModuleLoader({
            load: () => { throw syntaxErr; },
            loadSync: () => { throw refErr; },
        });

        try {
            let asyncError: unknown;
            try {
                await load('any-id');
            } catch (e) {
                asyncError = e;
            }
            expect(asyncError).toBeInstanceOf(LocterLoadError);
            expect((asyncError as LocterLoadError).cause).toBe(syntaxErr);
            expect((asyncError as LocterLoadError).path).toEqual('any-id');

            let syncError: unknown;
            try {
                loadSync('any-id');
            } catch (e) {
                syncError = e;
            }
            expect(syncError).toBeInstanceOf(LocterLoadError);
            expect((syncError as LocterLoadError).cause).toBe(refErr);
            expect((syncError as LocterLoadError).path).toEqual('any-id');
        } finally {
            restore();
        }
    });
});
