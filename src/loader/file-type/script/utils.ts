/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {hasOwnProperty} from "../../../utils";
import {LoaderFilterFn} from "./type";

export function getRecordItem(
    data: Record<string, any>,
    filterFn: LoaderFilterFn
) : unknown | undefined {
    if (filterFn) {
        const keys = Object.keys(data);
        for (let i = 0; i < keys.length; i++) {
            if (filterFn(keys[i], data[keys[i]])) {
                return data[keys[i]];
            }
        }
    } else {
        return hasOwnProperty(data, 'default') ?
            data.default :
            data;
    }

    /* istanbul ignore next */
    return undefined;
}
