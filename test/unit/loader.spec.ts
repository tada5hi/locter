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
        let locatorInfo = await locateFile( 'file.js', {path: [basePath]});
        let loaderContent : Record<string, any> = await loadFile(locatorInfo);
        expect(loaderContent).toBeDefined();
        expect(loaderContent.default).toBeDefined();
        expect(loaderContent.foo).toEqual('bar');

        loaderContent = await loadScriptFileExport(locatorInfo);
        expect(loaderContent).toBeDefined();
        expect(loaderContent.key).toEqual('default');
        expect(loaderContent.value).toEqual({foo: 'bar'});

        // --------------------------------------------------------------------

        locatorInfo = locateFileSync( 'file.js', {path: [basePath]});
        loaderContent = loadFileSync(locatorInfo);
        expect(loaderContent).toBeDefined();
        expect(loaderContent.default).toBeUndefined();
        expect(loaderContent.foo).toEqual('bar');

        loaderContent = loadScriptFileExportSync(locatorInfo);
        expect(loaderContent).toBeDefined();
        expect(loaderContent.key).toEqual('default');
        expect(loaderContent.value).toEqual({foo: 'bar'});
    });

    it('should load .ts file', async () => {
        let locatorInfo = await locateFile( 'file-ts.ts', {path: [basePath]});
        let loaderContent : Record<string, any> = await loadFile(locatorInfo);
        expect(loaderContent).toBeDefined();
        expect(loaderContent.default).toBeDefined();
        expect(loaderContent.bar).toEqual('baz');

        loaderContent = await loadScriptFileExport(locatorInfo);
        expect(loaderContent).toBeDefined();
        expect(loaderContent.key).toEqual('default');
        expect(loaderContent.value).toEqual({bar: 'baz'});

        // --------------------------------------------------------------------

        locatorInfo = locateFileSync( 'file-ts.ts', {path: [basePath]});
        loaderContent = loadFileSync(locatorInfo);
        expect(loaderContent).toBeDefined();
        expect(loaderContent.bar).toEqual('baz');

        loaderContent = loadScriptFileExportSync(locatorInfo);
        expect(loaderContent).toBeDefined();
        expect(loaderContent.key).toEqual('default');
        expect(loaderContent.value).toEqual({bar: 'baz'});
    });

    it('should filter .ts file', async () => {
        let locatorInfo = await locateFile( 'file-many-ts.ts', {path: [basePath]});
        let loaderContent : Record<string, any> = await loadScriptFileExport(locatorInfo, (key, value) => {
            return key === 'bar';
        });
        expect(loaderContent).toBeDefined();
        expect(loaderContent.key).toEqual('bar');
        expect(loaderContent.value).toEqual('baz');

        locatorInfo = locateFileSync( 'file-many-ts.ts', {path: [basePath]});
        loaderContent = loadScriptFileExportSync(locatorInfo, (key, value) => {
            return key === 'bar';
        });
        expect(loaderContent).toBeDefined();
        expect(loaderContent.key).toEqual('bar');
        expect(loaderContent.value).toEqual('baz');
    })

    it('should load .json file',  async () => {
        let locatorInfo = await locateFile( 'file.json', {path: [basePath]});
        let loaderContent : Record<string, any> = await loadFile(locatorInfo);
        expect(loaderContent).toBeDefined();
        expect(loaderContent.foo).toEqual('bar');

        locatorInfo = locateFileSync( 'file.json', {path: [basePath]});
        loaderContent = loadFileSync(locatorInfo);
        expect(loaderContent).toBeDefined();
        expect(loaderContent.foo).toEqual('bar');
    });

    it('should not load file', async () => {
        let locatorInfo = await locateFile( 'file.foo', {path: [basePath]});
        let loaderContent : Record<string, any>  = await loadFile(locatorInfo);
        expect(loaderContent).toBeUndefined();

        locatorInfo = locateFileSync( 'file.foo', {path: [basePath]});
        loaderContent = loadFileSync(locatorInfo);
        expect(loaderContent).toBeUndefined();
    });
});
