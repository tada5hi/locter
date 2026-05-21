/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    BaseError,
    type ErrorOptions,
    hasInstanceof,
    markInstanceof,
} from '@ebec/core';

export type LocterErrorOptions = ErrorOptions & {
    path?: string,
};

export type LocterErrorInput = string | LocterErrorOptions;

export const LOCTER_ERROR_MARKER = Symbol.for('@locter/error');

export class LocterError extends BaseError {
    static override [Symbol.hasInstance](input: unknown) : boolean {
        return hasInstanceof(input, LOCTER_ERROR_MARKER);
    }

    public readonly path?: string;

    constructor(input: LocterErrorInput = {}) {
        if (typeof input === 'string') {
            super(input);
        } else {
            const { path, ...rest } = input;
            super(rest);
            this.path = path;
        }

        markInstanceof(this, LOCTER_ERROR_MARKER);
    }
}
