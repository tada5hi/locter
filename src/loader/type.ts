/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type Loader = {
    execute: (input: string) => Promise<any>,
    executeSync: (input: string) => any
};

export type Rule = {
    test: RegExp | string[],
    loader: Loader | string
};
