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

    for (const p of patterns) {
        for (const cwd of opts.cwd) {
            const files = fg.sync(p, {
                absolute: true,
                cwd,
                ignore: opts.ignore,
                onlyFiles: opts.onlyFiles,
                onlyDirectories: opts.onlyDirectories,
                dot: opts.dot,
            });

            for (const file of files) {
                items.push(pathToLocatorInfo(file, true));
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

    for (const p of patterns) {
        for (const cwd of opts.cwd) {
            const files = fg.sync(p, {
                absolute: true,
                cwd,
                ignore: opts.ignore,
                onlyFiles: opts.onlyFiles,
                onlyDirectories: opts.onlyDirectories,
                dot: opts.dot,
            });

            const element = files.shift();
            if (element) {
                return pathToLocatorInfo(element, true);
            }
        }
    }

    return undefined;
}
