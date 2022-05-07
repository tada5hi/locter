/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getExportItem } from './utils';
import { LoaderFilterFn, ScriptFileExportItem } from './type';
import { LocatorInfo, isLocatorInfo } from '../../../locator';
import { buildLoaderFilePath } from '../../utils';

export async function loadScriptFile(data: LocatorInfo | string) : Promise<unknown | undefined> {
    const filePath = isLocatorInfo(data) ?
        buildLoaderFilePath(data) :
        data;

    try {
        return await import(filePath);
    } catch (e) {
        /* istanbul ignore next */
        return undefined;
    }
}

export async function loadScriptFileExport(
    data: LocatorInfo | string,
    filterFn?: LoaderFilterFn,
) : Promise<ScriptFileExportItem | undefined> {
    const filePath = isLocatorInfo(data) ?
        buildLoaderFilePath(data) :
        data;

    try {
        const data = await loadScriptFile(filePath);

        return getExportItem(data, filterFn);
    } catch (e) {
        /* istanbul ignore next */
        return undefined;
    }
}
