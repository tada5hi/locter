/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fg from 'fast-glob';
import type { LocatorInfo, LocatorOptionsInput } from './types';
import { buildLocatorOptions, buildLocatorPatterns, pathToLocatorInfo } from './utils';

export function locateManySync(
    pattern: string | string[],
    options?: LocatorOptionsInput,
) : LocatorInfo[] {
    const patterns = buildLocatorPatterns(pattern);
    const opts = buildLocatorOptions(options);

    const items : LocatorInfo[] = [];

    for (let i = 0; i < patterns.length; i++) {
        for (let j = 0; j < opts.path.length; j++) {
            const files = fg.sync(patterns[i], {
                absolute: true,
                cwd: opts.path[j],
                ignore: opts.ignore,
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

export function locateSync(
    pattern: string | string[],
    options?: LocatorOptionsInput,
) : LocatorInfo | undefined {
    const patterns = buildLocatorPatterns(pattern);
    const opts = buildLocatorOptions(options);

    for (let i = 0; i < patterns.length; i++) {
        for (let j = 0; j < opts.path.length; j++) {
            const files = fg.sync(patterns[i] as string, {
                absolute: true,
                cwd: opts.path[j],
                ignore: opts.ignore,
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
