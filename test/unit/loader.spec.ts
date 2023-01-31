/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from "path";
import {
    loadFile,
    loadFileSync,
    getExportItem
} from "../../src";

const basePath = path.join(__dirname, '..', 'data');

describe('src/loader/**', () => {
    it('should load .mjs file', async () => {
        const filePath = path.join(basePath, 'file.mjs');

        const loaderContent = await loadFile(filePath) as Record<string, any>;
        expect(loaderContent).toBeDefined();
        expect(loaderContent.foo).toEqual('bar');
    });

    it('should load .mjs file sync', () => {
        const filePath = path.join(basePath, 'file.mjs');
        const loaderContent = loadFileSync(filePath) as Record<string, any>;
        expect(loaderContent).toBeDefined();
        expect(loaderContent.foo).toEqual('bar');
    })

    it('should load .mjs file with default export', async () => {
        const filePath = path.join(basePath, 'file-default.mjs');

        const loaderContent = await loadFile(filePath) as Record<string, any>;
        expect(loaderContent.default).toBeDefined();
        expect(loaderContent.default.foo).toEqual('bar');
    });

    it('should load .mjs file with default export sync', async () => {
        const filePath = path.join(basePath, 'file-default.mjs');

        const loaderContent = loadFileSync(filePath) as Record<string, any>;
        expect(loaderContent.default).toBeDefined();
        expect(loaderContent.default.foo).toEqual('bar');
    });

    it('should load .js file', async () => {
        const filePath = path.join(basePath, 'file.js');

        const loaderContent = await loadFile(filePath) as Record<string, any>;
        expect(loaderContent).toBeDefined();
        expect(loaderContent.foo).toEqual('bar');
    });

    it('should load .js file sync',  () => {
        const filePath = path.join(basePath, 'file.js');

        const loaderContent = loadFileSync(filePath) as Record<string, any>;
        expect(loaderContent).toBeDefined();
        expect(loaderContent.default).toBeUndefined();
        expect(loaderContent.foo).toEqual('bar');
    });


    it('should load .js file with named export', async () => {
        const filePath = path.join(basePath, 'file.js');

        let loaderContent = await loadFile(filePath) as Record<string, any>;
        loaderContent = getExportItem(loaderContent);
        expect(loaderContent).toBeDefined();
        expect(loaderContent.key).toEqual('default');
        expect(loaderContent.value).toEqual({foo: 'bar'});
    })

    it('should load .js file with named export sync', () => {
        const filePath = path.join(basePath, 'file.js');

        let loaderContent = loadFileSync(filePath) as Record<string, any>;
        loaderContent = getExportItem(loaderContent);
        expect(loaderContent).toBeDefined();
        expect(loaderContent.key).toEqual('default');
        expect(loaderContent.value).toEqual({foo: 'bar'});
    });

    it('should load .ts file', async () => {
        const filePath = path.join(basePath, 'file-ts.ts');

        let loaderContent = await loadFile(filePath) as Record<string, any>;
        expect(loaderContent).toBeDefined();
        expect(loaderContent.bar).toEqual('baz');
    });

    it('should load .ts file', async () => {
        const filePath = path.join(basePath, 'file-ts.ts');

        let loaderContent = await loadFile(filePath) as Record<string, any>;
        loaderContent = getExportItem(loaderContent);
        expect(loaderContent).toBeDefined();
        expect(loaderContent.key).toEqual('default');
        expect(loaderContent.value).toEqual({bar: 'baz'});
    });

    it('should load .ts file sync',  () => {
        const filePath = path.join(basePath, 'file-ts.ts');

        let loaderContent = loadFileSync(filePath) as Record<string, any>;
        expect(loaderContent).toBeDefined();
        expect(loaderContent.bar).toEqual('baz');
    });

    it('should load .ts file with named export sync',  () => {
        const filePath = path.join(basePath, 'file-ts.ts');

        let loaderContent = loadFileSync(filePath) as Record<string, any>;
        loaderContent = getExportItem(loaderContent);
        expect(loaderContent).toBeDefined();
        expect(loaderContent.key).toEqual('default');
        expect(loaderContent.value).toEqual({bar: 'baz'});
    });

    it('should filter .ts file', async () => {
        const filePath = path.join(basePath, 'file-many-ts.ts');

        let loaderContent = await loadFile(filePath) as Record<string, any>;
        loaderContent = await getExportItem(loaderContent, (key) => {
            return key === 'bar';
        }) as Record<string, any>;

        expect(loaderContent).toBeDefined();
        expect(loaderContent.key).toEqual('bar');
        expect(loaderContent.value).toEqual('baz');
    });

    it('should filter .ts file sync', () => {
        const filePath = path.join(basePath, 'file-many-ts.ts');

        let loaderContent = loadFileSync(filePath) as Record<string, any>;
        loaderContent = getExportItem(loaderContent, (key) => {
            return key === 'bar';
        }) as Record<string, any>;
        expect(loaderContent).toBeDefined();
        expect(loaderContent.key).toEqual('bar');
        expect(loaderContent.value).toEqual('baz');
    })

    it('should load .json file',  async () => {
        const filePath = path.join(basePath, 'file.json');

        let loaderContent : Record<string, any> = await loadFile(filePath) as Record<string, any>;
        expect(loaderContent).toBeDefined();
        expect(loaderContent.foo).toEqual('bar');
    });

    it('should load .json file sync',  () => {
        const filePath = path.join(basePath, 'file.json');

        let loaderContent = loadFileSync(filePath) as Record<string, any>;
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
