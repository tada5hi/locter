/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BaseError } from 'ebec';
import { LoaderFilterFn, ScriptFileExportItem, ScriptFileLoadOptions } from './type';
import { getExportItem } from './utils';
import { LocatorInfo, pathToLocatorInfo } from '../../../locator';
import { buildLoaderFilePath } from '../../utils';
import {
    handleFileLoadError, hasStringProperty, isObject,
} from '../../../utils';

export function loadScriptFileSync(
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
) : ScriptFileExportItem {
    const output = loadScriptFileSync(data);

    if (typeof output === 'object' && !!output) {
        return getExportItem(output, filterFn);
    }

    throw new BaseError('Cannot extract specific module export');
}
