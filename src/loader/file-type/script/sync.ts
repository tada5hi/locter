/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BaseError } from 'ebec';
import { LoaderFilterFn, ScriptFileExportItem, ScriptFileLoadOptions } from './type';
import { getExportItem } from './utils';
import { LocatorInfo, isLocatorInfo, pathToLocatorInfo } from '../../../locator';
import { buildLoaderFilePath } from '../../utils';
import {
    handleFileLoadError, hasStringProperty, isObject,
} from '../../../utils';

export function loadScriptFileSync(
    data: LocatorInfo | string,
    options?: ScriptFileLoadOptions,
) : unknown | undefined {
    let locatorInfo : LocatorInfo;

    if (typeof data === 'string') {
        locatorInfo = pathToLocatorInfo(data);
    } else {
        locatorInfo = data;
    }

    options = options || {};

    const filePath = buildLoaderFilePath(locatorInfo, options.withExtension);

    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require,import/no-dynamic-require
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
                return loadScriptFileSync(locatorInfo, {
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

export function loadScriptFileExportSync(
    data: LocatorInfo | string,
    filterFn?: LoaderFilterFn,
) : ScriptFileExportItem | undefined {
    const filePath = isLocatorInfo(data) ?
        buildLoaderFilePath(data) :
        data;

    try {
        const data = loadScriptFileSync(filePath);

        if (typeof data === 'object') {
            return getExportItem(data, filterFn);
        }

        return undefined;
    } catch (e) {
        return handleFileLoadError(e);
    }
}