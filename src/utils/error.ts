/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/* istanbul ignore next */
export function handleFileLoadError(e: unknown) : undefined {
    if (e instanceof Error) {
        throw e;
    }

    if (typeof e === 'string') {
        throw new Error(e);
    }

    return undefined;
}