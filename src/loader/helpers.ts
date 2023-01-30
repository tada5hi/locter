/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { LocatorInfo, pathToLocatorInfo } from '../locator';
import { useLoaderManager } from './singleton';

export async function loadFile(input: LocatorInfo | string) : Promise<unknown> {
    let info : LocatorInfo;
    if (typeof input === 'string') {
        info = pathToLocatorInfo(input);
    } else {
        info = input;
    }

    const manager = useLoaderManager();

    return manager.execute(info);
}

export function loadFileSync(input: LocatorInfo | string) : unknown {
    let info : LocatorInfo;
    if (typeof input === 'string') {
        info = pathToLocatorInfo(input);
    } else {
        info = input;
    }

    const manager = useLoaderManager();

    return manager.executeSync(info);
}
