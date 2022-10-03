/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function removeFileNameExtension(
    input: string,
    extensions?: string[],
) {
    if (input.includes('.')) {
        const position = input.lastIndexOf('.');
        const extension = input.substring(
            position,
            input.length,
        );

        if (
            typeof extensions === 'undefined' ||
            extensions.indexOf(extension) !== -1
        ) {
            input = input.substring(0, position);
        }
    }

    return input;
}
