/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export interface ILoader {
    execute: (input: string) => Promise<any>,
    executeSync: (input: string) => any
}

/**
 * Lazy loader construction. Invoked at most once, on the first input
 * that matches the rule it was registered for; the result is cached.
 */
export type LoaderFactory = () => ILoader;

/**
 * A user-registered dispatch rule. Rules are matched in registration order,
 * BEFORE the built-in extension table (i.e. user rules override built-ins).
 * Rules only ever see file paths — bare module specifiers (no extension)
 * are always routed to the module loader first.
 */
export type Rule = {
    test: RegExp | string[],
    loader: ILoader | LoaderFactory
};

/**
 * One built-in format: routing (extensions) + instantiation (create),
 * inseparable by construction.
 */
export type LoaderPreset = {
    /** Extensions (with leading dot) routed to this loader. Must be disjoint across presets. */
    extensions: readonly string[],
    /** Lazy factory — invoked at most once per LoaderManager instance. */
    create: () => ILoader
};
