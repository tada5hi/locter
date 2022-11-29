/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { pathToFileURL } from 'url';
import { LocatorInfo, pathToLocatorInfo } from '../../../locator';
import { handleFileLoadError, hasOwnProperty, isObject } from '../../../utils';
import { buildLoaderFilePath } from '../../utils';
import { LoaderFilterFn, ScriptFileExportItem, ScriptFileLoadOptions } from './type';
import { getExportItem } from './utils';

export async function loadScriptFile(
    data: LocatorInfo | string,
    options?: ScriptFileLoadOptions,
) : Promise<unknown | undefined> {
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
            hasOwnProperty(e, 'code')
        ) {
            if (e.code === 'ERR_MODULE_NOT_FOUND' || e.code === 'MODULE_NOT_FOUND') {
                return loadScriptFile(locatorInfo, {
                    ...options,
                    withExtension: true,
                });
            }

            if (e.code === 'ERR_UNSUPPORTED_ESM_URL_SCHEME' || e.code === 'UNSUPPORTED_ESM_URL_SCHEME') {
                return loadScriptFile(locatorInfo, {
                    ...options,
                    withFilePrefix: true,
                });
            }
        }

        /* istanbul ignore next */
        return handleFileLoadError(e);
    }
}

export async function loadScriptFileExport(
    data: LocatorInfo | string,
    filterFn?: LoaderFilterFn,
) : Promise<ScriptFileExportItem | undefined> {
    try {
        const output = await loadScriptFile(data);
        if (typeof output === 'object') {
            return getExportItem(output, filterFn);
        }

        return undefined;
    } catch (e) {
        /* istanbul ignore next */
        return handleFileLoadError(e);
    }
}
