/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {LocatorInfo, LocatorOptions} from './type';
import {hasOwnProperty, toArray} from '../utils';

export function buildLocatorOptions(options?: Partial<LocatorOptions>) : LocatorOptions {
    options = options || {};
    options.paths = options.paths || [];
    options.paths = toArray(options.paths);

    options.extensions = options.extensions ?
        toArray(options.extensions) : ['.ts', '.js', '.json'];

    return options as LocatorOptions;
}


export function isLocatorInfo(data: unknown) : data is LocatorInfo {
    if(typeof data !== 'object') {
        return false;
    }

    if(
        !hasOwnProperty(data, 'path') ||
        typeof data.path !== 'string'
    ) {
        return false;
    }

    if(
        !hasOwnProperty(data, 'fileName') ||
        typeof data.fileName !== 'string'
    ) {
        return false;
    }

    if(
        !hasOwnProperty(data, 'fileExtension') ||
        typeof data.fileExtension !== 'string'
    ) {
        return false;
    }

    return true;
}
