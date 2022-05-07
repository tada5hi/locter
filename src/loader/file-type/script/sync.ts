/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {LoaderFilterFn} from "./type";
import {getRecordItem} from "./utils";
import {isLocatorInfo, LocatorInfo} from "../../../locator";
import {buildLoaderFilePath} from "../../utils";

export function loadScriptFileSync(data: LocatorInfo | string) : unknown | undefined {
    const filePath = isLocatorInfo(data) ?
        buildLoaderFilePath(data) :
        data;

    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require,import/no-dynamic-require
        return require(filePath);
    } catch (e) {
        return undefined;
    }
}

export function loadScriptFileSingleExportSync(
    data: LocatorInfo | string,
    filterFn?: LoaderFilterFn,
) : unknown | undefined {
    const filePath = isLocatorInfo(data) ?
        buildLoaderFilePath(data) :
        data;

    try {
        const data = loadScriptFileSync(filePath);

        return getRecordItem(data, filterFn);
    } catch (e) {
        return undefined
    }
}
