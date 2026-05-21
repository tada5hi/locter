/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import { locate } from './async';
import { locateSync } from './sync';
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
    const current = path.resolve(options.cwd ?? process.cwd());
    const stopAt = options.stopAt ?
        path.resolve(options.stopAt) :
        path.parse(current).root;

    const baseOptions: Omit<LocatorOptionsInput, 'cwd'> = {
        ignore: options.ignore,
        onlyFiles: options.onlyFiles,
        onlyDirectories: options.onlyDirectories,
        dot: options.dot,
    };

    return {
        current,
        stopAt,
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

export async function locateUp(
    pattern: string | string[],
    options: LocatorUpOptionsInput = {},
) : Promise<LocatorInfo | undefined> {
    let walk = startWalk(options);

    while (true) {
        const found = await locate(pattern, { ...walk.baseOptions, cwd: walk.current });
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

export function locateUpSync(
    pattern: string | string[],
    options: LocatorUpOptionsInput = {},
) : LocatorInfo | undefined {
    let walk = startWalk(options);

    while (true) {
        const found = locateSync(pattern, { ...walk.baseOptions, cwd: walk.current });
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
