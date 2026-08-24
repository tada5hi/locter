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

// Module-loading options whose VALUE names a loader: --require (-r),
// --import, --loader / --experimental-loader; both the `=` and the
// separated form. Only their values are tested against a marker, so an
// unrelated option carrying the same string (a custom export condition
// like --conditions=ts-node) never counts as an active runtime.
const MODULE_OPTION_REGEX = /^(?:-r|--require|--import|--(?:experimental-)?loader)(?:=(.*))?$/;

// A loader marker in a module-loading option value: the bare specifier
// (node --import tsx, node --loader ts-node/esm), optionally with a
// subpath (tsx/esm, ts-node/register), a resolved path into the package
// (.../node_modules/tsx/dist/loader.mjs), or the specifier quoted inside a
// data: URL (node --import 'data:text/javascript,...register("ts-node/esm")').
function matchesProcessMarker(regex: RegExp) : boolean {
    if (typeof process === 'undefined') {
        return false;
    }

    const { execArgv } = process;
    if (Array.isArray(execArgv)) {
        for (let i = 0; i < execArgv.length; i++) {
            const arg = execArgv[i];
            if (typeof arg !== 'string') {
                continue;
            }

            const option = MODULE_OPTION_REGEX.exec(arg);
            if (!option) {
                continue;
            }

            const value = typeof option[1] === 'string' ? option[1] : execArgv[i + 1];
            if (typeof value === 'string' && regex.test(value)) {
                return true;
            }
        }
    }

    const { _preload_modules: preloadModules } = process as unknown as { _preload_modules?: string[] };

    return Array.isArray(preloadModules) &&
        preloadModules.some((el) => regex.test(el));
}

const TS_NODE_MARKER_REGEX = /(?:^|=|[\\/"'])ts-node(?:$|[\\/"'])/;

export function isTsNodeRuntimeEnvironment(): boolean {
    // The bare `ts-node` bin and `--require ts-node/register` set this on the
    // main thread. The ESM hooks (`--loader ts-node/esm`, or
    // `module.register('ts-node/esm')` via `--import`) run on a separate
    // loader thread since Node 20, so they set it on THAT thread's process
    // object and the main thread has to read the arguments instead.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (process[Symbol.for('ts-node.register.instance')]) {
        return true;
    }

    return matchesProcessMarker(TS_NODE_MARKER_REGEX);
}

const TSX_MARKER_REGEX = /(?:^|=|[\\/"'])tsx(?:$|[\\/"'])/;

export function isTsxRuntimeEnvironment() : boolean {
    return matchesProcessMarker(TSX_MARKER_REGEX);
}
