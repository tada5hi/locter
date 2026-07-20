/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

// Based on https://github.com/unjs/rc9 (MIT)

import { flatten } from 'flat';
import { isObject } from '../../../utils';
import { TextFileWriter } from '../../text-file';
import { serializeValue } from '../../value';

/**
 * Serializes an object to `key=value` lines (the inverse of ConfReader):
 * nested objects become dot-separated keys, arrays become repeated
 * `key[]=` lines. Round-trips are structural, not textual — comments,
 * blank lines, and line order of an existing file are not preserved,
 * and a string that parses as another type (e.g. '123') reads back as
 * that type.
 */
export class ConfWriter extends TextFileWriter {
    stringify(value: unknown) : string {
        if (!isObject(value)) {
            throw new Error('The value must be an object for the conf format.');
        }

        const flat : Record<string, unknown> = flatten(value, { safe: true });

        const lines : string[] = [];
        for (const key of Object.keys(flat)) {
            const entry = flat[key];
            if (typeof entry === 'undefined') {
                continue;
            }

            if (Array.isArray(entry)) {
                for (const item of entry) {
                    lines.push(`${key}[]=${serializeValue(item)}`);
                }
                continue;
            }

            lines.push(`${key}=${serializeValue(entry)}`);
        }

        return lines.join('\n');
    }
}
