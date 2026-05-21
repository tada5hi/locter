/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { locateUp, locateUpSync } from '../../src';

const basePath = path.join(import.meta.dirname, '..', 'data');
const upBase = path.join(basePath, 'up');
const deep = path.join(upBase, 'nested', 'deep');

describe('src/locator/up.ts', () => {
    it('should find a file at an ancestor directory', async () => {
        const expectedPath = path.join(upBase, 'up.config.json');

        const asyncResult = await locateUp('up.config.json', { cwd: deep });
        expect(asyncResult).toBeDefined();
        expect(asyncResult?.path).toEqual(expectedPath);

        const syncResult = locateUpSync('up.config.json', { cwd: deep });
        expect(syncResult).toBeDefined();
        expect(syncResult?.path).toEqual(expectedPath);
    });

    it('should find a file at the starting directory', async () => {
        const expectedPath = path.join(upBase, 'up.config.json');

        const asyncResult = await locateUp('up.config.json', { cwd: upBase });
        expect(asyncResult?.path).toEqual(expectedPath);

        const syncResult = locateUpSync('up.config.json', { cwd: upBase });
        expect(syncResult?.path).toEqual(expectedPath);
    });

    it('should return undefined when no ancestor matches before `stopAt`', async () => {
        const asyncResult = await locateUp('up.config.json', {
            cwd: deep,
            stopAt: path.join(upBase, 'nested'),
        });
        expect(asyncResult).toBeUndefined();

        const syncResult = locateUpSync('up.config.json', {
            cwd: deep,
            stopAt: path.join(upBase, 'nested'),
        });
        expect(syncResult).toBeUndefined();
    });

    it('should include `stopAt` in the search (inclusive ceiling)', async () => {
        const expectedPath = path.join(upBase, 'up.config.json');

        const asyncResult = await locateUp('up.config.json', { cwd: deep, stopAt: upBase });
        expect(asyncResult?.path).toEqual(expectedPath);

        const syncResult = locateUpSync('up.config.json', { cwd: deep, stopAt: upBase });
        expect(syncResult?.path).toEqual(expectedPath);
    });

    it('should support brace patterns', async () => {
        const expectedPath = path.join(upBase, 'up.config.json');

        const asyncResult = await locateUp('up.config.{ts,json,yaml}', { cwd: deep, stopAt: upBase });
        expect(asyncResult?.path).toEqual(expectedPath);

        const syncResult = locateUpSync('up.config.{ts,json,yaml}', { cwd: deep, stopAt: upBase });
        expect(syncResult?.path).toEqual(expectedPath);
    });

    it('should return undefined when nothing matches up to the root', async () => {
        const asyncResult = await locateUp('definitely-not-here.json', { cwd: deep });
        expect(asyncResult).toBeUndefined();

        const syncResult = locateUpSync('definitely-not-here.json', { cwd: deep });
        expect(syncResult).toBeUndefined();
    });
});
