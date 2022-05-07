/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {getRecordItem} from "./utils";
import {LoaderFilterFn} from "./type";
import {isLocatorInfo, LocatorInfo} from "../../../locator";
import {buildLoaderFilePath} from "../../utils";

export async function loadScriptFile(data: LocatorInfo |string) : Promise<unknown | undefined> {
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
) : Promise<unknown | undefined> {
    const filePath = isLocatorInfo(data) ?
        buildLoaderFilePath(data) :
        data;

    try {
        const data = await loadScriptFile(filePath);

        return getRecordItem(data, filterFn);
    } catch (e) {
        /* istanbul ignore next */
        return undefined
    }
}
