/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { sync as globSync } from 'glob';
import { LocatorInfo, LocatorOptions } from './type';
import { buildLocatorOptions, pathToLocatorInfo } from './utils';

export function locateFilesSync(
    pattern: string | string[],
    options?: Partial<LocatorOptions>,
) : LocatorInfo[] {
    options = buildLocatorOptions(options);

    const patterns = Array.isArray(pattern) ?
        pattern :
        [pattern];

    const items : LocatorInfo[] = [];

    for (let i = 0; i < patterns.length; i++) {
        for (let j = 0; j < options.path.length; j++) {
            const files = globSync(patterns[i], {
                absolute: true,
                cwd: options.path[j],
                nodir: true,
                ignore: options.ignore,
            });

            for (let k = 0; k < files.length; k++) {
                items.push(pathToLocatorInfo(files[k], true));
            }
        }
    }

    return items;
}

export function locateFileSync(
    pattern: string | string[],
    options?: Partial<LocatorOptions>,
) : LocatorInfo | undefined {
    options = buildLocatorOptions(options);

    const patterns = Array.isArray(pattern) ?
        pattern :
        [pattern];

    for (let i = 0; i < patterns.length; i++) {
        for (let j = 0; j < options.path.length; j++) {
            const files = globSync(patterns[i], {
                absolute: true,
                cwd: options.path[j],
                nodir: true,
                ignore: options.ignore,
            });

            const element = files.shift();
            if (element) {
                return pathToLocatorInfo(element, true);
            }
        }
    }

    return undefined;
}
