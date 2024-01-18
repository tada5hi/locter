/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from './object';

export function isTypeScriptError(input: unknown) : input is Error {
    if (!isObject(input)) {
        return false;
    }

    if (typeof input.diagnosticCodes !== 'undefined') {
        return true;
    }

    return typeof input.message === 'string' &&
        /TS\d+/.test(input.message);
}
