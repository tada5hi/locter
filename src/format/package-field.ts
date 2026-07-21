/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { LocterError, NotFoundError, WriteError } from '../errors';
import type { LocatorInfo } from '../locator';
import {
    buildFilePath,
    locate,
    locateSync,
    locateUp,
    locateUpSync,
} from '../locator';
import { hasOwnProperty, isObject, isSafeObjectKey } from '../utils';
import type { TwinBody } from '../utils/twin';
import { op, runTwinAsync, runTwinSync } from '../utils/twin';
import { JSONWriter } from './built-in';
import { useFormatRegistry } from './registry';

export type ReadPackageFieldOptions = {
    cwd?: string,
    walkUp?: boolean,
    stopAt?: string,
};

export type WritePackageFieldOptions = ReadPackageFieldOptions;

function extractField<T>(pkg: unknown, field: string) : T | undefined {
    if (!isObject(pkg) || !hasOwnProperty(pkg, field)) {
        return undefined;
    }
    return pkg[field] as T;
}

function* locatePackageBody(
    options: ReadPackageFieldOptions,
) : TwinBody<LocatorInfo | undefined> {
    if (options.walkUp) {
        return yield* op(
            () => locateUp('package.json', { cwd: options.cwd, stopAt: options.stopAt }),
            () => locateUpSync('package.json', { cwd: options.cwd, stopAt: options.stopAt }),
        );
    }

    return yield* op(
        () => locate('package.json', { cwd: options.cwd }),
        () => locateSync('package.json', { cwd: options.cwd }),
    );
}

function* readPackageFieldBody<T>(
    field: string,
    options: ReadPackageFieldOptions,
) : TwinBody<T | undefined> {
    const info = yield* locatePackageBody(options);
    if (!info) {
        return undefined;
    }

    // Read the raw parsed package.json via the built-in JSON reader —
    // not the normalized record read() returns — so synthetic record
    // keys (`default`, `__esModule`) can never resolve as package fields.
    const reader = useFormatRegistry().builtInReader('json');
    const filePath = buildFilePath(info);

    try {
        const pkg = yield* op(
            () => reader.read(filePath),
            () => reader.readSync(filePath),
        );

        return extractField<T>(pkg, field);
    } catch (e) {
        if (e instanceof NotFoundError) {
            return undefined;
        }
        throw e;
    }
}

export async function readPackageField<T = unknown>(
    field: string,
    options: ReadPackageFieldOptions = {},
) : Promise<T | undefined> {
    return runTwinAsync(readPackageFieldBody<T>(field, options));
}

export function readPackageFieldSync<T = unknown>(
    field: string,
    options: ReadPackageFieldOptions = {},
) : T | undefined {
    return runTwinSync(readPackageFieldBody<T>(field, options));
}

function* writePackageFieldBody(
    field: string,
    value: unknown,
    options: WritePackageFieldOptions,
) : TwinBody<void> {
    if (!isSafeObjectKey(field)) {
        throw new LocterError({ message: `The field ${field} is not a safe object key.` });
    }

    const info = yield* locatePackageBody(options);
    if (!info) {
        // unlike the reader, there is nothing sensible to return —
        // a write without a target is an error
        throw new NotFoundError({ message: 'No package.json could be located.' });
    }

    const reader = useFormatRegistry().builtInReader('json');
    const filePath = buildFilePath(info);

    const pkg = yield* op(
        () => reader.read(filePath),
        () => reader.readSync(filePath),
    );

    if (!isObject(pkg)) {
        throw new WriteError({
            message: 'The located package.json does not contain an object.',
            path: filePath,
        });
    }

    pkg[field] = value;

    // dedicated writer instance: keeps the indentation (and the built-in
    // registry writer's configuration untouched)
    const writer = new JSONWriter({ indent: 'auto' });
    yield* op(
        () => writer.write(filePath, pkg),
        () => writer.writeSync(filePath, pkg),
    );
}

/**
 * Set a top-level field of the nearest `package.json` (same locate
 * semantics as readPackageField) and write it back, preserving the
 * file's existing indentation. Passing `undefined` removes the field.
 * Throws NotFoundError when no package.json could be located.
 */
export async function writePackageField(
    field: string,
    value: unknown,
    options: WritePackageFieldOptions = {},
) : Promise<void> {
    return runTwinAsync(writePackageFieldBody(field, value, options));
}

export function writePackageFieldSync(
    field: string,
    value: unknown,
    options: WritePackageFieldOptions = {},
) : void {
    runTwinSync(writePackageFieldBody(field, value, options));
}
