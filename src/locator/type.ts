/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type LocatorInfo = {
    path: string,
    name: string,
    extension: '.js' | '.ts' | '.json' | string
};

export type LocatorOptions = {
    path: string | string[],
};
