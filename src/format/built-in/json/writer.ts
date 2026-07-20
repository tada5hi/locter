/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TextFileWriter } from '../../text-file';

export type JSONWriterOptions = {
    /**
     * Indentation of the emitted JSON. A number of spaces, a literal
     * indent string, or 'auto' — detect the indentation of the existing
     * target file and keep it (falls back to 4 for new files).
     *
     * @default 4
     */
    indent?: number | string | 'auto'
};

function detectIndent(content: string) : string | undefined {
    const match = /^([ \t]+)\S/m.exec(content);
    return match ? match[1] : undefined;
}

export class JSONWriter extends TextFileWriter {
    protected options : JSONWriterOptions;

    constructor(options: JSONWriterOptions = {}) {
        super();
        this.options = options;
    }

    protected override get usesExistingContent() : boolean {
        return this.options.indent === 'auto';
    }

    stringify(value: unknown, existing?: string) : string {
        let indent : number | string | undefined;
        if (this.options.indent === 'auto') {
            indent = existing ? detectIndent(existing) : undefined;
        } else {
            indent = this.options.indent;
        }

        indent = indent ?? 4;

        const output = JSON.stringify(value, null, indent);
        if (typeof output === 'undefined') {
            throw new Error('The value is not JSON-serializable.');
        }

        return output;
    }
}
