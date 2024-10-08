/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import { buildFilePath, pathToLocatorInfo } from '../locator';
import { isFilePath } from '../utils';
import { ConfLoader, JSONLoader, ModuleLoader } from './built-in';
import { YAMLLoader } from './built-in/yaml';
import { LoaderId } from './constants';
import type { Loader, Rule } from './type';

export class LoaderManager implements Loader {
    protected loaders : Record<string, Loader>;

    protected rules : Rule[];

    constructor() {
        this.loaders = {};
        this.rules = [
            {
                test: ['.js', '.mjs', '.mts', '.cjs', '.cts', '.ts'],
                loader: LoaderId.MODULE,
            },
            {
                test: ['.conf'], loader: LoaderId.CONF,
            },
            {
                test: ['.json'], loader: LoaderId.JSON,
            },
            {
                test: ['.yml', '.yaml'], loader: LoaderId.YAML,
            },
        ];
    }

    register(rule: Rule) : void;

    register(test: string[] | RegExp, loader: Loader) : void;

    register(test: any, loader?: Loader) : void {
        if (typeof loader !== 'undefined') {
            this.rules.push({ test, loader });
            return;
        }

        this.rules.push(test);
    }

    async execute(input: string) : Promise<any> {
        const id = this.findLoader(input);
        if (!id) {
            const info = pathToLocatorInfo(input);
            throw new Error(`No loader registered for extension: "${info.extension}"`);
        }

        const loader = this.resolve(id);
        return loader.execute(input);
    }

    executeSync(input: string) : any {
        const id = this.findLoader(input);
        if (!id) {
            const info = pathToLocatorInfo(input);
            throw new Error(`No loader registered for extension: ${info.extension || 'unknown'}`);
        }

        const loader = this.resolve(id);
        return loader.executeSync(input);
    }

    findLoader(input: string) : Loader | string | undefined {
        if (!isFilePath(input)) {
            return LoaderId.MODULE;
        }

        const info = pathToLocatorInfo(input);
        for (let i = 0; i < this.rules.length; i++) {
            const { test } = this.rules[i] as Rule;
            if (Array.isArray(test)) {
                if (
                    info.extension &&
                    test.indexOf(info.extension) !== -1
                ) {
                    return this.rules[i].loader;
                }
            } else if (test.test(buildFilePath(info))) {
                return this.rules[i].loader;
            }
        }

        return undefined;
    }

    /**
     * Resolve loader by id.
     *
     * @param id
     */
    resolve(id: string | Loader) : Loader {
        if (typeof id !== 'string') {
            return id;
        }

        if (Object.prototype.hasOwnProperty.call(this.loaders, id)) {
            return this.loaders[id] as Loader;
        }

        let loader : Loader | undefined;

        // built-in
        switch (id) {
            case LoaderId.CONF: {
                loader = new ConfLoader();
                break;
            }
            case LoaderId.MODULE: {
                loader = new ModuleLoader();
                break;
            }
            case LoaderId.JSON: {
                loader = new JSONLoader();
                break;
            }
            case LoaderId.YAML: {
                loader = new YAMLLoader();
                break;
            }
            /* istanbul ignore next */
            default: {
                const pluginPath = this.normalizePath(id);
                const moduleLoader = this.resolve(LoaderId.MODULE);
                loader = moduleLoader.executeSync(pluginPath);

                break;
            }
        }

        if (typeof loader !== 'undefined') {
            this.loaders[id] = loader;

            return loader;
        }

        throw new Error(`The loader ${id} could not be resolved.`);
    }

    /* istanbul ignore next */
    normalizePath(input: string) {
        if (path.isAbsolute(input) || input.startsWith('./')) {
            return input;
        }

        if (input.startsWith('module:')) {
            return input.substring(0, 'module:'.length);
        }

        if (!input.startsWith('@')) {
            return `@locter/${input}`;
        }

        return input;
    }
}
