/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { glob } from 'glob';
import path from 'path';
import { promisify } from 'util';
import { LocatorInfo, LocatorOptions } from './type';
import { buildLocatorOptions } from './utils';

const globAsync = promisify(glob);

export async function locateFiles(
    pattern: string | string[],
    options?: Partial<LocatorOptions>,
) : Promise<LocatorInfo[]> {
    options = buildLocatorOptions(options);

    const patterns = Array.isArray(pattern) ?
        pattern :
        [pattern];

    const items = [];

    for (let i = 0; i < patterns.length; i++) {
        for (let j = 0; j < options.path.length; j++) {
            const files = await globAsync(patterns[i], {
                absolute: true,
                cwd: options.path[j],
                nodir: true,
            });

            for (let k = 0; k < files.length; k++) {
                const fileInfo = path.parse(files[k]);

                items.push({
                    path: fileInfo.dir.split('/').join(path.sep),
                    fileName: fileInfo.name,
                    fileExtension: fileInfo.ext,
                });
            }
        }
    }

    return items;
}

export async function locateFile(
    pattern: string | string[],
    options?: Partial<LocatorOptions>,
) : Promise<LocatorInfo | undefined> {
    options = buildLocatorOptions(options);

    const patterns = Array.isArray(pattern) ?
        pattern :
        [pattern];

    for (let i = 0; i < patterns.length; i++) {
        for (let j = 0; j < options.path.length; j++) {
            const files = await globAsync(patterns[i], {
                absolute: true,
                cwd: options.path[j],
                nodir: true,
            });

            const element = files.shift();
            if (element) {
                const fileInfo = path.parse(element);

                return {
                    path: fileInfo.dir.split('/').join(path.sep),
                    fileName: fileInfo.name,
                    fileExtension: fileInfo.ext,
                };
            }
        }
    }

    return undefined;
}
