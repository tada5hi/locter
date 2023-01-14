/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import { LocatorInfo, LocatorOptions } from './type';
import { toArray } from '../utils';

export function buildLocatorOptions(options?: Partial<LocatorOptions>) : LocatorOptions {
    options = options || {};

    options.path = options.path || [];
    options.path = toArray(options.path);
    if (options.path.length === 0) {
        options.path.push(process.cwd());
    }

    options.ignore ??= [];

    return options as LocatorOptions;
}

export function pathToLocatorInfo(
    input: string,
    skipResolve?: boolean,
) : LocatorInfo {
    if (!skipResolve && !path.isAbsolute(input)) {
        input = path.resolve(process.cwd(), input);
    }

    const info = path.parse(input);

    return {
        path: info.dir.split('/').join(path.sep),
        name: info.name,
        extension: info.ext,
    };
}
