/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { FormatRegistry } from './module';

let instance : FormatRegistry;
export function useFormatRegistry() {
    if (typeof instance !== 'undefined') {
        return instance;
    }

    instance = new FormatRegistry();

    return instance;
}
