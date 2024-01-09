/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fg from 'fast-glob';
import type { LocatorInfo, LocatorOptions } from './type';
import { buildLocatorOptions, pathToLocatorInfo } from './utils';

export async function locateMany(
    pattern: string | string[],
    options?: Partial<LocatorOptions>,
) : Promise<LocatorInfo[]> {
    options = buildLocatorOptions(options);

    const patterns = Array.isArray(pattern) ?
        pattern :
        [pattern];

    let ignore : string[] | undefined;
    if (options.ignore) {
        ignore = Array.isArray(options.ignore) ? options.ignore : [options.ignore];
    }

    const items : LocatorInfo[] = [];

    for (let i = 0; i < patterns.length; i++) {
        for (let j = 0; j < (options as LocatorOptions).path.length; j++) {
            const files = await fg(patterns[i] as string, {
                absolute: true,
                cwd: (options as LocatorOptions).path[j],
                ignore,
                onlyFiles: true,
            });

            for (let k = 0; k < files.length; k++) {
                items.push(pathToLocatorInfo(files[k] as string, true));
            }
        }
    }

    return items;
}

export async function locate(
    pattern: string | string[],
    options?: Partial<LocatorOptions>,
) : Promise<LocatorInfo | undefined> {
    options = buildLocatorOptions(options);

    const patterns = Array.isArray(pattern) ?
        pattern :
        [pattern];

    let ignore : string[] | undefined;
    if (options.ignore) {
        ignore = Array.isArray(options.ignore) ? options.ignore : [options.ignore];
    }

    for (let i = 0; i < patterns.length; i++) {
        for (let j = 0; j < (options as LocatorOptions).path.length; j++) {
            const files = await fg(patterns[i] as string, {
                absolute: true,
                cwd: (options as LocatorOptions).path[j],
                ignore,
                onlyFiles: true,
            });

            const element = files.shift();
            if (element) {
                return pathToLocatorInfo(element, true);
            }
        }
    }

    return undefined;
}
