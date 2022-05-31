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
    pattern: string,
    options?: Partial<LocatorOptions>,
) : Promise<LocatorInfo[]> {
    options = buildLocatorOptions(options);

    const items = [];

    for (let i = 0; i < options.paths.length; i++) {
        const files = await globAsync(pattern, {
            absolute: true,
            cwd: options.paths[i],
            nodir: true,
        });

        const element = files.shift();
        if (element) {
            const fileInfo = path.parse(element);

            items.push({
                path: fileInfo.dir.split('/').join(path.sep),
                fileName: fileInfo.name,
                fileExtension: fileInfo.ext,
            });
        }
    }

    return items;
}

export async function locateFile(
    pattern: string,
    options?: Partial<LocatorOptions>,
) : Promise<LocatorInfo | undefined> {
    options = buildLocatorOptions(options);

    for (let i = 0; i < options.paths.length; i++) {
        const files = await globAsync(pattern, {
            absolute: true,
            cwd: options.paths[i],
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

    return undefined;
}
