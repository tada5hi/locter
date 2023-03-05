/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BaseError } from 'ebec';
import { hasOwnProperty } from '../utils';
import type { LoaderFilterFn, ScriptFileExportItem } from './built-in';

export function getExportItem(
    data: Record<string, any>,
    filterFn?: LoaderFilterFn,
): ScriptFileExportItem {
    if (filterFn) {
        const keys = Object.keys(data);
        for (let i = 0; i < keys.length; i++) {
            if (filterFn(keys[i] as string, data[keys[i] as string])) {
                return {
                    key: keys[i] as string,
                    value: data[keys[i] as string],
                };
            }
        }

        throw new BaseError('Cannot find specific module export.');
    }

    return {
        key: 'default',
        value: hasOwnProperty(data, 'default') ? data.default : data,
    };
}
