/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { runTwinSync } from '../utils/twin';
import { locateBody, locateManyBody } from './core';
import type { LocatorInfo, LocatorOptionsInput } from './types';

export function locateManySync(
    pattern: string | string[],
    options?: LocatorOptionsInput,
) : LocatorInfo[] {
    return runTwinSync(locateManyBody(pattern, options));
}

export function locateSync(
    pattern: string | string[],
    options?: LocatorOptionsInput,
) : LocatorInfo | undefined {
    return runTwinSync(locateBody(pattern, options));
}
