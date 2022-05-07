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
    if (
        !filterFn &&
        hasOwnProperty(data, 'default')
    ) {
        return data.default;
    }

    const keys = Object.keys(data);
    for (let i = 0; i < keys.length; i++) {
        if (
            filterFn &&
            filterFn(keys[i], data[keys[i]])
        ) {
            return data[keys[i]];
        }
    }

    if (keys.length > 0) {
        return data[keys[0]];
    }

    return undefined;
}
