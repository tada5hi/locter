/*
 * Copyright (c) 2022-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

// Based on https://github.com/unjs/rc9 (MIT)

import destr from 'destr';
import flat from 'flat';
import fs from 'node:fs';
import { buildFilePath } from '../../../locator';
import { handleException, isSafeObjectKey } from '../../../utils';
import type { Loader } from '../../type';

export class ConfLoader implements Loader {
    async execute(input: string) {
        const filePath = buildFilePath(input);

        try {
            const file = await fs.promises.readFile(filePath, { encoding: 'utf-8' });

            return this.parse(file);
        } catch (e) {
            return handleException(e);
        }
    }

    executeSync(input: string) {
        const filePath = buildFilePath(input);

        try {
            const file = fs.readFileSync(filePath, { encoding: 'utf-8' });

            return this.parse(file);
        } catch (e) {
            return handleException(e);
        }
    }

    parse(contents: string): Record<string, any> {
        const config: Record<string, any> = {};

        const lines = contents.split(/\n|\r|\r\n/);

        for (let i = 0; i < lines.length; i++) {
            const match = lines[i].match(/^\s*([^\s=]+)\s*=\s*(.*)?\s*$/);
            if (!match) {
                continue;
            }

            // Key
            const key = match[1];

            if (!key || !isSafeObjectKey(key)) {
                continue;
            }

            const value = destr(match[2].trim() /* val */);

            if (key.endsWith('[]')) {
                const arrKey = key.slice(0, Math.max(0, key.length - 2));
                config[arrKey] = (config[arrKey] || []).concat(value);
                continue;
            }

            config[key] = value;
        }

        return flat.unflatten(config, { overwrite: true });
    }
}
