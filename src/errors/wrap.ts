/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasStringProperty, isObject } from '../utils';
import { LocterError } from './base';
import { LocterLoadError } from './load';
import { LocterNotFoundError } from './not-found';

const NOT_FOUND_CODES = new Set([
    'ENOENT',
    'MODULE_NOT_FOUND',
    'ERR_MODULE_NOT_FOUND',
]);

export function wrapLoaderError(input: unknown, path: string) : LocterError {
    if (input instanceof LocterError) {
        return input;
    }

    const code = isObject(input) && hasStringProperty(input, 'code') ?
        input.code :
        undefined;

    const message = isObject(input) && hasStringProperty(input, 'message') ?
        input.message :
        `Failed to load: ${path}`;

    if (code && NOT_FOUND_CODES.has(code)) {
        return new LocterNotFoundError({
            message,
            code,
            cause: input,
            path,
        });
    }

    return new LocterLoadError({
        message,
        code,
        cause: input,
        path,
    });
}
