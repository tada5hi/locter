/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BaseError, type ErrorOptions } from '@ebec/core';

export type LocterErrorOptions = ErrorOptions & {
    path?: string,
};

export type LocterErrorInput = string | LocterErrorOptions;

export class LocterError extends BaseError {
    public readonly path?: string;

    constructor(input: LocterErrorInput = {}) {
        if (typeof input === 'string') {
            super(input);
            return;
        }

        const { path, ...rest } = input;
        super(rest);
        this.path = path;
    }
}
