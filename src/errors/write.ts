/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasInstanceof, markInstanceof } from '@ebec/core';
import { LocterError, type LocterErrorInput } from './base';

export const LOCTER_WRITE_ERROR_MARKER = Symbol.for('@locter/write-error');

export class WriteError extends LocterError {
    static override [Symbol.hasInstance](input: unknown) : boolean {
        return hasInstanceof(input, LOCTER_WRITE_ERROR_MARKER);
    }

    constructor(input: LocterErrorInput = {}) {
        super(input);
        markInstanceof(this, LOCTER_WRITE_ERROR_MARKER);
    }
}
