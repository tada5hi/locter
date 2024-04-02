/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fg from 'fast-glob';
import type { LocatorInfo, LocatorOptionsInput } from './types';
import { buildLocatorOptions, pathToLocatorInfo } from './utils';

export async function locateMany(
    pattern: string | string[],
    options?: LocatorOptionsInput,
) : Promise<LocatorInfo[]> {
    const opts = buildLocatorOptions(options);

    const patterns = Array.isArray(pattern) ?
        pattern :
        [pattern];

    if (patterns.length === 0) {
        patterns.push('*');
    }

    let ignore : string[] | undefined;
    if (opts.ignore) {
        ignore = Array.isArray(opts.ignore) ? opts.ignore : [opts.ignore];
    }

    const items : LocatorInfo[] = [];

    for (let i = 0; i < patterns.length; i++) {
        for (let j = 0; j < opts.path.length; j++) {
            const files = await fg(patterns[i], {
                absolute: true,
                cwd: opts.path[j],
                ignore,
                onlyFiles: opts.onlyFiles,
                onlyDirectories: opts.onlyDirectories,
            });

            for (let k = 0; k < files.length; k++) {
                items.push(pathToLocatorInfo(files[k], true));
            }
        }
    }

    return items;
}

export async function locate(
    pattern: string | string[],
    options?: LocatorOptionsInput,
) : Promise<LocatorInfo | undefined> {
    const opts = buildLocatorOptions(options);

    const patterns = Array.isArray(pattern) ?
        pattern :
        [pattern];

    let ignore : string[] | undefined;
    if (opts.ignore) {
        ignore = Array.isArray(opts.ignore) ? opts.ignore : [opts.ignore];
    }

    for (let i = 0; i < patterns.length; i++) {
        for (let j = 0; j < opts.path.length; j++) {
            const files = await fg(patterns[i], {
                absolute: true,
                cwd: opts.path[j],
                ignore,
                onlyFiles: opts.onlyFiles,
                onlyDirectories: opts.onlyDirectories,
            });

            const element = files.shift();
            if (element) {
                return pathToLocatorInfo(element, true);
            }
        }
    }

    return undefined;
}
