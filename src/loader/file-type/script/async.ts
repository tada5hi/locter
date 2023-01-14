/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BaseError } from 'ebec';
import { pathToFileURL } from 'node:url';
import { LocatorInfo, pathToLocatorInfo } from '../../../locator';
import {
    handleFileLoadError, hasStringProperty, isObject,
} from '../../../utils';
import { buildLoaderFilePath } from '../../utils';
import { LoaderFilterFn, ScriptFileExportItem, ScriptFileLoadOptions } from './type';
import { getExportItem } from './utils';

export async function loadScriptFile(
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
                return loadScriptFile(locatorInfo, {
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
                return loadScriptFile(locatorInfo, {
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

export async function loadScriptFileExport(
    data: LocatorInfo | string,
    filterFn?: LoaderFilterFn,
) : Promise<ScriptFileExportItem> {
    const output = await loadScriptFile(data);

    if (typeof output === 'object' && !!output) {
        return getExportItem(output, filterFn);
    }

    throw new BaseError('Cannot extract specific module export');
}
