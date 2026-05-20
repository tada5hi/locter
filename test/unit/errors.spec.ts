/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
    LoaderManager,
    LocterError,
    LocterLoadError,
    LocterNotFoundError,
    LocterUnknownExtensionError,
    load,
    loadSync,
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
});
