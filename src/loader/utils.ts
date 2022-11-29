/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'path';
import { LocatorInfo } from '../locator';

export function buildLoaderFilePath(info: LocatorInfo, withExtension?: boolean) {
    if (withExtension) {
        return path.join(info.path, info.name) + info.extension;
    }

    return path.join(info.path, info.name);
}
