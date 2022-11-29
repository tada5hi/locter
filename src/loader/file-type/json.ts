/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fs from 'fs';
import { LocatorInfo } from '../../locator';
import { handleFileLoadError } from '../../utils';
import { buildLoaderFilePath } from '../utils';

export async function loadJsonFile(info: LocatorInfo) : Promise<unknown | undefined> {
    const filePath = buildLoaderFilePath(info, true);

    try {
        const file = await fs.promises.readFile(filePath);
        return JSON.parse(file.toString('utf-8'));
    } catch (e) {
        return handleFileLoadError(e);
    }
}

export function loadJsonFileSync(info: LocatorInfo) : unknown | undefined {
    const filePath = buildLoaderFilePath(info, true);

    try {
        const file = fs.readFileSync(filePath);
        return JSON.parse(file.toString('utf-8'));
    } catch (e) {
        return handleFileLoadError(e);
    }
}
