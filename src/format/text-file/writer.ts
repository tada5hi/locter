/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fs from 'node:fs';
import path from 'node:path';
import { wrapWriteError } from '../../errors';
import type { TwinBody } from '../../utils/twin';
import { op, runTwinAsync, runTwinSync } from '../../utils/twin';
import type { IWriter } from '../type';

function isNotFound(e: unknown) : boolean {
    return e instanceof Error && 'code' in e && e.code === 'ENOENT';
}

/**
 * Base class for writers of text-based file formats: serializes via
 * `stringify`, creates missing parent directories, writes the file as
 * UTF-8 (always terminated by a single trailing newline), and wraps
 * failures in WriteError. Subclasses implement `stringify` only —
 * both `write` variants are derived from the same body.
 */
export abstract class TextFileWriter implements IWriter {
    /**
     * Opt-in: when true, the body reads the target file first (undefined
     * if absent) and passes its content to `stringify` as `existing` —
     * the hook behind format-preserving write-back (YAML comment
     * grafting, JSON indent detection).
     */
    protected get usesExistingContent() : boolean {
        return false;
    }

    abstract stringify(value: unknown, existing?: string) : string;

    async write(input: string, value: unknown) : Promise<void> {
        return runTwinAsync(this.body(input, value));
    }

    writeSync(input: string, value: unknown) : void {
        runTwinSync(this.body(input, value));
    }

    protected* body(input: string, value: unknown) : TwinBody<void> {
        const filePath = input;

        try {
            let existing : string | undefined;
            if (this.usesExistingContent) {
                existing = yield* op(
                    () => fs.promises.readFile(filePath, { encoding: 'utf-8' })
                        .catch((e) => {
                            if (isNotFound(e)) {
                                return undefined;
                            }
                            throw e;
                        }),
                    () => {
                        try {
                            return fs.readFileSync(filePath, { encoding: 'utf-8' });
                        } catch (e) {
                            if (isNotFound(e)) {
                                return undefined;
                            }
                            throw e;
                        }
                    },
                );
            }

            let content = this.stringify(value, existing);
            if (!content.endsWith('\n')) {
                content += '\n';
            }

            const directory = path.dirname(filePath);
            yield* op(
                async () => {
                    await fs.promises.mkdir(directory, { recursive: true });
                },
                () => {
                    fs.mkdirSync(directory, { recursive: true });
                },
            );

            yield* op(
                () => fs.promises.writeFile(filePath, content, { encoding: 'utf-8' }),
                () => fs.writeFileSync(filePath, content, { encoding: 'utf-8' }),
            );
        } catch (e) {
            throw wrapWriteError(e, filePath);
        }
    }
}
