/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'path';
import {
    locate, locateMany, locateManySync, locateSync,
} from '../../src';
import type { LocatorInfo } from '../../src';

const basePath = path.join(__dirname, '..', 'data');

describe('src/locator.ts', () => {
    it('should locate .[cm]js file', async () => {
        let locatorInfo = await locate(['file.[cf]js'], { path: [basePath] });
        expect(locatorInfo).toBeDefined();
        expect(locatorInfo).toEqual({
            path: basePath,
            name: 'file',
            extension: '.cjs',
        } as LocatorInfo);

        locatorInfo = locateSync(['file.[mf]js'], { path: [basePath] });
        expect(locatorInfo).toBeDefined();
        expect(locatorInfo).toEqual({
            path: basePath,
            name: 'file',
            extension: '.mjs',
        } as LocatorInfo);
    });

    it('should locate .[cm]ts files', async () => {
        const files : LocatorInfo[] = [
            {
                path: basePath,
                name: 'file',
                extension: '.cts',
            },
            {
                path: basePath,
                name: 'file',
                extension: '.mts',
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
            path: basePath,
            name: 'file',
            extension: '.json',
        } as LocatorInfo);

        locatorInfo = locateSync('file.json', { path: [basePath] });
        expect(locatorInfo).toBeDefined();
        expect(locatorInfo).toEqual({
            path: basePath,
            name: 'file',
            extension: '.json',
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
});
