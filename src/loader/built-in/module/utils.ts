/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty, isObject } from '../../../utils';
import type { LoaderFilterFn, ModuleExport } from './type';

type ESModule = { [key: string]: any, __esModule: boolean };
export function isESModule(input: unknown) : input is ESModule {
    return isObject(input) &&
        // eslint-disable-next-line no-underscore-dangle
        typeof input.__esModule !== 'undefined';
}

// https://2ality.com/2017/01/babel-esm-spec-mode.html
export function toModuleRecord(
    data: unknown,
) {
    if (isESModule(data)) {
        return data;
    }

    const output = Object.create(null, {
        __esModule: {
            value: true,
        },
        [Symbol.toStringTag]: {
            value: 'Module',
        },
    });

    if (isObject(data)) {
        // eslint-disable-next-line no-restricted-syntax
        for (const key in data) {
            if (hasOwnProperty(output, key)) {
                continue;
            }

            let descriptor = Object.getOwnPropertyDescriptor(data, key);
            if (
                !descriptor ||
                ('get' in descriptor || descriptor.writable || descriptor.configurable)
            ) {
                descriptor = {
                    enumerable: true,
                    get() {
                        return data[key];
                    },
                };
            }

            Object.defineProperty(output, key, descriptor);
        }
    }

    if (!hasOwnProperty(output, 'default')) {
        Object.defineProperty(output, 'default', {
            value: data,
            enumerable: true,
        });
    }

    return Object.freeze(output);
}

export function getModuleExport(
    data: Record<string, any>,
    filterFn: LoaderFilterFn,
): ModuleExport | undefined {
    const keys = Object.keys(data);
    for (let i = 0; i < keys.length; i++) {
        if (filterFn(keys[i] as string, data[keys[i] as string])) {
            return {
                key: keys[i] as string,
                value: data[keys[i] as string],
            };
        }
    }

    return undefined;
}
