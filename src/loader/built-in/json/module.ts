/*
 * Copyright (c) 2022-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TextFileLoader } from '../../text-file';

export class JSONLoader extends TextFileLoader {
    parse(content: string) {
        return JSON.parse(content);
    }
}
