/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { destr } from 'destr';

/**
 * Lenient VALUE codec (env-var / key-value philosophy): primitives
 * serialize to their bare string form, RegExp and BigInt to their
 * string representation (also nested), everything else to JSON.
 * The counterpart of deserializeValue — used per value by the conf
 * format, and exported for consumers building lenient custom formats.
 */
export function serializeValue(input: unknown) : string {
    if (typeof input === 'string') {
        return input;
    }

    if (typeof input === 'undefined') {
        return 'undefined';
    }

    if (input === null) {
        return 'null';
    }

    if (typeof input === 'boolean') {
        return input ? 'true' : 'false';
    }

    if (typeof input === 'number') {
        return `${input}`;
    }

    if (typeof input === 'bigint') {
        return input.toString();
    }

    if (input instanceof RegExp) {
        return input.toString();
    }

    const output = JSON.stringify(input, (_key, item) => {
        if (item instanceof RegExp) {
            return item.toString();
        }

        if (typeof item === 'bigint') {
            return item.toString();
        }

        return item;
    });

    // JSON.stringify yields undefined for top-level Symbol/Function and
    // toJSON() returning undefined — a lenient codec still returns a string
    return output ?? String(input);
}

/**
 * Lenient parse of a serialized value: coerces 'true'/'123'/'null'/
 * 'undefined' to their primitive, parses JSON payloads, and falls back
 * to returning the raw string — it never throws.
 */
export function deserializeValue<T = any>(input: string) : T {
    return destr(input);
}
