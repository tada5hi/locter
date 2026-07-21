/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasStringProperty, isObject } from '../utils';
import { LocterError } from './base';
import { LoadError } from './load';
import { NotFoundError } from './not-found';
import { WriteError } from './write';

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
        return new NotFoundError({
            message,
            code,
            cause: input,
            path,
        });
    }

    return new LoadError({
        message,
        code,
        cause: input,
        path,
    });
}

export function wrapWriteError(input: unknown, path: string) : LocterError {
    if (input instanceof LocterError) {
        return input;
    }

    const code = isObject(input) && hasStringProperty(input, 'code') ?
        input.code :
        undefined;

    const message = isObject(input) && hasStringProperty(input, 'message') ?
        input.message :
        `Failed to write: ${path}`;

    return new WriteError({
        message,
        code,
        cause: input,
        path,
    });
}
