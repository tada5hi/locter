/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { expect } from 'vitest';

/**
 * Assert the sync/async twin contract at a public boundary: run both
 * variants with the same input and expect deeply-equal results.
 * Returns the async result for further assertions.
 */
export async function expectParity<T>(
    run: () => Promise<T>,
    runSync: () => T,
) : Promise<T> {
    const result = await run();
    const resultSync = runSync();

    expect(resultSync).toEqual(result);

    return result;
}
