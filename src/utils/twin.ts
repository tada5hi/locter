/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Internal protocol to derive the parallel sync + async public surfaces
 * from one shared body. A body is a generator that yields effect pairs —
 * an async and a sync thunk for the same operation — and the two drivers
 * (runTwinAsync / runTwinSync) execute the side they stand for. Effect
 * errors are re-entered into the body via `Generator.throw`, so try/catch
 * inside a body behaves identically in both variants.
 *
 * Deliberately NOT exported from the utils barrel — this is internal
 * plumbing, not public API.
 */

export type TwinOp<T = unknown> = {
    async: () => Promise<T>,
    sync: () => T,
};

export type TwinBody<R> = Generator<TwinOp<any>, R, any>;

/**
 * Perform one effect inside a twin body: `const x = yield* op(a, s)`.
 */
export function* op<T>(
    asyncFn: () => Promise<T>,
    syncFn: () => T,
) : Generator<TwinOp<T>, T, T> {
    return yield { async: asyncFn, sync: syncFn };
}

export async function runTwinAsync<R>(body: TwinBody<R>) : Promise<R> {
    let step = body.next();
    while (!step.done) {
        let result : unknown;
        try {
            result = await step.value.async();
        } catch (e) {
            step = body.throw(e);
            continue;
        }

        step = body.next(result);
    }

    return step.value;
}

export function runTwinSync<R>(body: TwinBody<R>) : R {
    let step = body.next();
    while (!step.done) {
        let result : unknown;
        try {
            result = step.value.sync();
        } catch (e) {
            step = body.throw(e);
            continue;
        }

        step = body.next(result);
    }

    return step.value;
}
