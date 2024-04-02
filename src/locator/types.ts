/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type LocatorInfo = {
    path: string,
    name: string,
    extension: string,
};

export type LocatorOptions = {
    path: string[],
    ignore: string[],
    onlyFiles: boolean,
    onlyDirectories: boolean
};

export type LocatorOptionsInput = Partial<Omit<LocatorOptions, 'path' | 'ignore'>> & {
    path?: string | string[],
    ignore?: string | string[],
};
