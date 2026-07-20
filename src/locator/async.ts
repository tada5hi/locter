/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { runTwinAsync } from '../utils/twin';
import { locateBody, locateManyBody } from './core';
import type { LocatorInfo, LocatorOptionsInput } from './types';

export async function locateMany(
    pattern: string | string[],
    options?: LocatorOptionsInput,
) : Promise<LocatorInfo[]> {
    return runTwinAsync(locateManyBody(pattern, options));
}

export async function locate(
    pattern: string | string[],
    options?: LocatorOptionsInput,
) : Promise<LocatorInfo | undefined> {
    return runTwinAsync(locateBody(pattern, options));
}
