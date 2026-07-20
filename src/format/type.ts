/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export interface IReader {
    read: (input: string) => Promise<any>,
    readSync: (input: string) => any
}

export interface IWriter {
    write: (path: string, value: unknown) => Promise<void>,
    writeSync: (path: string, value: unknown) => void
}
