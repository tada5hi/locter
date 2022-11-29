/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import isFileEsm from 'is-file-esm';
import { pathToFileURL } from 'url';
import { getExportItem } from './utils';
import { LoaderFilterFn, ScriptFileExportItem } from './type';
import { LocatorInfo, pathToLocatorInfo } from '../../../locator';
import { buildLoaderFilePath } from '../../utils';
import { handleFileLoadError } from '../../../utils';

export async function loadScriptFile(data: LocatorInfo | string) : Promise<unknown | undefined> {
    let locatorInfo : LocatorInfo;
    let filePath : string;

    if (typeof data === 'string') {
        filePath = data;
        locatorInfo = pathToLocatorInfo(data);
    } else {
        filePath = buildLoaderFilePath(data, true);
        locatorInfo = data;
    }

    try {
        if (['.js', '.mjs', '.cjs'].indexOf(locatorInfo.extension) !== -1) {
            const check = await isFileEsm(filePath);
            /* istanbul ignore next */
            if (check.esm) {
                return await import(pathToFileURL(filePath).href);
            }
        }

        return await import(filePath);
    } catch (e) {
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
