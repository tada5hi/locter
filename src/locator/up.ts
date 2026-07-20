/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import type { TwinBody } from '../utils/twin';
import { runTwinAsync, runTwinSync } from '../utils/twin';
import { locateBody } from './core';
import type { LocatorInfo, LocatorOptionsInput } from './types';

export type LocatorUpOptionsInput = Omit<LocatorOptionsInput, 'cwd'> & {
    cwd?: string,
    stopAt?: string,
};

type WalkStep = {
    current: string,
    stopAt: string,
    baseOptions: Omit<LocatorOptionsInput, 'cwd'>,
};

function startWalk(options: LocatorUpOptionsInput) : WalkStep {
    const {
        cwd,
        stopAt,
        ...baseOptions
    } = options;
    const current = path.resolve(cwd ?? process.cwd());
    const ceiling = stopAt ?
        path.resolve(current, stopAt) :
        path.parse(current).root;

    return {
        current,
        stopAt: ceiling,
        baseOptions,
    };
}

function nextDirectory(current: string, stopAt: string) : string | undefined {
    if (current === stopAt) {
        return undefined;
    }

    const parent = path.dirname(current);
    if (parent === current) {
        return undefined;
    }

    return parent;
}

function* locateUpBody(
    pattern: string | string[],
    options: LocatorUpOptionsInput,
) : TwinBody<LocatorInfo | undefined> {
    let walk = startWalk(options);

    while (true) {
        const found = yield* locateBody(pattern, { ...walk.baseOptions, cwd: walk.current });
        if (found) {
            return found;
        }

        const next = nextDirectory(walk.current, walk.stopAt);
        if (!next) {
            return undefined;
        }

        walk = { ...walk, current: next };
    }
}

export async function locateUp(
    pattern: string | string[],
    options: LocatorUpOptionsInput = {},
) : Promise<LocatorInfo | undefined> {
    return runTwinAsync(locateUpBody(pattern, options));
}

export function locateUpSync(
    pattern: string | string[],
    options: LocatorUpOptionsInput = {},
) : LocatorInfo | undefined {
    return runTwinSync(locateUpBody(pattern, options));
}
