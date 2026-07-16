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
 * Lazy loader construction. Invoked on the first input that matches the
 * rule it was registered for; the first successfully constructed loader
 * is cached (a factory that throws is retried on the next match).
 */
export type LoaderFactory = () => ILoader;

/**
 * A user-registered dispatch rule. Rules are matched in registration order,
 * BEFORE the built-in extension table (i.e. user rules override built-ins).
 * Rules only ever see file paths — bare module specifiers (no extension)
 * are always routed to the module loader first.
 */
export type Rule = {
    /**
     * Stable identity. Registering an existing id REPLACES that rule in
     * place (position preserved, cached instance evicted). Built-in ids
     * ('module', 'conf', 'json', 'yaml') are reserved. Omitted → auto-generated.
     */
    id?: string,
    test: RegExp | string[],
    loader: ILoader | LoaderFactory
};

/**
 * Normalized registration record — returned by register()/entries().
 */
export type LoaderRegistration = {
    id: string,
    test: RegExp | string[],
    /**
     * true for entries derived from the built-in registry; those cannot
     * be unregistered (but can be shadowed by user rules).
     */
    builtIn: boolean
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
