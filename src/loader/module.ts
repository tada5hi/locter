/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { LocatorInfo } from '../locator';
import {
    loadJsonFile, loadJsonFileSync, loadScriptFile, loadScriptFileSync,
} from './file-type';
import { buildLoaderFilePath } from './utils';

export async function loadFile(info: LocatorInfo) : Promise<unknown | undefined> {
    if (!info) {
        return undefined;
    }

    const filePath = buildLoaderFilePath(info);

    if (info.extension === '.json') {
        return loadJsonFile(filePath);
    }

    return loadScriptFile(filePath);
}

export function loadFileSync(info: LocatorInfo) : unknown | undefined {
    if (!info) {
        return undefined;
    }

    const filePath = buildLoaderFilePath(info);

    if (info.extension === '.json') {
        return loadJsonFileSync(filePath);
    }

    return loadScriptFileSync(filePath);
}
