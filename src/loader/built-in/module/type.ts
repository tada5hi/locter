/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type LoaderFilterFn = (key: string, value: unknown) => boolean;

export type ScriptFileExportItem = {
    key: string,
    value: unknown
};

export type ScriptFileLoadOptions = {
    withExtension?: boolean,
    withFilePrefix?: boolean
};