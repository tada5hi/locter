/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { LocterNotFoundError } from '../errors';
import type { LocatorInfo } from '../locator';
import {
    buildFilePath,
    locate,
    locateSync,
    locateUp,
    locateUpSync,
} from '../locator';
import { hasOwnProperty, isObject } from '../utils';
import type { TwinBody } from '../utils/twin';
import { op, runTwinAsync, runTwinSync } from '../utils/twin';
import { useLoaderRegistry } from './registry';

export type LoadPackageFieldOptions = {
    cwd?: string,
    walkUp?: boolean,
    stopAt?: string,
};

function extractField<T>(pkg: unknown, field: string) : T | undefined {
    if (!isObject(pkg) || !hasOwnProperty(pkg, field)) {
        return undefined;
    }
    return pkg[field] as T;
}

function* loadPackageFieldBody<T>(
    field: string,
    options: LoadPackageFieldOptions,
) : TwinBody<T | undefined> {
    let info : LocatorInfo | undefined;
    if (options.walkUp) {
        info = yield* op(
            () => locateUp('package.json', { cwd: options.cwd, stopAt: options.stopAt }),
            () => locateUpSync('package.json', { cwd: options.cwd, stopAt: options.stopAt }),
        );
    } else {
        info = yield* op(
            () => locate('package.json', { cwd: options.cwd }),
            () => locateSync('package.json', { cwd: options.cwd }),
        );
    }

    if (!info) {
        return undefined;
    }

    // Read the raw parsed package.json via the built-in JSON loader —
    // not the normalized record load() returns — so synthetic record
    // keys (`default`, `__esModule`) can never resolve as package fields.
    const loader = useLoaderRegistry().builtIn('json');
    const filePath = buildFilePath(info);

    try {
        const pkg = yield* op(
            () => loader.execute(filePath),
            () => loader.executeSync(filePath),
        );

        return extractField<T>(pkg, field);
    } catch (e) {
        if (e instanceof LocterNotFoundError) {
            return undefined;
        }
        throw e;
    }
}

export async function loadPackageField<T = unknown>(
    field: string,
    options: LoadPackageFieldOptions = {},
) : Promise<T | undefined> {
    return runTwinAsync(loadPackageFieldBody<T>(field, options));
}

export function loadPackageFieldSync<T = unknown>(
    field: string,
    options: LoadPackageFieldOptions = {},
) : T | undefined {
    return runTwinSync(loadPackageFieldBody<T>(field, options));
}
