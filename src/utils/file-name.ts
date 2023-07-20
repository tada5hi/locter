/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';

export function getFileNameExtension(
    input: string,
    allowed?: string[],
) : string | undefined {
    const extension = path.extname(input);
    if (extension === '' || extension === '.') {
        return undefined;
    }

    if (
        typeof allowed === 'undefined' ||
        allowed.indexOf(extension) !== -1
    ) {
        return extension;
    }

    return undefined;
}

export function removeFileNameExtension(
    input: string,
    extensions?: string[],
) {
    const extension = getFileNameExtension(input, extensions);
    if (extension) {
        return input.substring(0, input.length - extension.length);
    }

    return input;
}
