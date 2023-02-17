/*
 * Copyright (c) 2022-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fs from 'node:fs';
import { handleFileLoadError } from '../../../utils';
import type { Loader } from '../../type';
import { buildLoaderFilePath } from '../../utils';

export class JSONLoader implements Loader {
    async execute(input: string) {
        const filePath = buildLoaderFilePath(input, true);

        try {
            const file = await fs.promises.readFile(filePath);
            return JSON.parse(file.toString('utf-8'));
        } catch (e) {
            return handleFileLoadError(e);
        }
    }

    executeSync(input: string) {
        const filePath = buildLoaderFilePath(input, true);

        try {
            const file = fs.readFileSync(filePath);
            return JSON.parse(file.toString('utf-8'));
        } catch (e) {
            return handleFileLoadError(e);
        }
    }
}
