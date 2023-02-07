/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */


import path from "path";
import {locate, locateMany, locateManySync, locateSync} from "../../src";
import {LocatorInfo} from "../../src";

const basePath = path.join(__dirname, '..', 'data');

describe('src/locator.ts', () => {
    it('should not locate .js file', async () => {
        let locatorInfo = await locate( ['file.ts', 'file.js'], {path: [basePath]});
        expect(locatorInfo).toBeDefined();
        expect(locatorInfo).toEqual({
            path: basePath,
            name: 'file',
            extension: '.js'
        } as LocatorInfo);

        locatorInfo = locateSync( ['file.ts', 'file.js'], {path: [basePath]});
        expect(locatorInfo).toBeDefined();
        expect(locatorInfo).toEqual({
            path: basePath,
            name: 'file',
            extension: '.js'
        } as LocatorInfo);
    });

    it('should not locate .js files', async () => {
        let locatorInfo = await locateMany( ['file.ts', 'file.js'], {path: [basePath]});
        expect(locatorInfo).toBeDefined();
        expect(locatorInfo).toEqual([{
            path: basePath,
            name: 'file',
            extension: '.js'
        }] as LocatorInfo[]);

        locatorInfo = locateManySync( ['file.ts', 'file.js'], {path: [basePath]});
        expect(locatorInfo).toBeDefined();
        expect(locatorInfo).toEqual([{
            path: basePath,
            name: 'file',
            extension: '.js'
        }] as LocatorInfo[]);
    });

    it('should locate .ts file', async () => {
        let locatorInfo = await locate( 'file-ts.{js,ts}', {path: [basePath]});
        expect(locatorInfo).toBeDefined();
        expect(locatorInfo).toEqual({
            path: basePath,
            name: 'file-ts',
            extension: '.ts'
        } as LocatorInfo);

        locatorInfo = locateSync( 'file-ts.{js,ts}', {path: [basePath]});
        expect(locatorInfo).toBeDefined();
        expect(locatorInfo).toEqual({
            path: basePath,
            name: 'file-ts',
            extension: '.ts'
        } as LocatorInfo);
    });

    it('should locate .json file', async () => {
        let locatorInfo = await locate( 'file.json', {path: [basePath]});
        expect(locatorInfo).toBeDefined();
        expect(locatorInfo).toEqual({
            path: basePath,
            name: 'file',
            extension: '.json'
        } as LocatorInfo);

        locatorInfo = locateSync('file.json', {path: [basePath]});
        expect(locatorInfo).toBeDefined();
        expect(locatorInfo).toEqual({
            path: basePath,
            name: 'file',
            extension: '.json'
        } as LocatorInfo);
    });

    it('should not locate file async', async () => {
        let locatorInfo = await locate( 'file.foo', {path: [basePath]});
        expect(locatorInfo).toBeUndefined();

        locatorInfo = locateSync( 'file.foo', {path: [basePath]});
        expect(locatorInfo).toBeUndefined();
    });
});
