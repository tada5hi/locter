/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */


import path from "path";
import {locateFile, locateFileSync} from "../../src";
import {LocatorInfo} from "../../src";

const basePath = path.join(__dirname, '..', 'data');

describe('src/locator.ts', () => {
    it('should not locate .js file', async () => {
        let locatorInfo = await locateFile( 'file', {paths: [basePath], extensions: ['.js']});
        expect(locatorInfo).toBeDefined();
        expect(locatorInfo).toEqual({
            path: basePath,
            fileName: 'file',
            fileExtension: '.js'
        } as LocatorInfo);

        locatorInfo = locateFileSync( 'file', {paths: [basePath], extensions: ['.js']});
        expect(locatorInfo).toBeDefined();
        expect(locatorInfo).toEqual({
            path: basePath,
            fileName: 'file',
            fileExtension: '.js'
        } as LocatorInfo);
    });

    it('should locate .ts file', async () => {
        let locatorInfo = await locateFile( 'file-ts', {paths: [basePath], extensions: ['.ts']});
        expect(locatorInfo).toBeDefined();
        expect(locatorInfo).toEqual({
            path: basePath,
            fileName: 'file-ts',
            fileExtension: '.ts'
        } as LocatorInfo);

        locatorInfo = locateFileSync( 'file-ts', {paths: [basePath], extensions: ['.ts']});
        expect(locatorInfo).toBeDefined();
        expect(locatorInfo).toEqual({
            path: basePath,
            fileName: 'file-ts',
            fileExtension: '.ts'
        } as LocatorInfo);
    });

    it('should locate .json file', async () => {
        let locatorInfo = await locateFile( 'file', {paths: [basePath], extensions: ['.json']});
        expect(locatorInfo).toBeDefined();
        expect(locatorInfo).toEqual({
            path: basePath,
            fileName: 'file',
            fileExtension: '.json'
        } as LocatorInfo);

        locatorInfo = locateFileSync('file', {paths: [basePath], extensions: ['.json']});
        expect(locatorInfo).toBeDefined();
        expect(locatorInfo).toEqual({
            path: basePath,
            fileName: 'file',
            fileExtension: '.json'
        } as LocatorInfo);
    });

    it('should not locate file async', async () => {
        let locatorInfo = await locateFile( 'file', {paths: [basePath], extensions: ['.foo']});
        expect(locatorInfo).toBeUndefined();

        locatorInfo = locateFileSync( 'file', {paths: [basePath], extensions: ['.foo']});
        expect(locatorInfo).toBeUndefined();
    });
});
