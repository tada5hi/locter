/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import { isObject, toArray } from '../utils';
import type { LocatorInfo, LocatorOptions, LocatorOptionsInput } from './types';

export function buildLocatorPatterns(pattern: string | string[]) : string[] {
    return Array.isArray(pattern) ?
        pattern :
        [pattern];
}

export function buildLocatorOptions(options: LocatorOptionsInput = {}) : LocatorOptions {
    const paths = options.path ?
        toArray(options.path) :
        [];

    const ignore = options.ignore ?
        toArray(options.ignore) :
        [];

    if (paths.length === 0) {
        paths.push(process.cwd());
    }

    let onlyFiles : boolean;
    let onlyDirectories : boolean;

    if (options.onlyDirectories === options.onlyFiles) {
        onlyDirectories = false;
        onlyFiles = !options.onlyDirectories;
    } else if (typeof options.onlyFiles === 'undefined') {
        onlyDirectories = options.onlyDirectories ?? false;
        onlyFiles = !options.onlyDirectories;
    } else {
        onlyFiles = options.onlyFiles ?? true;
        onlyDirectories = !options.onlyFiles;
    }

    return {
        path: paths,
        ignore,
        onlyDirectories,
        onlyFiles,
    };
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
        extension: info.ext ?
            info.ext :
            undefined,
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
