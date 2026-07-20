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
    const cwd = options.cwd ?
        toArray(options.cwd) :
        [];

    const ignore = options.ignore ?
        toArray(options.ignore) :
        [];

    if (cwd.length === 0) {
        cwd.push(process.cwd());
    }

    // precedence: an explicit `onlyDirectories: true` wins over `onlyFiles`
    // (which defaults to true); when neither restricts, everything matches
    const onlyDirectories = options.onlyDirectories ?? false;
    const onlyFiles = onlyDirectories ?
        false :
        options.onlyFiles ?? true;

    return {
        cwd,
        ignore,
        onlyDirectories,
        onlyFiles,
        dot: options.dot ?? false,
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
    const directory = info.dir.split('/').join(path.sep);
    const extension = info.ext ? info.ext : undefined;
    const filePath = extension ?
        path.join(directory, info.name) + extension :
        path.join(directory, info.name);

    return {
        directory,
        name: info.name,
        extension,
        path: filePath,
    };
}

export function isLocatorInfo(
    input: unknown,
) : input is LocatorInfo {
    return isObject(input) &&
        typeof input.directory === 'string' &&
        typeof input.name === 'string' &&
        (typeof input.extension === 'undefined' || typeof input.extension === 'string') &&
        typeof input.path === 'string';
}

export function buildFilePath(input: LocatorInfo | string) {
    if (typeof input === 'string') {
        return input;
    }

    return input.path;
}
