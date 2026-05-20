/*
 * Copyright (c) 2022-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { parse } from 'yaml';
import fs from 'node:fs';
import { wrapLoaderError } from '../../../errors';
import { buildFilePath } from '../../../locator';
import type { Loader } from '../../type';

export class YAMLLoader implements Loader {
    async execute(input: string) {
        const filePath = buildFilePath(input);

        try {
            const file = await fs.promises.readFile(filePath, { encoding: 'utf-8' });
            return parse(file);
        } catch (e) {
            throw wrapLoaderError(e, filePath);
        }
    }

    executeSync(input: string) {
        const filePath = buildFilePath(input);

        try {
            const file = fs.readFileSync(filePath, { encoding: 'utf-8' });
            return parse(file);
        } catch (e) {
            throw wrapLoaderError(e, filePath);
        }
    }
}
