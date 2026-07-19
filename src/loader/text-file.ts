/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fs from 'node:fs';
import { wrapLoaderError } from '../errors';
import { buildFilePath } from '../locator';
import type { TwinBody } from '../utils/twin';
import { op, runTwinAsync, runTwinSync } from '../utils/twin';
import type { ILoader } from './type';

/**
 * Base class for loaders of text-based file formats: reads the file as
 * UTF-8, delegates to `parse`, and wraps I/O and parse errors in typed
 * LocterError subclasses. Subclasses implement `parse` only — both
 * `execute` variants are derived from the same body.
 */
export abstract class TextFileLoader implements ILoader {
    abstract parse(content: string) : any;

    async execute(input: string) : Promise<any> {
        return runTwinAsync(this.body(input));
    }

    executeSync(input: string) : any {
        return runTwinSync(this.body(input));
    }

    protected* body(input: string) : TwinBody<any> {
        const filePath = buildFilePath(input);

        try {
            const content = yield* op(
                () => fs.promises.readFile(filePath, { encoding: 'utf-8' }),
                () => fs.readFileSync(filePath, { encoding: 'utf-8' }),
            );

            return this.parse(content);
        } catch (e) {
            throw wrapLoaderError(e, filePath);
        }
    }
}
