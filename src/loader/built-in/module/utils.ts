/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BaseError } from 'ebec';
import type { LoaderFilterFn, ModuleExport } from './type';

export function isJestRuntimeEnvironment() : boolean {
    return process.env &&
        process.env.JEST_WORKER_ID !== undefined;
}

export function isTsNodeRuntimeEnvironment() : boolean {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return !!process[Symbol.for('ts-node.register.instance')];
}

export function getModuleExport(
    data: Record<string, any>,
    filterFn?: LoaderFilterFn,
): ModuleExport {
    if (filterFn) {
        const keys = Object.keys(data);
        for (let i = 0; i < keys.length; i++) {
            if (filterFn(keys[i] as string, data[keys[i] as string])) {
                return {
                    key: keys[i] as string,
                    value: data[keys[i] as string],
                };
            }
        }

        throw new BaseError('Cannot find specific module export.');
    }

    if (
        // eslint-disable-next-line no-underscore-dangle
        typeof data.__esModule !== 'undefined' &&
        typeof data.default !== 'undefined'
    ) {
        return {
            key: 'default',
            value: data.default,
        };
    }

    return {
        key: 'default',
        value: data,
    };
}
