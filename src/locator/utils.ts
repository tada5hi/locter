/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import { isObject, toArray } from '../utils';
import type { LocatorInfo, LocatorOptions } from './type';

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
    if (
        !skipResolve &&
        !path.isAbsolute(input)
    ) {
        input = path.resolve(process.cwd(), input);
    }

    const info = path.parse(input);

    return {
        path: info.dir.split('/').join(path.sep),
        name: info.name,
        extension: info.ext,
    };
}

export function isLocatorInfo(
    input: unknown,
) : input is LocatorInfo {
    return isObject(input) &&
        typeof input.path === 'string' &&
        typeof input.name === 'string' &&
        typeof input.extension === 'string';
}

export function buildFilePath(input: LocatorInfo | string) {
    if (typeof input === 'string') {
        return input;
    }

    if (input.extension) {
        return path.join(input.path, input.name) + input.extension;
    }

    return path.join(input.path, input.name);
}

export function buildFilePathWithoutExtension(input: LocatorInfo | string) {
    let info: LocatorInfo;

    if (typeof input === 'string') {
        info = pathToLocatorInfo(input);
    } else {
        info = input;
    }

    return path.join(info.path, info.name);
}
