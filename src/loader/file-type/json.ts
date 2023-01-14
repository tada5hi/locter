/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fs from 'node:fs';
import path from 'node:path';
import { LocatorInfo } from '../../locator';
import { handleFileLoadError } from '../../utils';
import { buildLoaderFilePath } from '../utils';

export async function loadJsonFile(input: LocatorInfo | string) : Promise<unknown> {
    let filePath : string;

    if (typeof input === 'string') {
        filePath = path.isAbsolute(input) ? input : path.resolve(process.cwd(), input);
    } else {
        filePath = buildLoaderFilePath(input, true);
    }

    try {
        const file = await fs.promises.readFile(filePath);
        return JSON.parse(file.toString('utf-8'));
    } catch (e) {
        return handleFileLoadError(e);
    }
}

export function loadJsonFileSync(input: LocatorInfo | string) : unknown {
    let filePath : string;

    if (typeof input === 'string') {
        filePath = path.isAbsolute(input) ? input : path.resolve(process.cwd(), input);
    } else {
        filePath = buildLoaderFilePath(input, true);
    }

    try {
        const file = fs.readFileSync(filePath);
        return JSON.parse(file.toString('utf-8'));
    } catch (e) {
        return handleFileLoadError(e);
    }
}
