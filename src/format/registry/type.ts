/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IReader, IWriter } from '../type';

/**
 * Lazy reader construction. Invoked on the first input that matches the
 * rule it was registered for; the first successfully constructed reader
 * is cached (a factory that throws is retried on the next match).
 */
export type ReaderFactory = () => IReader;

/**
 * Lazy writer construction — same lifecycle as ReaderFactory.
 */
export type WriterFactory = () => IWriter;

/**
 * A user-registered dispatch rule. Rules are matched in registration order,
 * BEFORE the built-in extension table (i.e. user rules override built-ins).
 * Rules only ever see file paths — bare module specifiers (no extension)
 * are always routed to the module reader first.
 *
 * The reader and writer slots are independent: read dispatch only
 * considers rules with a reader, write dispatch only rules with a writer.
 * A reader-only rule for '.json' overrides how '.json' is read without
 * shadowing the built-in JSON writer (and vice versa). At least one slot
 * is required.
 */
export type Rule = {
    /**
     * Stable identity. Registering an existing id REPLACES that rule in
     * place (position preserved, cached instance evicted). Built-in ids
     * ('module', 'conf', 'json', 'yaml', 'text') are reserved.
     * Omitted → auto-generated.
     */
    id?: string,
    test: RegExp | string[],
    reader?: IReader | ReaderFactory,
    writer?: IWriter | WriterFactory
};

/**
 * Per-call options for read / readAsModule (+Sync).
 */
export type ReadOptions = {
    /**
     * Read with the format registered under this id — a built-in id
     * ('module', 'conf', 'json', 'yaml', 'text') or a user rule id —
     * INSTEAD of dispatching by extension. This is the evaluation-free
     * escape hatch for module files: read('config.ts', { format: 'text' })
     * returns the source without executing it. Unknown ids throw.
     */
    format?: string
};

/**
 * Per-call options for write (+Sync).
 */
export type WriteOptions = {
    /**
     * Write with the format registered under this id INSTEAD of
     * dispatching by extension. Skips the bare-specifier guard, so
     * extensionless paths become writable ('LICENSE' with 'text') and
     * read-only extensions become targetable (raw source to a '.ts'
     * file with 'text'). Read-only format ids and unknown ids throw.
     */
    format?: string
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
 * One built-in format: routing (extensions) + instantiation (reader and
 * optional writer), inseparable by construction. A preset without a
 * writer is a read-only format (e.g. module).
 */
export type FormatPreset = {
    /** Extensions (with leading dot) routed to this format. Must be disjoint across presets. */
    extensions: readonly string[],
    /** Lazy reader factory — invoked at most once per FormatRegistry instance. */
    reader: () => IReader,
    /** Lazy writer factory — invoked at most once per FormatRegistry instance. */
    writer?: () => IWriter
};
