/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
    locate,
    locateMany,
    locateManySync,
    locateSync,
} from '../../src';
import type { LocatorInfo } from '../../src';

const basePath = path.join(import.meta.dirname, '..', 'data');

describe('src/locator.ts', () => {
    it('should locate directory', async () => {
        let locatorInfo = await locate(['data'], {
            onlyDirectories: true,
            path: path.join(import.meta.dirname, '..'),
        });
        expect(locatorInfo).toBeDefined();
        if (locatorInfo) {
            expect(locatorInfo.name).toEqual('data');
        }

        locatorInfo = locateSync(['unit'], {
            onlyDirectories: true,
            path: path.join(import.meta.dirname, '..'),
        });
        expect(locatorInfo).toBeDefined();
        if (locatorInfo) {
            expect(locatorInfo.name).toEqual('unit');
        }
    });

    it('should locate directories', async () => {
        let locatorInfo = await locateMany(['*'], {
            onlyDirectories: true,
            path: path.join(import.meta.dirname, '..'),
        });
        expect(locatorInfo.length).toEqual(2);
        expect(locatorInfo.map((el) => el.name)).toEqual(['data', 'unit']);

        locatorInfo = locateManySync(['*'], {
            onlyDirectories: true,
            path: path.join(import.meta.dirname, '..'),
        });
        expect(locatorInfo.length).toEqual(2);
        expect(locatorInfo.map((el) => el.name)).toEqual(['data', 'unit']);
    });

    it('should locate .[cm]js file', async () => {
        let locatorInfo = await locate(['file.[cf]js'], { path: [basePath] });
        expect(locatorInfo).toBeDefined();
        expect(locatorInfo).toEqual({
            directory: basePath,
            name: 'file',
            extension: '.cjs',
            path: path.join(basePath, 'file.cjs'),
        } as LocatorInfo);

        locatorInfo = locateSync(['file.[mf]js'], { path: [basePath] });
        expect(locatorInfo).toBeDefined();
        expect(locatorInfo).toEqual({
            directory: basePath,
            name: 'file',
            extension: '.mjs',
            path: path.join(basePath, 'file.mjs'),
        } as LocatorInfo);
    });

    it('should locate .[cm]ts files', async () => {
        const files : LocatorInfo[] = [
            {
                directory: basePath,
                name: 'file',
                extension: '.cts',
                path: path.join(basePath, 'file.cts'),
            },
            {
                directory: basePath,
                name: 'file',
                extension: '.mts',
                path: path.join(basePath, 'file.mts'),
            },
        ];
        let locatorInfo = await locateMany(['file.[cm]ts'], { path: [basePath] });
        expect(locatorInfo).toBeDefined();
        expect(locatorInfo).toEqual(files);

        locatorInfo = locateManySync(['file.[cm]ts'], { path: [basePath] });
        expect(locatorInfo).toBeDefined();
        expect(locatorInfo).toEqual(files);
    });

    it('should locate .json file', async () => {
        let locatorInfo = await locate('file.json', { path: [basePath] });
        expect(locatorInfo).toBeDefined();
        expect(locatorInfo).toEqual({
            directory: basePath,
            name: 'file',
            extension: '.json',
            path: path.join(basePath, 'file.json'),
        } as LocatorInfo);

        locatorInfo = locateSync('file.json', { path: [basePath] });
        expect(locatorInfo).toBeDefined();
        expect(locatorInfo).toEqual({
            directory: basePath,
            name: 'file',
            extension: '.json',
            path: path.join(basePath, 'file.json'),
        } as LocatorInfo);
    });

    it('should not locate file', async () => {
        const locatorInfo = await locate('file.foo', { path: [basePath] });
        expect(locatorInfo).toBeUndefined();
    });

    it('should not locate file sync', () => {
        const locatorInfo = locateSync('file.foo', { path: [basePath] });
        expect(locatorInfo).toBeUndefined();
    });

    it('should ignore dotfiles by default with wildcard patterns', async () => {
        const asyncResult = await locateMany('*', { path: [basePath] });
        expect(asyncResult.map((r) => r.name)).not.toContain('.hidden');

        const syncResult = locateManySync('*', { path: [basePath] });
        expect(syncResult.map((r) => r.name)).not.toContain('.hidden');
    });

    it('should include dotfiles when `dot: true`', async () => {
        const expected: LocatorInfo = {
            directory: basePath,
            name: '.hidden',
            extension: undefined,
            path: path.join(basePath, '.hidden'),
        };

        const asyncResult = await locateMany('*', { path: [basePath], dot: true });
        expect(asyncResult).toContainEqual(expected);

        const syncResult = locateManySync('*', { path: [basePath], dot: true });
        expect(syncResult).toContainEqual(expected);
    });
});
