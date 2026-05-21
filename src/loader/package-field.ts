/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { LocterNotFoundError } from '../errors';
import type { LocatorInfo } from '../locator';
import {
    locate,
    locateSync,
    locateUp,
    locateUpSync,
} from '../locator';
import { hasOwnProperty, isObject } from '../utils';
import { load, loadSync } from './helpers';

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

export async function loadPackageField<T = unknown>(
    field: string,
    options: LoadPackageFieldOptions = {},
) : Promise<T | undefined> {
    let info: LocatorInfo | undefined;
    if (options.walkUp) {
        info = await locateUp('package.json', {
            cwd: options.cwd,
            stopAt: options.stopAt,
        });
    } else {
        info = await locate('package.json', { cwd: options.cwd });
    }

    if (!info) {
        return undefined;
    }

    try {
        const pkg = await load(info);
        return extractField<T>(pkg, field);
    } catch (e) {
        if (e instanceof LocterNotFoundError) {
            return undefined;
        }
        throw e;
    }
}

export function loadPackageFieldSync<T = unknown>(
    field: string,
    options: LoadPackageFieldOptions = {},
) : T | undefined {
    let info: LocatorInfo | undefined;
    if (options.walkUp) {
        info = locateUpSync('package.json', {
            cwd: options.cwd,
            stopAt: options.stopAt,
        });
    } else {
        info = locateSync('package.json', { cwd: options.cwd });
    }

    if (!info) {
        return undefined;
    }

    try {
        const pkg = loadSync(info);
        return extractField<T>(pkg, field);
    } catch (e) {
        if (e instanceof LocterNotFoundError) {
            return undefined;
        }
        throw e;
    }
}
