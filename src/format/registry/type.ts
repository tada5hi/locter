/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IReader } from '../type';

/**
 * Lazy reader construction. Invoked on the first input that matches the
 * rule it was registered for; the first successfully constructed reader
 * is cached (a factory that throws is retried on the next match).
 */
export type ReaderFactory = () => IReader;

/**
 * A user-registered dispatch rule. Rules are matched in registration order,
 * BEFORE the built-in extension table (i.e. user rules override built-ins).
 * Rules only ever see file paths — bare module specifiers (no extension)
 * are always routed to the module reader first.
 */
export type Rule = {
    /**
     * Stable identity. Registering an existing id REPLACES that rule in
     * place (position preserved, cached instance evicted). Built-in ids
     * ('module', 'conf', 'json', 'yaml') are reserved. Omitted → auto-generated.
     */
    id?: string,
    test: RegExp | string[],
    reader: IReader | ReaderFactory
};

/**
 * Normalized registration record — returned by register()/entries().
 */
export type FormatRegistration = {
    id: string,
    test: RegExp | string[],
    /**
     * true for entries derived from the built-in registry; those cannot
     * be unregistered (but can be shadowed by user rules).
     */
    builtIn: boolean
};

/**
 * One built-in format: routing (extensions) + instantiation (reader),
 * inseparable by construction.
 */
export type FormatPreset = {
    /** Extensions (with leading dot) routed to this format. Must be disjoint across presets. */
    extensions: readonly string[],
    /** Lazy reader factory — invoked at most once per FormatRegistry instance. */
    reader: () => IReader
};
