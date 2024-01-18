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

export function isTsNodeRuntimeEnvironment(): boolean {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return !!process[Symbol.for('ts-node.register.instance')];
}
