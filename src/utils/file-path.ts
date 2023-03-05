/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import path from 'node:path';
import type { LocatorInfo } from '../locator';
import { pathToLocatorInfo } from '../locator';

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
