/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty, isObject } from '../../../utils';
import type { LoaderFilterFn, ModuleExport } from './type';

type ESModule = { [key: string]: any, __esModule: boolean };

/**
 * Detect the transpiler interop marker (`__esModule`). Only meaningful for
 * values that came out of a module system — arbitrary parsed data can carry
 * an `__esModule` key without being a module, so callers must decide by
 * provenance whether this check applies (see LoaderRegistry).
 */
export function isESModule(input: unknown) : input is ESModule {
    return isObject(input) &&
        typeof input.__esModule !== 'undefined';
}

/**
 * Wrap an arbitrary value in a frozen module record: enumerable keys are
 * re-exposed as named exports and `default` is the value itself.
 */
export function createModuleRecord(data: unknown) {
    const output = Object.create(null, {
        __esModule: { value: true },
        [Symbol.toStringTag]: { value: 'Module' },
    });

    if (isObject(data)) {
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

/**
 * Normalize module-loader output to a module record. Values already carrying
 * the `__esModule` marker pass through (module provenance makes the marker
 * trustworthy); everything else is wrapped via createModuleRecord.
 *
 * https://2ality.com/2017/01/babel-esm-spec-mode.html
 */
export function toModuleRecord(
    data: unknown,
) {
    if (isESModule(data)) {
        // @see https://github.com/testing-library/user-event/issues/813
        // @see https://stackoverflow.com/questions/62717394/export-default-class-exports-double-nested-default
        if (
            isESModule(data.default) &&
            data.default.default
        ) {
            return {
                ...data,
                default: data.default.default,
            };
        }

        return data;
    }

    return createModuleRecord(data);
}

export function getModuleExport(
    data: Record<string, any>,
    filterFn: LoaderFilterFn,
): ModuleExport | undefined {
    const keys = Object.keys(data);
    for (const key of keys) {
        if (filterFn(key as string, data[key as string])) {
            return {
                key: key as string,
                value: data[key as string],
            };
        }
    }

    return undefined;
}
