/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */


import path from "path";
import {loadScriptFileExport, loadScriptFileExportSync, locateFile, locateFileSync} from "../../src";
import {loadFile, loadFileSync} from "../../src";

const basePath = path.join(__dirname, '..', 'data');

describe('src/loader/**', () => {
    it('should load .js file', async () => {
        let locatorInfo = await locateFile( 'file', {paths: [basePath], extensions: ['.js']});
        let loaderContent : Record<string, any> = await loadFile(locatorInfo);
        expect(loaderContent).toBeDefined();
        expect(loaderContent.default).toBeDefined();
        expect(loaderContent.foo).toEqual('bar');

        loaderContent = await loadScriptFileExport(locatorInfo);
        expect(loaderContent).toBeDefined();
        expect(loaderContent.foo).toEqual('bar');

        // --------------------------------------------------------------------

        locatorInfo = locateFileSync( 'file', {paths: [basePath], extensions: ['.js']});
        loaderContent = loadFileSync(locatorInfo);
        expect(loaderContent).toBeDefined();
        expect(loaderContent.default).toBeUndefined();
        expect(loaderContent.foo).toEqual('bar');

        loaderContent = loadScriptFileExportSync(locatorInfo);
        expect(loaderContent).toBeDefined();
        expect(loaderContent.default).toBeUndefined();
        expect(loaderContent.foo).toEqual('bar');
    });

    it('should load .ts file', async () => {
        let locatorInfo = await locateFile( 'file-ts', {paths: [basePath], extensions: ['.ts']});
        let loaderContent : Record<string, any> = await loadFile(locatorInfo);
        expect(loaderContent).toBeDefined();
        expect(loaderContent.default).toBeDefined();
        expect(loaderContent.bar).toEqual('baz');

        loaderContent = await loadScriptFileExport(locatorInfo);
        expect(loaderContent).toBeDefined();
        expect(loaderContent.bar).toEqual('baz');

        // --------------------------------------------------------------------

        locatorInfo = locateFileSync( 'file-ts', {paths: [basePath], extensions: ['.ts']});
        loaderContent = loadFileSync(locatorInfo);
        expect(loaderContent).toBeDefined();
        expect(loaderContent.bar).toEqual('baz');

        loaderContent = loadScriptFileExportSync(locatorInfo);
        expect(loaderContent).toBeDefined();
        expect(loaderContent.bar).toEqual('baz');
    });

    it('should filter .ts file', async () => {
        let locatorInfo = await locateFile( 'file-many-ts', {paths: [basePath], extensions: ['.ts']});
        let loaderContent : Record<string, any> = await loadScriptFileExport(locatorInfo, (key, value) => {
            return key === 'bar';
        });
        expect(loaderContent).toBeDefined();
        expect(loaderContent).toEqual('baz');

        locatorInfo = locateFileSync( 'file-many-ts', {paths: [basePath], extensions: ['.ts']});
        loaderContent = loadScriptFileExportSync(locatorInfo, (key, value) => {
            return key === 'bar';
        });
        expect(loaderContent).toBeDefined();
        expect(loaderContent).toEqual('baz');
    })

    it('should load .json file',  async () => {
        let locatorInfo = await locateFile( 'file', {paths: [basePath], extensions: ['.json']});
        let loaderContent : Record<string, any> = await loadFile(locatorInfo);
        expect(loaderContent).toBeDefined();
        expect(loaderContent.foo).toEqual('bar');

        locatorInfo = locateFileSync( 'file', {paths: [basePath], extensions: ['.json']});
        loaderContent = loadFileSync(locatorInfo);
        expect(loaderContent).toBeDefined();
        expect(loaderContent.foo).toEqual('bar');
    });

    it('should not load file', async () => {
        let locatorInfo = await locateFile( 'file', {paths: [basePath], extensions: ['.foo']});
        let loaderContent : Record<string, any>  = await loadFile(locatorInfo);
        expect(loaderContent).toBeUndefined();

        locatorInfo = locateFileSync( 'file', {paths: [basePath], extensions: ['.foo']});
        loaderContent = loadFileSync(locatorInfo);
        expect(loaderContent).toBeUndefined();
    });
});
