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
import type { TwinBody } from '../../utils/twin';
import { op, runTwinAsync, runTwinSync } from '../../utils/twin';
import { ModuleReader, createModuleRecord, toModuleRecord } from '../built-in';
import type { BuiltInFormatId, BuiltInReaderOf } from '../built-in/registry';
import { BUILT_IN_PRESETS } from '../built-in/registry';
import type { IReader } from '../type';
import type {
    FormatRegistration,
    Rule,
} from './type';

export type FormatRegistryOptions = {
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
    getReader: () => IReader
};

export class FormatRegistry {
    /**
     * User rules only — built-ins live in the extension table instead.
     */
    protected rules : CompiledRule[];

    /**
     * Lazy per-instance cache of built-in reader instances.
     */
    protected builtInReaderCache : Map<BuiltInFormatId, IReader>;

    /**
     * extension → built-in format id, precomputed once from BUILT_IN_PRESETS.
     */
    protected builtInExtensions : Map<string, BuiltInFormatId>;

    protected ruleCounter : number;

    constructor(options: FormatRegistryOptions = {}) {
        this.rules = [];
        this.builtInReaderCache = new Map();
        this.builtInExtensions = new Map();
        this.ruleCounter = 0;

        const ids = Object.keys(BUILT_IN_PRESETS) as BuiltInFormatId[];
        for (const id of ids) {
            for (const extension of BUILT_IN_PRESETS[id].extensions) {
                const existing = this.builtInExtensions.get(extension);
                if (existing) {
                    throw new LocterError({ message: `Extension ${extension} is claimed by two built-in formats: ${existing}, ${id}.` });
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

    register(rule: Rule) : FormatRegistration {
        if (
            typeof rule.id !== 'undefined' &&
            hasOwnProperty(BUILT_IN_PRESETS, rule.id)
        ) {
            throw new LocterError({ message: `The id ${rule.id} is reserved by a built-in format.` });
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
    entries() : FormatRegistration[] {
        const output : FormatRegistration[] = this.rules.map(
            (item) => ({
                id: item.id,
                test: item.test,
                builtIn: false,
            }),
        );

        const ids = Object.keys(BUILT_IN_PRESETS) as BuiltInFormatId[];
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
     * and evict every cached reader instance (including a module reader
     * configured via setModuleReader / configure).
     */
    reset() : void {
        this.rules = [];
        this.builtInReaderCache.clear();
        this.ruleCounter = 0;
    }

    async read(input: LocatorInfo | string) : Promise<any> {
        return runTwinAsync(this.readBody(input));
    }

    readSync(input: LocatorInfo | string) : any {
        return runTwinSync(this.readBody(input));
    }

    /**
     * Shared body of read/readSync: dispatch, read, normalize, wrap.
     */
    protected* readBody(input: LocatorInfo | string) : TwinBody<any> {
        const filePath = buildFilePath(input);
        const reader = this.findReader(filePath);
        if (!reader) {
            throw this.unknownExtensionError(filePath);
        }

        try {
            const output = yield* op(
                () => reader.read(filePath),
                () => reader.readSync(filePath),
            );

            return this.toRecord(output, reader);
        } catch (e) {
            throw wrapLoaderError(e, filePath);
        }
    }

    /**
     * The single normalization boundary: every read result becomes a module
     * record (`.default` is always the loaded value, top-level keys stay
     * accessible as named exports). Provenance decides how: module-reader
     * output may legitimately already be a record (`__esModule` is meaningful
     * there); any other reader returns arbitrary parsed data, which is always
     * wrapped — even if it happens to contain an `__esModule` key.
     */
    protected toRecord(output: unknown, reader: IReader) : any {
        if (reader instanceof ModuleReader) {
            return toModuleRecord(output);
        }

        return createModuleRecord(output);
    }

    /**
     * Typed accessor for the LIVE built-in reader instance (lazy, cached).
     */
    builtInReader<K extends BuiltInFormatId>(id: K) : BuiltInReaderOf<K> {
        let reader = this.builtInReaderCache.get(id);
        if (!reader) {
            reader = BUILT_IN_PRESETS[id].reader();
            this.builtInReaderCache.set(id, reader);
        }

        return reader as BuiltInReaderOf<K>;
    }

    /**
     * Dispatch order:
     *   1. bare specifier (no extension)  → module reader, always
     *   2. user rules, registration order → first match wins (can override built-ins)
     *   3. built-in extension table
     *   4. undefined → read/readSync throw LocterUnknownExtensionError
     */
    findReader(input: string) : IReader | undefined {
        if (!isFilePath(input)) {
            return this.builtInReader('module');
        }

        const info = pathToLocatorInfo(input);

        for (const rule of this.rules) {
            const { test } = rule;
            if (Array.isArray(test)) {
                if (
                    info.extension &&
                    test.includes(info.extension)
                ) {
                    return rule.getReader();
                }
            } else {
                // reset before AND after: a g/y regex mutates lastIndex on
                // test(), which would make repeated dispatch alternate and
                // leak state back into the caller-owned RegExp
                test.lastIndex = 0;
                const matched = test.test(buildFilePath(info));
                test.lastIndex = 0;
                if (matched) {
                    return rule.getReader();
                }
            }
        }

        if (info.extension) {
            const id = this.builtInExtensions.get(info.extension);
            if (id) {
                return this.builtInReader(id);
            }
        }

        return undefined;
    }

    protected unknownExtensionError(input: string) : LocterUnknownExtensionError {
        const info = pathToLocatorInfo(input);
        return new LocterUnknownExtensionError({
            message: `No format registered for extension: ${info.extension ?? 'unknown'}`,
            path: input,
        });
    }

    protected compile(id: string, rule: Rule) : CompiledRule {
        const { test, reader } = rule;
        if (typeof reader !== 'function') {
            return {
                id,
                test,
                getReader: () => reader,
            };
        }

        let cached : IReader | undefined;
        return {
            id,
            test,
            getReader: () => {
                if (!cached) {
                    cached = reader();
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
