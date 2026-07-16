/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createJiti } from 'jiti';
import { createRequire } from 'node:module';
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
import type { ILoader } from '../../type';
import { MODULE_FILE_EXTENSIONS } from './constants';
import type {
    ModuleLoadFn,
    ModuleLoadOptions,
    ModuleLoadSyncFn,
    ModuleLoaderOptions,
} from './type';
import { toModuleRecord } from './utils';

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

export class ModuleLoader implements ILoader {
    protected instance : Jiti;

    protected loadFn?: ModuleLoadFn;

    protected loadSyncFn?: ModuleLoadSyncFn;

    constructor(options: ModuleLoaderOptions = {}) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.instance = createJiti(undefined, { extensions: [...MODULE_FILE_EXTENSIONS] });
        this.loadFn = options.load;
        this.loadSyncFn = options.loadSync;
    }

    /**
     * Returns the previous configuration, so callers can restore it.
     */
    configure(options: ModuleLoaderOptions) : ModuleLoaderOptions {
        const previous : ModuleLoaderOptions = {
            load: this.loadFn,
            loadSync: this.loadSyncFn,
        };

        if ('load' in options) {
            this.loadFn = options.load;
        }
        if ('loadSync' in options) {
            this.loadSyncFn = options.loadSync;
        }

        return previous;
    }

    async execute(input: string) {
        let output : any;

        try {
            output = await this.load(input);
        } catch (e) {
            if (isUnrecoverableError(e)) {
                throw e;
            }

            // jiti + ts-node
            // issue: https://github.com/nuxt/bridge/issues/228
            if (isTsNodeRuntimeEnvironment()) {
                output = this.loadSync(input);
            } else {
                output = this.instance(input);
            }
        }

        return toModuleRecord(output);
    }

    executeSync(input: string) {
        let output : any;

        try {
            output = this.loadSync(input);
        } catch (e) {
            if (isUnrecoverableError(e)) {
                throw e;
            }

            output = this.instance(input);
        }

        return toModuleRecord(output);
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
