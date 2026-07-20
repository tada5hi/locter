/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fs from 'node:fs';
import { wrapLoaderError } from '../../errors';
import type { TwinBody } from '../../utils/twin';
import { op, runTwinAsync, runTwinSync } from '../../utils/twin';
import type { IReader } from '../type';

/**
 * Base class for readers of text-based file formats: reads the file as
 * UTF-8, delegates to `parse`, and wraps I/O and parse errors in typed
 * LocterError subclasses. Subclasses implement `parse` only — both
 * `read` variants are derived from the same body.
 */
export abstract class TextFileReader implements IReader {
    abstract parse(content: string) : any;

    async read(input: string) : Promise<any> {
        return runTwinAsync(this.body(input));
    }

    readSync(input: string) : any {
        return runTwinSync(this.body(input));
    }

    protected* body(input: string) : TwinBody<any> {
        try {
            const content = yield* op(
                () => fs.promises.readFile(input, { encoding: 'utf-8' }),
                () => fs.readFileSync(input, { encoding: 'utf-8' }),
            );

            return this.parse(content);
        } catch (e) {
            throw wrapLoaderError(e, input);
        }
    }
}
