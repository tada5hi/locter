/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createJiti } from 'jiti';
import type { JitiOptions } from 'jiti';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { LocterError, wrapLoaderError } from '../../../errors';
import type { LocatorInfo } from '../../../locator';
import {
    buildFilePath,
    isLocatorInfo,
} from '../../../locator';
import {
    hasStringProperty,
    isFilePath,
    isJestRuntimeEnvironment,
    isObject,
    isTsNodeRuntimeEnvironment,
    isTypeScriptError,
} from '../../../utils';
import type { IReader } from '../../types';
import { MODULE_FILE_EXTENSIONS } from './constants';
import type {
    ModuleLoadFn,
    ModuleLoadOptions,
    ModuleLoadSyncFn,
    ModuleReaderOptions,
    ModuleReaderStrategy,
} from './types';

const require = createRequire(import.meta.url);

type Jiti = ReturnType<typeof createJiti>;

function originalPath(data: LocatorInfo | string) : string {
    return typeof data === 'string' ? data : buildFilePath(data);
}

function isUnrecoverableError(error: unknown) : boolean {
    const underlying = error instanceof LocterError ? error.cause : error;

    return underlying instanceof SyntaxError ||
        underlying instanceof ReferenceError ||
        isTypeScriptError(underlying);
}

const TYPESCRIPT_FILE = /\.[cm]?ts$/;

const STACK_FRAME = /^\s*at (?:async )?(?:.*? \((.*)\)|(.*))$/;

/**
 * The file of each stack frame (without line, column and query), e.g.
 * 'node:internal/modules/esm/utils', '/app/entity.ts' or '<anonymous>'.
 */
function readStackFiles(stack: unknown) : string[] {
    if (typeof stack !== 'string') {
        return [];
    }

    const files : string[] = [];
    const lines = stack.split('\n');

    for (const line of lines) {
        const match = STACK_FRAME.exec(line);
        const location = match ? (match[1] ?? match[2] ?? '').trim() : '';

        if (location) {
            let file = location.replace(/(:\d+){1,2}$/, '');

            if (file.startsWith('file://')) {
                try {
                    file = fileURLToPath(file.replace(/[?#].*$/, ''));
                } catch {
                    // keep the url
                }
            }

            files.push(file);
        }
    }

    return files;
}

function isNodeFrame(file: string) : boolean {
    return file.startsWith('node:');
}

/**
 * Whether Node raised the error while loading (parsing, stripping) the
 * module graph, before any of its code ran. Such an error carries only
 * Node's own frames and those of the code which asked for the module
 * (locter and its callers, i.e. the current call stack). An error raised
 * while a module runs (JSON.parse, a SyntaxError it throws, a call to
 * stripTypeScriptTypes, a failing dynamic import in its body) carries a
 * frame of that module. Without frames (Error.stackTraceLimit = 0) the
 * error is not attributed to loading.
 */
function isLoadingError(error: Error) : boolean {
    const files = readStackFiles(error.stack);

    if (files.length === 0 || !isNodeFrame(files[0] as string)) {
        return false;
    }

    const callers = new Set(readStackFiles(new Error('caller').stack));

    return files.every((file) => isNodeFrame(file) ||
        file === '<anonymous>' ||
        file === 'native' ||
        callers.has(file));
}

/**
 * Node (23.6+) strips TypeScript types itself. Valid TypeScript it can not
 * strip fails to load with a SyntaxError, although jiti can load it:
 *
 * - ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX: enums, parameter properties,
 *   namespaces.
 * - No code: syntax that stripping leaves behind, i.e. decorators. The
 *   error does not name its file, so it only counts for a TypeScript file
 *   read while Node strips types (it may come from a file it imports).
 *
 * Either only counts when Node raised it while loading, not when a module
 * threw it while running (see isLoadingError): a retry would run that
 * module a second time. Invalid TypeScript (ERR_INVALID_TYPESCRIPT_SYNTAX)
 * stays unrecoverable.
 */
function isTypeStrippingError(error: unknown, input: string) : boolean {
    const underlying = error instanceof LocterError ? error.cause : error;

    if (!(underlying instanceof SyntaxError)) {
        return false;
    }

    const code = isObject(underlying) && hasStringProperty(underlying, 'code') ?
        underlying.code :
        undefined;

    if (code === 'ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX') {
        return isLoadingError(underlying);
    }

    return typeof code === 'undefined' &&
        !!process.features.typescript &&
        TYPESCRIPT_FILE.test(input) &&
        isLoadingError(underlying);
}

/**
 * Absolute or explicitly relative ('./', '../') paths. Anything else, even
 * with an extension ('pkg/feature.js'), is a package specifier and must
 * resolve like one (Node semantics).
 */
function isFileSystemPath(input: string) : boolean {
    return path.isAbsolute(input) || /^\.\.?([\\/]|$)/.test(input);
}

/**
 * File system paths are made absolute (jiti resolves relative ones from
 * its own base), package specifiers are passed through.
 */
function toTranspileId(input: string) : string {
    return isFileSystemPath(input) ? path.resolve(input) : input;
}

type CachedModule = {
    filename?: string,
    loaded?: boolean,
    parent?: CachedModule | null,
};

function toRealPath(input: string) : string {
    try {
        return fs.realpathSync(input);
    } catch {
        return input;
    }
}

/**
 * Remove what a failed retry of `entry` left in require.cache: entries
 * added since `before` which never finished loading and were loaded on
 * behalf of `entry` (their parent chain leads to it). Modules other code
 * loaded meanwhile, finished or still loading, stay. jiti, unlike Node's
 * own loader, does not remove them itself.
 */
function removeFailedModules(before: Set<string>, entry: string) : void {
    const entries = new Set([entry, toRealPath(entry)]);
    const keys = Object.keys(require.cache);

    for (const key of keys) {
        const cached = require.cache[key] as CachedModule | undefined;

        if (before.has(key) || !cached || cached.loaded) {
            continue;
        }

        const seen = new Set<CachedModule>();
        let current : CachedModule | null | undefined = cached;

        while (current && !seen.has(current)) {
            if (current.filename && entries.has(current.filename)) {
                delete require.cache[key];

                break;
            }

            seen.add(current);
            current = current.parent;
        }
    }
}

function validateOptions(options: ModuleReaderOptions) : void {
    const strategy = options.strategy ?? 'native';

    if (strategy !== 'native' && strategy !== 'transpile') {
        throw new LocterError({ message: `Unknown module reader strategy: ${String(strategy)} (expected 'native' or 'transpile').` });
    }

    if (strategy === 'native' && options.cache === false) {
        throw new LocterError({ message: 'The module reader option cache: false requires strategy: \'transpile\' (native imports cannot be loaded fresh).' });
    }

    if (
        strategy === 'transpile' &&
        (typeof options.load !== 'undefined' || typeof options.loadSync !== 'undefined')
    ) {
        throw new LocterError({ message: 'The module reader options load/loadSync require strategy: \'native\'.' });
    }
}

export class ModuleReader implements IReader {
    /**
     * The transpiling loader, built lazily from the current options and
     * dropped whenever they change.
     */
    protected instance?: Jiti;

    protected strategy?: ModuleReaderStrategy;

    protected cache?: boolean;

    protected transpileCache?: boolean | string;

    protected alias?: Record<string, string>;

    protected loadFn?: ModuleLoadFn;

    protected loadSyncFn?: ModuleLoadSyncFn;

    constructor(options: ModuleReaderOptions = {}) {
        validateOptions(options);

        this.strategy = options.strategy;
        this.cache = options.cache;
        this.transpileCache = options.transpileCache;
        this.alias = options.alias;
        this.loadFn = options.load;
        this.loadSyncFn = options.loadSync;
    }

    /**
     * The only place locter's options are translated to the transpiling
     * loader's (jiti) options; its types never reach the public API.
     */
    protected useInstance() : Jiti {
        if (!this.instance) {
            const options : JitiOptions = { extensions: [...MODULE_FILE_EXTENSIONS] };

            if (typeof this.cache !== 'undefined') {
                options.moduleCache = this.cache;
            }

            if (typeof this.transpileCache !== 'undefined') {
                options.fsCache = this.transpileCache;
            }

            if (typeof this.alias !== 'undefined') {
                options.alias = this.alias;
            }

            this.instance = createJiti(undefined as unknown as string, options);
        }

        return this.instance;
    }

    /**
     * Returns the previous configuration, so callers can restore it.
     */
    configure(options: ModuleReaderOptions) : ModuleReaderOptions {
        const previous : ModuleReaderOptions = {
            strategy: this.strategy,
            cache: this.cache,
            transpileCache: this.transpileCache,
            alias: this.alias,
            load: this.loadFn,
            loadSync: this.loadSyncFn,
        };

        const next : ModuleReaderOptions = { ...previous };
        const keys = Object.keys(previous) as (keyof ModuleReaderOptions)[];

        for (const key of keys) {
            if (key in options) {
                (next as Record<string, unknown>)[key] = options[key];
            }
        }

        // validate the merged result BEFORE mutating: a rejected
        // configuration leaves the reader untouched
        validateOptions(next);

        if (
            next.cache !== this.cache ||
            next.transpileCache !== this.transpileCache ||
            next.alias !== this.alias
        ) {
            this.instance = undefined;
        }

        this.strategy = next.strategy;
        this.cache = next.cache;
        this.transpileCache = next.transpileCache;
        this.alias = next.alias;
        this.loadFn = next.load;
        this.loadSyncFn = next.loadSync;

        return previous;
    }

    /**
     * Returns the raw module value (import / require / jiti output) —
     * normalization to a module record happens once, at the
     * FormatRegistry boundary.
     *
     * read/readSync are deliberately NOT derived from a shared body
     * (unlike every other sync/async twin in this package): their
     * recovery paths differ. The async variant falls back to loadSync
     * under ts-node (jiti's async path does not cooperate with ts-node)
     * and to the jiti instance otherwise; the sync variant only has the
     * jiti fallback. The divergence is pinned by the fallback tests in
     * test/unit/format/module.spec.ts.
     *
     * With strategy 'transpile' both variants load file system paths
     * (absolute, or relative with './' / '../') through the
     * transpiling loader only, without native import()/require() and
     * without any fallback. Package specifiers (incl. subpaths such as
     * 'pkg/feature.js') are read like
     * under 'native', so they resolve from the same base (locter's own
     * location) instead of the working directory. The async variant imports ESM packages natively (one shared
     * instance with the host); the sync variant resolves the `require`
     * condition, so a dual package may load as a separate CJS instance there.
     */
    async read(input: string) {
        if (this.strategy === 'transpile' && isFileSystemPath(input)) {
            try {
                return await this.useInstance().import(path.resolve(input));
            } catch (e) {
                throw wrapLoaderError(e, input);
            }
        }

        try {
            return await this.load(input);
        } catch (e) {
            if (isTypeStrippingError(e, input)) {
                return this.readTranspiled(input);
            }

            if (isUnrecoverableError(e)) {
                throw e;
            }

            // jiti + ts-node
            // issue: https://github.com/nuxt/bridge/issues/228
            if (isTsNodeRuntimeEnvironment()) {
                return this.loadSync(input);
            }

            return this.useInstance()(input);
        }
    }

    readSync(input: string) {
        if (this.strategy === 'transpile' && isFileSystemPath(input)) {
            try {
                return this.useInstance()(path.resolve(input));
            } catch (e) {
                throw wrapLoaderError(e, input);
            }
        }

        try {
            return this.loadSync(input);
        } catch (e) {
            if (isTypeStrippingError(e, input)) {
                return this.readTranspiledSync(input);
            }

            if (isUnrecoverableError(e)) {
                throw e;
            }

            return this.useInstance()(input);
        }
    }

    /**
     * The jiti retry after a type stripping error. Its error is wrapped
     * like a native one, so a real syntax error (e.g. in a JavaScript file
     * the TypeScript file imports) still surfaces as a LoadError.
     *
     * A failed retry leaves the modules it registered in require.cache
     * (jiti does not remove them, unlike Node's own loader), so a later
     * native require() would return the half-evaluated module instead of
     * the error. Those entries are removed again (see removeFailedModules).
     */
    protected async readTranspiled(input: string) : Promise<unknown> {
        const id = toTranspileId(input);
        const before = new Set(Object.keys(require.cache));

        try {
            return await this.useInstance().import(id);
        } catch (e) {
            removeFailedModules(before, id);

            throw wrapLoaderError(e, input);
        }
    }

    protected readTranspiledSync(input: string) : unknown {
        const id = toTranspileId(input);
        const before = new Set(Object.keys(require.cache));

        try {
            return this.useInstance()(id);
        } catch (e) {
            removeFailedModules(before, id);

            throw wrapLoaderError(e, input);
        }
    }

    // ---------------------------------------------------------------------------

    async load(
        data: LocatorInfo | string,
        options: ModuleLoadOptions = {},
    ) : Promise<unknown> {
        const id = this.build(data, options);

        try {
            if (this.loadFn) {
                return await this.loadFn(id);
            }

            // segmentation fault
            // issue: https://github.com/nodejs/node/issues/35889
            if (isJestRuntimeEnvironment()) {
                return require(id);
            }

            return await import(id);
        } catch (e) {
            /* istanbul ignore next */
            if (
                !options.withFilePrefix &&
                isObject(e) &&
                hasStringProperty(e, 'code') &&
                (
                    e.code === 'ERR_UNSUPPORTED_ESM_URL_SCHEME' ||
                    e.code === 'UNSUPPORTED_ESM_URL_SCHEME'
                )
            ) {
                return this.load(data, {
                    ...options,
                    withFilePrefix: true,
                });
            }

            throw wrapLoaderError(e, originalPath(data));
        }
    }

    loadSync(
        data: LocatorInfo | string,
        options: ModuleLoadOptions = {},
    ) : unknown {
        const id = this.build(data, options);

        try {
            if (this.loadSyncFn) {
                return this.loadSyncFn(id);
            }

            return require(id);
        } catch (e) {
            throw wrapLoaderError(e, originalPath(data));
        }
    }

    private build(
        data: LocatorInfo | string,
        options: ModuleLoadOptions = {},
    ) : string {
        if (isLocatorInfo(data) || isFilePath(data)) {
            if (typeof data !== 'string') {
                data = buildFilePath(data);
            }

            if (options.withFilePrefix) {
                data = pathToFileURL(data).href;
            }
        }

        return data;
    }
}
