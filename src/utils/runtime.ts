/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function isJestRuntimeEnvironment() : boolean {
    return process.env &&
        process.env.JEST_WORKER_ID !== undefined;
}

export function isVitestRuntimeEnvironment() : boolean {
    return typeof process !== 'undefined' &&
        process.env.VITEST === 'true';
}

export function isTsNodeRuntimeEnvironment(): boolean {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return !!process[Symbol.for('ts-node.register.instance')];
}

// matches the bare `tsx` specifier (node --import tsx), optionally with a
// subpath (tsx/esm), as well as resolved paths into the tsx package
// (.../node_modules/tsx/dist/loader.mjs)
const TSX_MARKER_REGEX = /(?:^|=|[\\/])tsx(?:$|[\\/])/;

export function isTsxRuntimeEnvironment() : boolean {
    if (typeof process === 'undefined') {
        return false;
    }

    if (
        Array.isArray(process.execArgv) &&
        process.execArgv.some((arg) => TSX_MARKER_REGEX.test(arg))
    ) {
        return true;
    }

    const { _preload_modules: preloadModules } = process as unknown as { _preload_modules?: string[] };

    return Array.isArray(preloadModules) &&
        preloadModules.some((el) => TSX_MARKER_REGEX.test(el));
}
