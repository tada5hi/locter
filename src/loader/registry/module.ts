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
} from '../../errors';
import type { LocatorInfo } from '../../locator';
import { buildFilePath, pathToLocatorInfo } from '../../locator';
import { hasOwnProperty, isFilePath } from '../../utils';
import { ModuleLoader, createModuleRecord, toModuleRecord } from '../built-in';
import type { BuiltInLoaderId, BuiltInLoaderOf } from '../built-in/registry';
import { BUILT_IN_PRESETS } from '../built-in/registry';
import type { ILoader } from '../type';
import type {
    LoaderFactory,
    LoaderRegistration,
    Rule,
} from './type';

export type LoaderRegistryOptions = {
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
    id: string,
    test: RegExp | string[],
    get: () => ILoader
};

export class LoaderRegistry {
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

    protected ruleCounter : number;

    constructor(options: LoaderRegistryOptions = {}) {
        this.rules = [];
        this.builtInCache = new Map();
        this.builtInExtensions = new Map();
        this.ruleCounter = 0;

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

    register(rule: Rule) : LoaderRegistration;

    register(test: string[] | RegExp, loader: ILoader | LoaderFactory) : LoaderRegistration;

    register(test: any, loader?: ILoader | LoaderFactory) : LoaderRegistration {
        const rule : Rule = typeof loader === 'undefined' ? test : { test, loader };

        if (
            typeof rule.id !== 'undefined' &&
            hasOwnProperty(BUILT_IN_PRESETS, rule.id)
        ) {
            throw new LocterError({ message: `The id ${rule.id} is reserved by a built-in loader.` });
        }

        const id = rule.id ?? this.generateRuleId();
        const entry = this.compile(id, rule);

        const index = this.rules.findIndex((item) => item.id === id);
        if (index === -1) {
            this.rules.push(entry);
        } else {
            // replace in place: position preserved, cached instance evicted
            this.rules[index] = entry;
        }

        return {
            id,
            test: rule.test,
            builtIn: false,
        };
    }

    /**
     * Remove a user-registered rule by id. Built-in ids cannot be
     * unregistered (returns false).
     */
    unregister(id: string) : boolean {
        const index = this.rules.findIndex((item) => item.id === id);
        if (index === -1) {
            return false;
        }

        this.rules.splice(index, 1);
        return true;
    }

    has(id: string) : boolean {
        if (this.rules.some((item) => item.id === id)) {
            return true;
        }

        return hasOwnProperty(BUILT_IN_PRESETS, id);
    }

    /**
     * All registrations in effective match order: user rules
     * (registration order) first, then the built-ins.
     */
    entries() : LoaderRegistration[] {
        const output : LoaderRegistration[] = this.rules.map(
            (item) => ({
                id: item.id,
                test: item.test,
                builtIn: false,
            }),
        );

        const ids = Object.keys(BUILT_IN_PRESETS) as BuiltInLoaderId[];
        for (const id of ids) {
            output.push({
                id,
                test: [...BUILT_IN_PRESETS[id].extensions],
                builtIn: true,
            });
        }

        return output;
    }

    /**
     * Restore the registry to its construction state: drop all user rules
     * and evict every cached loader instance (including a module loader
     * configured via setModuleLoader / configure).
     */
    reset() : void {
        this.rules = [];
        this.builtInCache.clear();
        this.ruleCounter = 0;
    }

    async load(input: LocatorInfo | string) : Promise<any> {
        const filePath = buildFilePath(input);
        const loader = this.find(filePath);
        if (!loader) {
            throw this.unknownExtensionError(filePath);
        }

        try {
            return this.toRecord(await loader.execute(filePath), loader);
        } catch (e) {
            throw wrapLoaderError(e, filePath);
        }
    }

    loadSync(input: LocatorInfo | string) : any {
        const filePath = buildFilePath(input);
        const loader = this.find(filePath);
        if (!loader) {
            throw this.unknownExtensionError(filePath);
        }

        try {
            return this.toRecord(loader.executeSync(filePath), loader);
        } catch (e) {
            throw wrapLoaderError(e, filePath);
        }
    }

    /**
     * The single normalization boundary: every load result becomes a module
     * record (`.default` is always the loaded value, top-level keys stay
     * accessible as named exports). Provenance decides how: module-loader
     * output may legitimately already be a record (`__esModule` is meaningful
     * there); any other loader returns arbitrary parsed data, which is always
     * wrapped — even if it happens to contain an `__esModule` key.
     */
    protected toRecord(output: unknown, loader: ILoader) : any {
        if (loader instanceof ModuleLoader) {
            return toModuleRecord(output);
        }

        return createModuleRecord(output);
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
     *   4. undefined → load/loadSync throw LocterUnknownExtensionError
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
            } else {
                // reset before AND after: a g/y regex mutates lastIndex on
                // test(), which would make repeated dispatch alternate and
                // leak state back into the caller-owned RegExp
                test.lastIndex = 0;
                const matched = test.test(buildFilePath(info));
                test.lastIndex = 0;
                if (matched) {
                    return rule.get();
                }
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

    protected compile(id: string, rule: Rule) : CompiledRule {
        const { test, loader } = rule;
        if (typeof loader !== 'function') {
            return {
                id, 
                test, 
                get: () => loader, 
            };
        }

        let cached : ILoader | undefined;
        return {
            id,
            test,
            get: () => {
                if (!cached) {
                    cached = loader();
                }

                return cached;
            },
        };
    }

    protected generateRuleId() : string {
        let id : string;
        do {
            this.ruleCounter++;
            id = `rule:${this.ruleCounter}`;
        } while (this.rules.some((item) => item.id === id));

        return id;
    }
}
