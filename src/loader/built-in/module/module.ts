/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BaseError } from 'ebec';
import type { JITI } from 'jiti';
import createJITI from 'jiti';
import { pathToFileURL } from 'node:url';
import type { LocatorInfo } from '../../../locator';
import { pathToLocatorInfo } from '../../../locator';
import { handleFileLoadError, hasStringProperty, isObject } from '../../../utils';
import type { Loader } from '../../type';
import { buildLoaderFilePath } from '../../utils';
import type { ScriptFileLoadOptions } from './type';
import { isJestRuntimeEnvironment, isTsNodeRuntimeEnvironment } from './utils';

export class ModuleLoader implements Loader {
    protected jiti : JITI;

    constructor() {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.jiti = createJITI(undefined, {
            extensions: ['.js', '.mjs', '.mts', '.cjs', '.cts', '.ts'],
        });
    }

    async execute(input: string) {
        let output : any;

        try {
            output = await this.load(input);
        } catch (e) {
            // jiti + ts-node
            // issue: https://github.com/nuxt/bridge/issues/228
            if (isTsNodeRuntimeEnvironment()) {
                output = this.loadSync(input);
            } else {
                output = this.jiti(input);
            }
        }

        return output;
    }

    executeSync(input: string) {
        let output : any;

        try {
            output = this.loadSync(input);
        } catch (e) {
            output = this.jiti(input);
        }

        return output;
    }

    // ---------------------------------------------------------------------------

    async load(
        data: LocatorInfo | string,
        options?: ScriptFileLoadOptions,
    ) : Promise<unknown> {
        let locatorInfo : LocatorInfo;

        if (typeof data === 'string') {
            locatorInfo = pathToLocatorInfo(data);
        } else {
            locatorInfo = data;
        }

        options = options || {};

        let filePath = buildLoaderFilePath(locatorInfo, options.withExtension);
        if (options.withFilePrefix) {
            filePath = pathToFileURL(filePath).href;
        }

        try {
            // segmentation fault
            // issue: https://github.com/nodejs/node/issues/35889
            if (isJestRuntimeEnvironment()) {
                // eslint-disable-next-line global-require,import/no-dynamic-require
                return require(filePath);
            }

            return await import(filePath);
        } catch (e) {
            /* istanbul ignore next */
            if (
                isObject(e) &&
                hasStringProperty(e, 'code')
            ) {
                if (
                    !options.withExtension &&
                    (
                        e.code === 'ERR_MODULE_NOT_FOUND' ||
                        e.code === 'MODULE_NOT_FOUND'
                    )
                ) {
                    return this.load(locatorInfo, {
                        ...options,
                        withExtension: true,
                    });
                }

                if (
                    !options.withFilePrefix &&
                    (
                        e.code === 'ERR_UNSUPPORTED_ESM_URL_SCHEME' ||
                        e.code === 'UNSUPPORTED_ESM_URL_SCHEME'
                    )
                ) {
                    return this.load(locatorInfo, {
                        ...options,
                        withFilePrefix: true,
                    });
                }

                throw new BaseError({
                    code: e.code,
                    message: hasStringProperty(e, 'message') ? e.message : undefined,
                    stack: hasStringProperty(e, 'stack') ? e.stack : undefined,
                });
            }

            /* istanbul ignore next */
            return handleFileLoadError(e);
        }
    }

    loadSync(
        data: LocatorInfo | string,
        options?: ScriptFileLoadOptions,
    ) : unknown {
        let locatorInfo : LocatorInfo;

        if (typeof data === 'string') {
            locatorInfo = pathToLocatorInfo(data);
        } else {
            locatorInfo = data;
        }

        options = options || {};

        const filePath = buildLoaderFilePath(locatorInfo, options.withExtension);

        try {
            // eslint-disable-next-line global-require,import/no-dynamic-require
            return require(filePath);
        } catch (e) {
            /* istanbul ignore next */
            if (
                isObject(e) &&
                hasStringProperty(e, 'code')
            ) {
                if (
                    !options.withExtension &&
                    (
                        e.code === 'ERR_MODULE_NOT_FOUND' ||
                        e.code === 'MODULE_NOT_FOUND'
                    )
                ) {
                    return this.loadSync(locatorInfo, {
                        ...options,
                        withExtension: true,
                    });
                }

                throw new BaseError({
                    code: e.code,
                    message: hasStringProperty(e, 'message') ? e.message : undefined,
                    stack: hasStringProperty(e, 'stack') ? e.stack : undefined,
                });
            }

            return handleFileLoadError(e);
        }
    }
}
