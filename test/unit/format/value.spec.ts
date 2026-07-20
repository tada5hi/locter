/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { deserializeValue, serializeValue } from '../../../src';

describe('src/format/value.ts', () => {
    it('should serialize primitives to their bare string form', () => {
        expect(serializeValue('raw string')).toEqual('raw string');
        expect(serializeValue(true)).toEqual('true');
        expect(serializeValue(false)).toEqual('false');
        expect(serializeValue(123)).toEqual('123');
        expect(serializeValue(null)).toEqual('null');
        expect(serializeValue(undefined)).toEqual('undefined');
    });

    it('should serialize BigInt and RegExp to their string representation', () => {
        expect(serializeValue(BigInt('9007199254740993'))).toEqual('9007199254740993');
        expect(serializeValue(/^a+$/i)).toEqual('/^a+$/i');

        // nested inside JSON payloads via the replacer
        expect(serializeValue({ pattern: /x/g, big: BigInt(2) }))
            .toEqual('{"pattern":"/x/g","big":"2"}');
    });

    it('should serialize objects and arrays as JSON', () => {
        expect(serializeValue({ a: 1 })).toEqual('{"a":1}');
        expect(serializeValue([1, 'two'])).toEqual('[1,"two"]');
    });

    it('should deserialize with lenient coercion and never throw', () => {
        expect(deserializeValue('true')).toEqual(true);
        expect(deserializeValue('123')).toEqual(123);
        expect(deserializeValue('null')).toEqual(null);
        expect(deserializeValue('undefined')).toEqual(undefined);
        expect(deserializeValue('{"a":1}')).toEqual({ a: 1 });

        // invalid JSON falls back to the raw string
        expect(deserializeValue('{ not json')).toEqual('{ not json');
        expect(deserializeValue('hello world')).toEqual('hello world');
    });

    it('should round-trip serializable values', () => {
        for (const value of [true, 123, null, { a: [1, 'two'] }, 'plain']) {
            expect(deserializeValue(serializeValue(value))).toEqual(value);
        }
    });
});
