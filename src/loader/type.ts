/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { LocatorInfo } from '../locator';

export type Loader = {
    execute: (info: LocatorInfo) => Promise<any>,
    executeSync: (info: LocatorInfo) => any
};

export type Rule = {
    test: RegExp | string[],
    loader: Loader | string
};
