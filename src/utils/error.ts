/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty } from './has-property';
import { isObject } from './object';

export function handleException(e: unknown) : void {
    if (e instanceof Error) {
        throw e;
    }

    const error = new Error('Can not process thrown exception.');

    if (isObject(e)) {
        if (
            hasOwnProperty(e, 'message') &&
            typeof e.message === 'string'
        ) {
            error.message = e.message;
        }

        if (
            hasOwnProperty(e, 'stack') &&
            typeof e.stack === 'string'
        ) {
            error.stack = e.stack;
        }
    }

    throw error;
}
