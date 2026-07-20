/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TextFileReader } from '../../text-file';

/**
 * Raw text: the file content, as-is. No value coercion — a .txt
 * containing '123' reads as the string '123' (use deserializeValue
 * for lenient value semantics).
 */
export class TextReader extends TextFileReader {
    parse(content: string) {
        return content;
    }
}
