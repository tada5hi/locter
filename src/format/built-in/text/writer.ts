/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TextFileWriter } from '../../text-file';

/**
 * Raw text: accepts strings only — coercing arbitrary values would be
 * lossy ([object Object]); serialize explicitly (e.g. serializeValue)
 * before writing. Output ends with a single trailing newline, like
 * every text writer.
 */
export class TextWriter extends TextFileWriter {
    stringify(value: unknown) : string {
        if (typeof value !== 'string') {
            throw new Error('The value must be a string for the text format.');
        }

        return value;
    }
}
