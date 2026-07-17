/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { LoaderRegistry } from './module';

let instance : LoaderRegistry;
export function useLoader() {
    if (typeof instance !== 'undefined') {
        return instance;
    }

    instance = new LoaderRegistry();

    return instance;
}
