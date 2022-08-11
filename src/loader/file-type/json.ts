/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fs from 'fs';
import { handleFileLoadError } from '../../utils';

export async function loadJsonFile(filePath: string) : Promise<unknown | undefined> {
    try {
        const file = await fs.promises.readFile(filePath);
        return JSON.parse(file.toString('utf-8'));
    } catch (e) {
        return handleFileLoadError(e);
    }
}

export function loadJsonFileSync(filePath: string) : unknown | undefined {
    try {
        const file = fs.readFileSync(filePath);
        return JSON.parse(file.toString('utf-8'));
    } catch (e) {
        return handleFileLoadError(e);
    }
}
