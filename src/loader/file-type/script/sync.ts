/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { LoaderFilterFn, ScriptFileExportItem } from './type';
import { getExportItem } from './utils';
import { LocatorInfo, isLocatorInfo } from '../../../locator';
import { buildLoaderFilePath } from '../../utils';
import { handleFileLoadError } from '../../../utils';

export function loadScriptFileSync(data: LocatorInfo | string) : unknown | undefined {
    const filePath = isLocatorInfo(data) ?
        buildLoaderFilePath(data) :
        data;

    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require,import/no-dynamic-require
        return require(filePath);
    } catch (e) {
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
