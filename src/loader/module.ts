/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    LocterError,
    LocterUnknownExtensionError,
    wrapLoaderError,
} from '../errors';
import { buildFilePath, pathToLocatorInfo } from '../locator';
import { isFilePath } from '../utils';
import { toModuleRecord } from './built-in';
import type { BuiltInLoaderId, BuiltInLoaderOf } from './built-in/registry';
import { BUILT_IN_PRESETS } from './built-in/registry';
import type { ILoader, LoaderFactory, Rule } from './type';

export type LoaderManagerOptions = {
    /**
     * Seed user rules (matched before built-ins, in array order).
     */
    rules?: Rule[]
};

/**
 * A rule compiled to a memoizing accessor. Caller-owned Rule objects
 * are never mutated; factory caching lives in the closure.
 */
type CompiledRule = {
    test: RegExp | string[],
    get: () => ILoader
};

export class LoaderManager implements ILoader {
    /**
     * User rules only — built-ins live in the extension table instead.
     */
    protected rules : CompiledRule[];

    /**
     * Lazy per-instance cache of built-in loader instances.
     */
    protected builtInCache : Map<BuiltInLoaderId, ILoader>;

    /**
     * extension → built-in id, precomputed once from BUILT_IN_PRESETS.
     */
    protected builtInExtensions : Map<string, BuiltInLoaderId>;

    constructor(options: LoaderManagerOptions = {}) {
        this.rules = [];
        this.builtInCache = new Map();
        this.builtInExtensions = new Map();

        const ids = Object.keys(BUILT_IN_PRESETS) as BuiltInLoaderId[];
        for (const id of ids) {
            for (const extension of BUILT_IN_PRESETS[id].extensions) {
                const existing = this.builtInExtensions.get(extension);
                if (existing) {
                    throw new LocterError({ message: `Extension ${extension} is claimed by two built-in loaders: ${existing}, ${id}.` });
                }

                this.builtInExtensions.set(extension, id);
            }
        }

        if (options.rules) {
            for (const rule of options.rules) {
                this.register(rule);
            }
        }
    }

    register(rule: Rule) : void;

    register(test: string[] | RegExp, loader: ILoader | LoaderFactory) : void;

    register(test: any, loader?: ILoader | LoaderFactory) : void {
        const rule : Rule = typeof loader === 'undefined' ? test : { test, loader };
        this.rules.push(this.compile(rule));
    }

    async execute(input: string) : Promise<any> {
        const loader = this.find(input);
        if (!loader) {
            throw this.unknownExtensionError(input);
        }

        try {
            // Normalize every loader's result to a module record, so `.default`
            // is always the loaded value (and data-file top-level keys stay
            // accessible as named exports). Idempotent for the module loader,
            // which already returns a record.
            return toModuleRecord(await loader.execute(input));
        } catch (e) {
            throw wrapLoaderError(e, input);
        }
    }

    executeSync(input: string) : any {
        const loader = this.find(input);
        if (!loader) {
            throw this.unknownExtensionError(input);
        }

        try {
            return toModuleRecord(loader.executeSync(input));
        } catch (e) {
            throw wrapLoaderError(e, input);
        }
    }

    /**
     * Typed accessor for the LIVE built-in loader instance (lazy, cached).
     */
    builtIn<K extends BuiltInLoaderId>(id: K) : BuiltInLoaderOf<K> {
        let loader = this.builtInCache.get(id);
        if (!loader) {
            loader = BUILT_IN_PRESETS[id].create();
            this.builtInCache.set(id, loader);
        }

        return loader as BuiltInLoaderOf<K>;
    }

    /**
     * Dispatch order:
     *   1. bare specifier (no extension)  → module loader, always
     *   2. user rules, registration order → first match wins (can override built-ins)
     *   3. built-in extension table
     *   4. undefined → caller throws LocterUnknownExtensionError
     */
    find(input: string) : ILoader | undefined {
        if (!isFilePath(input)) {
            return this.builtIn('module');
        }

        const info = pathToLocatorInfo(input);

        for (const rule of this.rules) {
            const { test } = rule;
            if (Array.isArray(test)) {
                if (
                    info.extension &&
                    test.includes(info.extension)
                ) {
                    return rule.get();
                }
            } else if (test.test(buildFilePath(info))) {
                return rule.get();
            }
        }

        if (info.extension) {
            const id = this.builtInExtensions.get(info.extension);
            if (id) {
                return this.builtIn(id);
            }
        }

        return undefined;
    }

    protected unknownExtensionError(input: string) : LocterUnknownExtensionError {
        const info = pathToLocatorInfo(input);
        return new LocterUnknownExtensionError({
            message: `No loader registered for extension: ${info.extension ?? 'unknown'}`,
            path: input,
        });
    }

    protected compile(rule: Rule) : CompiledRule {
        const { test, loader } = rule;
        if (typeof loader !== 'function') {
            return { test, get: () => loader };
        }

        let cached : ILoader | undefined;
        return {
            test,
            get: () => {
                if (!cached) {
                    cached = loader();
                }

                return cached;
            },
        };
    }
}
