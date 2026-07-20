/*
 * Copyright (c) 2022-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

// Based on https://github.com/unjs/rc9 (MIT)

import { destr } from 'destr';
import { unflatten } from 'flat';
import { isSafeObjectKey } from '../../../utils';
import { TextFileLoader } from '../../text-file';

export class ConfLoader extends TextFileLoader {
    parse(contents: string): Record<string, any> {
        const config: Record<string, any> = {};

        const lines = contents.split(/\n|\r|\r\n/);

        for (const line of lines) {
            const match = line.match(/^\s*([^\s=]+)\s*=\s*(.*)?\s*$/);
            if (!match) {
                continue;
            }

            const key = match[1];
            const rawValue = match[2];

            if (!key || !isSafeObjectKey(key)) {
                continue;
            }

            const value = destr(rawValue ? rawValue.trim() : '');

            if (key.endsWith('[]')) {
                const arrKey = key.slice(0, Math.max(0, key.length - 2));
                config[arrKey] = (config[arrKey] || []).concat(value);
                continue;
            }

            config[key] = value;
        }

        return unflatten(config, { overwrite: true });
    }
}
