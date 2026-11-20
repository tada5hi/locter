/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createJiti } from 'jiti';
import type { JitiOptions } from 'jiti';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
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

/**
 * Absolute or explicitly relative ('./', '../') paths. Anything else, even
 * with an extension ('pkg/feature.js'), is a package specifier and must
 * resolve like one (Node semantics).
 */
function isFileSystemPath(input: string) : boolean {
    return path.isAbsolute(input) || /^\.\.?([\\/]|$)/.test(input);
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
            if (isUnrecoverableError(e)) {
                throw e;
            }

            return this.useInstance()(input);
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
