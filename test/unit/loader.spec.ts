/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from "path";
import {
    buildLoaderFilePath,
    loadFile,
    loadFileSync,
    loadScriptFile,
    loadScriptFileExport,
    loadScriptFileExportSync,
    loadScriptFileSync,
    locateFile,
    locateFileSync,
    LocatorInfo
} from "../../src";

const basePath = path.join(__dirname, '..', 'data');

describe('src/loader/**', () => {
    it('should load .js file', async () => {
        let locatorInfo = await locateFile( 'file.js', {path: [basePath]});
        expect(locatorInfo).toBeDefined();

        let loaderContent : Record<string, any>;

        if(locatorInfo) {
            loaderContent = await loadFile(locatorInfo) as Record<string, any>;
            expect(loaderContent).toBeDefined();
            expect(loaderContent.default).toBeDefined();
            expect(loaderContent.foo).toEqual('bar');

            loaderContent = await loadFile(buildLoaderFilePath(locatorInfo)) as Record<string, any>;
            expect(loaderContent).toBeDefined();

            loaderContent = await loadScriptFileExport(locatorInfo) as Record<string, any>;
            expect(loaderContent).toBeDefined();
            expect(loaderContent.key).toEqual('default');
            expect(loaderContent.value).toEqual({foo: 'bar'});

            loaderContent = await loadScriptFile(buildLoaderFilePath(locatorInfo)) as Record<string, any>;
            expect(loaderContent).toBeDefined();
        }
            // --------------------------------------------------------------------

        locatorInfo = locateFileSync('file.js', {path: [basePath]});
        expect(locatorInfo).toBeDefined();

        if(locatorInfo) {
            loaderContent = loadFileSync(locatorInfo) as Record<string, any>;
            expect(loaderContent).toBeDefined();
            expect(loaderContent.default).toBeUndefined();
            expect(loaderContent.foo).toEqual('bar');

            loaderContent = loadFileSync(buildLoaderFilePath(locatorInfo)) as Record<string, any>;
            expect(loaderContent).toBeDefined();

            loaderContent = loadScriptFileExportSync(locatorInfo) as Record<string, any>;
            expect(loaderContent).toBeDefined();
            expect(loaderContent.key).toEqual('default');
            expect(loaderContent.value).toEqual({foo: 'bar'});

            loaderContent = loadScriptFileSync(buildLoaderFilePath(locatorInfo)) as Record<string, any>;
            expect(loaderContent).toBeDefined();
        }
    });

    it('should load .ts file', async () => {
        let locatorInfo = await locateFile( 'file-ts.ts', {path: [basePath]});
        expect(locatorInfo).toBeDefined();

        let loaderContent;

        if(locatorInfo) {
            loaderContent = await loadFile(locatorInfo) as Record<string, any>;
            expect(loaderContent).toBeDefined();
            expect(loaderContent.default).toBeDefined();
            expect(loaderContent.bar).toEqual('baz');

            loaderContent = await loadScriptFileExport(locatorInfo) as Record<string, any>;
            expect(loaderContent).toBeDefined();
            expect(loaderContent.key).toEqual('default');
            expect(loaderContent.value).toEqual({bar: 'baz'});
        }

        // --------------------------------------------------------------------

        locatorInfo = locateFileSync( 'file-ts.ts', {path: [basePath]});
        expect(locatorInfo).toBeDefined();

        if(locatorInfo) {
            loaderContent = loadFileSync(locatorInfo) as Record<string, any>;
            expect(loaderContent).toBeDefined();
            expect(loaderContent.bar).toEqual('baz');

            loaderContent = loadScriptFileExportSync(locatorInfo) as Record<string, any>;;
            expect(loaderContent).toBeDefined();
            expect(loaderContent.key).toEqual('default');
            expect(loaderContent.value).toEqual({bar: 'baz'});
        }
    });

    it('should filter .ts file', async () => {
        let locatorInfo = await locateFile( 'file-many-ts.ts', {path: [basePath]});
        let loaderContent : Record<string, any>;

        if(locatorInfo) {
            loaderContent = await loadScriptFileExport(locatorInfo, (key) => {
                return key === 'bar';
            }) as Record<string, any>;

            expect(loaderContent).toBeDefined();
            expect(loaderContent.key).toEqual('bar');
            expect(loaderContent.value).toEqual('baz');
        }

        locatorInfo = locateFileSync( 'file-many-ts.ts', {path: [basePath]});
        expect(locatorInfo).toBeDefined();

        if(locatorInfo) {
            loaderContent = loadScriptFileExportSync(locatorInfo, (key) => {
                return key === 'bar';
            }) as Record<string, any>;
            expect(loaderContent).toBeDefined();
            expect(loaderContent.key).toEqual('bar');
            expect(loaderContent.value).toEqual('baz');
        }
    })

    it('should load .json file',  async () => {
        let locatorInfo = await locateFile( 'file.json', {path: [basePath]}) as LocatorInfo;
        expect(locatorInfo).toBeDefined();

        let loaderContent : Record<string, any> = await loadFile(locatorInfo) as Record<string, any>;
        expect(loaderContent).toBeDefined();
        expect(loaderContent.foo).toEqual('bar');

        locatorInfo = locateFileSync( 'file.json', {path: [basePath]}) as LocatorInfo;
        expect(locatorInfo).toBeDefined();

        loaderContent = loadFileSync(locatorInfo) as Record<string, any>;
        expect(loaderContent).toBeDefined();
        expect(loaderContent.foo).toEqual('bar');
    });

    it('should not load file', async () => {
        try {
            await loadFile('file.foo');
            expect(true).toBe(false);
        } catch (e) {
            expect(e).toBeDefined();
        }

        try {
            loadFileSync('file.foo');
            expect(true).toBe(false);
        } catch (e) {
            expect(e).toBeDefined();
        }
    });
});
