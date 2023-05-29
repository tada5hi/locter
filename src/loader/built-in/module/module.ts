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
import {
    buildFilePath,
    buildFilePathWithoutExtension,
    isLocatorInfo,
    pathToLocatorInfo,
} from '../../../locator';
import {
    handleException,
    hasStringProperty, isFilePath,
    isObject,
} from '../../../utils';
import type { Loader } from '../../type';
import type { ModuleLoadOptions } from './type';
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
            if (
                e instanceof SyntaxError ||
                e instanceof ReferenceError
            ) {
                throw e;
            }

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
            if (
                e instanceof SyntaxError ||
                e instanceof ReferenceError
            ) {
                throw e;
            }

            output = this.jiti(input);
        }

        return output;
    }

    // ---------------------------------------------------------------------------

    async load(
        data: LocatorInfo | string,
        options?: ModuleLoadOptions,
    ) : Promise<unknown> {
        options = options || {};
        const [name, locatorInfo] = this.build(data, options);

        try {
            // segmentation fault
            // issue: https://github.com/nodejs/node/issues/35889
            if (isJestRuntimeEnvironment()) {
                // eslint-disable-next-line global-require,import/no-dynamic-require
                return require(name);
            }

            return await import(name);
        } catch (e) {
            /* istanbul ignore next */
            if (
                isObject(e) &&
                hasStringProperty(e, 'code')
            ) {
                if (locatorInfo) {
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
                }

                throw new BaseError({
                    code: e.code,
                    message: hasStringProperty(e, 'message') ? e.message : undefined,
                    stack: hasStringProperty(e, 'stack') ? e.stack : undefined,
                });
            }

            /* istanbul ignore next */
            return handleException(e);
        }
    }

    loadSync(
        data: LocatorInfo | string,
        options?: ModuleLoadOptions,
    ) : unknown {
        options = options || {};
        const [name, locatorInfo] = this.build(data, options);

        try {
            // eslint-disable-next-line global-require,import/no-dynamic-require
            return require(name);
        } catch (e) {
            /* istanbul ignore next */
            if (
                isObject(e) &&
                hasStringProperty(e, 'code')
            ) {
                if (locatorInfo) {
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
                }

                throw new BaseError({
                    code: e.code,
                    message: hasStringProperty(e, 'message') ? e.message : undefined,
                    stack: hasStringProperty(e, 'stack') ? e.stack : undefined,
                });
            }

            return handleException(e);
        }
    }

    private build(
        data: LocatorInfo | string,
        options: ModuleLoadOptions,
    ) : [string, LocatorInfo | undefined] {
        let name : string;
        let locatorInfo : LocatorInfo | undefined;

        options = options || {};

        if (isLocatorInfo(data) || isFilePath(data)) {
            if (typeof data === 'string') {
                locatorInfo = pathToLocatorInfo(data);
            } else {
                locatorInfo = data;
            }

            if (options.withExtension) {
                name = buildFilePath(locatorInfo);
            } else {
                name = buildFilePathWithoutExtension(locatorInfo);
            }

            if (options.withFilePrefix) {
                name = pathToFileURL(name).href;
            }
        } else {
            name = data;
        }

        return [name, locatorInfo];
    }
}
