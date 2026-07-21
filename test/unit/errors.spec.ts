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
    FormatRegistry,
    LOCTER_ERROR_MARKER,
    LOCTER_LOAD_ERROR_MARKER,
    LOCTER_NOT_FOUND_ERROR_MARKER,
    LOCTER_UNKNOWN_EXTENSION_ERROR_MARKER,
    LoadError,
    LocterError,
    NotFoundError,
    UnknownExtensionError,
    WriteError,
    read,
    readSync,
    setModuleReader,
    wrapLoaderError,
    wrapWriteError,
} from '../../src';

const basePath = path.join(import.meta.dirname, '..', 'data');

describe('src/errors/**', () => {
    it('should throw UnknownExtensionError when no rule matches', async () => {
        const manager = new FormatRegistry();
        const missing = path.join(basePath, 'file.foo');

        await expect(manager.read(missing)).rejects.toBeInstanceOf(UnknownExtensionError);
        expect(() => manager.readSync(missing)).toThrow(UnknownExtensionError);

        try {
            await manager.read(missing);
        } catch (e) {
            expect(e).toBeInstanceOf(LocterError);
            expect((e as UnknownExtensionError).path).toEqual(missing);
            expect((e as UnknownExtensionError).message).toContain('.foo');
        }
    });

    it('should throw NotFoundError when a JSON file is missing', async () => {
        const missing = path.join(basePath, 'does-not-exist.json');

        await expect(read(missing)).rejects.toBeInstanceOf(NotFoundError);
        expect(() => readSync(missing)).toThrow(NotFoundError);

        try {
            await read(missing);
        } catch (e) {
            expect(e).toBeInstanceOf(LocterError);
            expect((e as NotFoundError).path).toEqual(missing);
            expect((e as NotFoundError).cause).toBeDefined();
        }
    });

    it('should throw LoadError when a JSON file is malformed', async () => {
        const malformed = path.join(basePath, 'malformed.json');

        await expect(read(malformed)).rejects.toBeInstanceOf(LoadError);
        expect(() => readSync(malformed)).toThrow(LoadError);

        try {
            await read(malformed);
        } catch (e) {
            expect(e).toBeInstanceOf(LocterError);
            expect((e as LoadError).cause).toBeInstanceOf(SyntaxError);
        }
    });

    it('should map known not-found codes via wrapLoaderError', () => {
        for (const code of ['ENOENT', 'MODULE_NOT_FOUND', 'ERR_MODULE_NOT_FOUND']) {
            const cause = Object.assign(new Error('boom'), { code });
            const wrapped = wrapLoaderError(cause, '/some/path');

            expect(wrapped).toBeInstanceOf(NotFoundError);
            expect(wrapped.path).toEqual('/some/path');
            expect(wrapped.cause).toBe(cause);
        }
    });

    it('should map other errors to LoadError', () => {
        const cause = new SyntaxError('bad');
        const wrapped = wrapLoaderError(cause, '/some/path');

        expect(wrapped).toBeInstanceOf(LoadError);
        expect(wrapped.cause).toBe(cause);
    });

    it('should pass LocterError instances through unchanged', () => {
        const original = new LoadError({ message: 'already typed', path: '/x' });
        const wrapped = wrapLoaderError(original, '/y');

        expect(wrapped).toBe(original);
        expect(wrapped.path).toEqual('/x');
    });

    it('should map write-side errors to WriteError', () => {
        const cause = Object.assign(new Error('denied'), { code: 'EACCES' });
        const wrapped = wrapWriteError(cause, '/some/path');

        expect(wrapped).toBeInstanceOf(WriteError);
        expect(wrapped).toBeInstanceOf(LocterError);
        expect(wrapped).not.toBeInstanceOf(LoadError);
        expect(wrapped.code).toEqual('EACCES');
        expect(wrapped.path).toEqual('/some/path');
        expect(wrapped.cause).toBe(cause);
    });

    it('should keep not-found codes as WriteError on the write side', () => {
        // ENOENT while writing (missing parent directory) is a write
        // failure, not a not-found lookup — no NotFoundError mapping.
        const cause = Object.assign(new Error('missing dir'), { code: 'ENOENT' });
        const wrapped = wrapWriteError(cause, '/missing/dir/file.json');

        expect(wrapped).toBeInstanceOf(WriteError);
        expect(wrapped).not.toBeInstanceOf(NotFoundError);
    });

    it('should normalize non-error throws via wrapWriteError', () => {
        const wrapped = wrapWriteError('boom', '/some/path');

        expect(wrapped).toBeInstanceOf(WriteError);
        expect(wrapped.message).toEqual('Failed to write: /some/path');
        expect(wrapped.cause).toEqual('boom');
    });

    it('should pass LocterError instances through wrapWriteError unchanged', () => {
        const original = new WriteError({ message: 'already typed', path: '/x' });
        const wrapped = wrapWriteError(original, '/y');

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
        expect(alien instanceof NotFoundError).toBe(true);
        expect(alien instanceof LoadError).toBe(false);
        expect(alien instanceof UnknownExtensionError).toBe(false);
    });

    it('should accumulate ancestor markers on subclass instances', () => {
        const loadErr = new LoadError('x');
        const unknownExtErr = new UnknownExtensionError('y');

        // Each subclass instance carries its own marker AND the base marker —
        // so a parent-class guard fast-paths a subclass.
        expect(loadErr instanceof LocterError).toBe(true);
        expect(loadErr instanceof LoadError).toBe(true);
        expect(loadErr instanceof NotFoundError).toBe(false);

        expect(unknownExtErr instanceof LocterError).toBe(true);
        expect(unknownExtErr instanceof UnknownExtensionError).toBe(true);
        expect(unknownExtErr instanceof LoadError).toBe(false);

        // Markers are reachable from the call sites that import them
        // (regression: keep them exported for cross-realm consumers).
        expect(LOCTER_LOAD_ERROR_MARKER).toBe(Symbol.for('@locter/load-error'));
        expect(LOCTER_UNKNOWN_EXTENSION_ERROR_MARKER).toBe(Symbol.for('@locter/unknown-extension-error'));
    });

    it('should not fall back to jiti when the module load throws SyntaxError', async () => {
        const syntaxErr = new SyntaxError('bad code');
        const refErr = new ReferenceError('missing');

        const restore = setModuleReader({
            load: () => { throw syntaxErr; },
            loadSync: () => { throw refErr; },
        });

        try {
            let asyncError: unknown;
            try {
                await read('any-id');
            } catch (e) {
                asyncError = e;
            }
            expect(asyncError).toBeInstanceOf(LoadError);
            expect((asyncError as LoadError).cause).toBe(syntaxErr);
            expect((asyncError as LoadError).path).toEqual('any-id');

            let syncError: unknown;
            try {
                readSync('any-id');
            } catch (e) {
                syncError = e;
            }
            expect(syncError).toBeInstanceOf(LoadError);
            expect((syncError as LoadError).cause).toBe(refErr);
            expect((syncError as LoadError).path).toEqual('any-id');
        } finally {
            restore();
        }
    });
});
