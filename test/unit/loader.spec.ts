/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import {
    LoaderManager,
    getModuleExport,
    load,
    loadSync,
} from '../../src';
import { LoaderId } from '../../src/loader/constants';

const basePath = path.join(__dirname, '..', 'data');

describe('src/loader/**', () => {
    it('should load .conf file', async () => {
        const filePath = path.join(basePath, 'file.conf');

        const loaderContent = await load(filePath) as Record<string, any>;
        expect(loaderContent).toBeDefined();
        expect(loaderContent.foo).toEqual('bar');
        expect(loaderContent.bar).toBeDefined();
        expect(loaderContent.bar.a).toEqual('baz');
        expect(loaderContent.bar.b).toEqual('boz');
    });

    it('should load .conf file sync', async () => {
        const filePath = path.join(basePath, 'file.conf');

        const loaderContent = loadSync(filePath) as Record<string, any>;
        expect(loaderContent).toBeDefined();
        expect(loaderContent.foo).toEqual('bar');
        expect(loaderContent.bar).toBeDefined();
        expect(loaderContent.bar.a).toEqual('baz');
        expect(loaderContent.bar.b).toEqual('boz');
    });

    it('should load .yml file', async () => {
        const filePath = path.join(basePath, 'file.yml');

        const loaderContent = await load(filePath) as Record<string, any>;
        expect(loaderContent).toBeDefined();
        expect(loaderContent.YAML).toBeDefined();
        expect(loaderContent.yaml).toBeDefined();
    });

    it('should load .yml file sync', () => {
        const filePath = path.join(basePath, 'file.yml');

        const loaderContent = loadSync(filePath) as Record<string, any>;
        expect(loaderContent).toBeDefined();
        expect(loaderContent.YAML).toBeDefined();
        expect(loaderContent.yaml).toBeDefined();
    });

    it('should load .mjs file', async () => {
        const filePath = path.join(basePath, 'file.mjs');

        const loaderContent = await load(filePath) as Record<string, any>;
        expect(loaderContent).toBeDefined();
        expect(loaderContent.foo).toEqual('bar');
    });

    it('should load .mjs file sync', () => {
        const filePath = path.join(basePath, 'file.mjs');
        const loaderContent = loadSync(filePath) as Record<string, any>;
        expect(loaderContent).toBeDefined();
        expect(loaderContent.foo).toEqual('bar');
    });

    it('should load .mjs file with default export', async () => {
        const filePath = path.join(basePath, 'file-default.mjs');

        const loaderContent = await load(filePath) as Record<string, any>;
        expect(loaderContent.default).toBeDefined();
        expect(loaderContent.default.foo).toEqual('bar');
    });

    it('should load .mjs file with default export sync', async () => {
        const filePath = path.join(basePath, 'file-default.mjs');

        const loaderContent = loadSync(filePath) as Record<string, any>;
        expect(loaderContent.default).toBeDefined();
        expect(loaderContent.default.foo).toEqual('bar');
    });

    it('should load .js file', async () => {
        const filePath = path.join(basePath, 'file.js');

        const loaderContent = await load(filePath) as Record<string, any>;
        expect(loaderContent).toBeDefined();
        expect(loaderContent.foo).toEqual('bar');
    });

    it('should load .js file sync', () => {
        const filePath = path.join(basePath, 'file.js');

        const loaderContent = loadSync(filePath) as Record<string, any>;
        expect(loaderContent).toBeDefined();
        expect(loaderContent.default).toBeUndefined();
        expect(loaderContent.foo).toEqual('bar');
    });

    it('should load .js file with named export', async () => {
        const filePath = path.join(basePath, 'file.js');

        let loaderContent = await load(filePath) as Record<string, any>;
        loaderContent = getModuleExport(loaderContent);
        expect(loaderContent).toBeDefined();
        expect(loaderContent.key).toEqual('default');
        expect(loaderContent.value).toEqual({ foo: 'bar' });
    });

    it('should load .js file with named export sync', () => {
        const filePath = path.join(basePath, 'file.js');

        let loaderContent = loadSync(filePath) as Record<string, any>;
        loaderContent = getModuleExport(loaderContent);
        expect(loaderContent).toBeDefined();
        expect(loaderContent.key).toEqual('default');
        expect(loaderContent.value).toEqual({ foo: 'bar' });
    });

    it('should load .ts file', async () => {
        const filePath = path.join(basePath, 'file-ts.ts');

        const loaderContent = await load(filePath) as Record<string, any>;
        expect(loaderContent).toBeDefined();
        expect(loaderContent.bar).toEqual('baz');
    });

    it('should load .ts file', async () => {
        const filePath = path.join(basePath, 'file-ts.ts');

        let loaderContent = await load(filePath) as Record<string, any>;
        loaderContent = getModuleExport(loaderContent);
        expect(loaderContent).toBeDefined();
        expect(loaderContent.key).toEqual('default');
        expect(loaderContent.value).toEqual({ bar: 'baz' });
    });

    it('should load .ts file sync', () => {
        const filePath = path.join(basePath, 'file-ts.ts');

        const loaderContent = loadSync(filePath) as Record<string, any>;
        expect(loaderContent).toBeDefined();
        expect(loaderContent.bar).toEqual('baz');
    });

    it('should load .ts file with named export sync', () => {
        const filePath = path.join(basePath, 'file-ts.ts');

        let loaderContent = loadSync(filePath) as Record<string, any>;
        loaderContent = getModuleExport(loaderContent);
        expect(loaderContent).toBeDefined();
        expect(loaderContent.key).toEqual('default');
        expect(loaderContent.value).toEqual({ bar: 'baz' });
    });

    it('should filter .ts file', async () => {
        const filePath = path.join(basePath, 'file-many-ts.ts');

        let loaderContent = await load(filePath) as Record<string, any>;
        loaderContent = await getModuleExport(loaderContent, (key) => key === 'bar') as Record<string, any>;

        expect(loaderContent).toBeDefined();
        expect(loaderContent.key).toEqual('bar');
        expect(loaderContent.value).toEqual('baz');
    });

    it('should filter .ts file sync', () => {
        const filePath = path.join(basePath, 'file-many-ts.ts');

        let loaderContent = loadSync(filePath) as Record<string, any>;
        loaderContent = getModuleExport(loaderContent, (key) => key === 'bar') as Record<string, any>;
        expect(loaderContent).toBeDefined();
        expect(loaderContent.key).toEqual('bar');
        expect(loaderContent.value).toEqual('baz');
    });

    it('should load .json file', async () => {
        const filePath = path.join(basePath, 'file.json');

        const loaderContent : Record<string, any> = await load(filePath) as Record<string, any>;
        expect(loaderContent).toBeDefined();
        expect(loaderContent.foo).toEqual('bar');
    });

    it('should load .json file sync', () => {
        const filePath = path.join(basePath, 'file.json');

        const loaderContent = loadSync(filePath) as Record<string, any>;
        expect(loaderContent).toBeDefined();
        expect(loaderContent.foo).toEqual('bar');
    });

    it('should not load file', async () => {
        try {
            await load('file.foo');
            expect(true).toBe(false);
        } catch (e) {
            expect(e).toBeDefined();
        }

        try {
            loadSync('file.foo');
            expect(true).toBe(false);
        } catch (e) {
            expect(e).toBeDefined();
        }
    });

    it('should register loader', () => {
        const manager = new LoaderManager();
        manager.register(['.foo'], {
            async execute(input) {
                return input;
            },
            executeSync(input: string) {
                return input;
            },
        });
    });

    it('should use module loader as fallback', () => {
        const manager = new LoaderManager();
        const loader = manager.findLoader('foo');
        expect(loader).toEqual(LoaderId.MODULE);
    });
});
