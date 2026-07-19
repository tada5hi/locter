/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fg from 'fast-glob';
import type { TwinBody } from '../utils/twin';
import { op } from '../utils/twin';
import type { LocatorInfo, LocatorOptionsInput } from './types';
import { buildLocatorOptions, buildLocatorPatterns, pathToLocatorInfo } from './utils';

type GlobJob = {
    pattern: string,
    options: fg.Options,
};

function buildGlobJobs(
    pattern: string | string[],
    options?: LocatorOptionsInput,
) : GlobJob[] {
    const patterns = buildLocatorPatterns(pattern);
    const opts = buildLocatorOptions(options);

    const jobs : GlobJob[] = [];
    for (const p of patterns) {
        for (const cwd of opts.cwd) {
            jobs.push({
                pattern: p,
                options: {
                    absolute: true,
                    cwd,
                    ignore: opts.ignore,
                    onlyFiles: opts.onlyFiles,
                    onlyDirectories: opts.onlyDirectories,
                    dot: opts.dot,
                },
            });
        }
    }

    return jobs;
}

function* glob(job: GlobJob) : Generator<any, string[], any> {
    return yield* op(
        () => fg(job.pattern, job.options),
        () => fg.sync(job.pattern, job.options),
    );
}

export function* locateBody(
    pattern: string | string[],
    options?: LocatorOptionsInput,
) : TwinBody<LocatorInfo | undefined> {
    for (const job of buildGlobJobs(pattern, options)) {
        const files = yield* glob(job);

        const element = files.shift();
        if (element) {
            return pathToLocatorInfo(element, true);
        }
    }

    return undefined;
}

export function* locateManyBody(
    pattern: string | string[],
    options?: LocatorOptionsInput,
) : TwinBody<LocatorInfo[]> {
    const items : LocatorInfo[] = [];

    for (const job of buildGlobJobs(pattern, options)) {
        const files = yield* glob(job);

        for (const file of files) {
            items.push(pathToLocatorInfo(file, true));
        }
    }

    return items;
}
