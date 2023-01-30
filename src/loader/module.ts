/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { LocatorInfo } from '../locator';
import { JSONLoader, ScriptLoader } from './built-in';
import { Loader, Rule } from './type';
import { buildLoaderFilePath } from './utils';

export class LoaderManager {
    protected loaders : Record<string, Loader>;

    protected rules : Rule[];

    constructor() {
        this.loaders = {};
        this.rules = [
            { test: ['.js', '.mjs', '.cjs', '.ts'], loader: 'script' },
            { test: ['.json'], loader: 'json' },
        ];
    }

    register(rule: Rule) {
        this.rules.push(rule);
    }

    async execute(info: LocatorInfo) : Promise<any> {
        const rule = this.findRule(info);
        if (!rule) {
            throw new Error(`No loader registered for extension: "${info.extension}"`);
        }

        const loader = this.resolve(rule.loader);
        return loader.execute(info);
    }

    executeSync(info: LocatorInfo) : any {
        const rule = this.findRule(info);
        if (!rule) {
            throw new Error(`No loader registered for extension: ${info.extension || 'unknown'}`);
        }

        const loader = this.resolve(rule.loader);
        return loader.executeSync(info);
    }

    findRule(info: LocatorInfo) : Rule | undefined {
        for (let i = 0; i < this.rules.length; i++) {
            const { test } = this.rules[i] as Rule;
            if (Array.isArray(test)) {
                if (test.indexOf(info.extension) !== -1) {
                    return this.rules[i];
                }
            } else if (test.test(buildLoaderFilePath(info))) {
                return this.rules[i];
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

        if (this.loaders[id]) {
            return this.loaders[id] as Loader;
        }

        let loader : Loader | undefined;

        switch (id) {
            case 'script': {
                loader = new ScriptLoader();
                break;
            }
            case 'json': {
                loader = new JSONLoader();
                break;
            }
        }

        if (typeof loader !== 'undefined') {
            return loader;
        }

        throw new Error(`The loader ${id} could not be resolved.`);
    }
}
