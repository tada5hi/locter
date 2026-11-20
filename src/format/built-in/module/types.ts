/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type ModuleExportFilterFn = (key: string, value: unknown) => boolean;

export type ModuleExport = {
    key: string,
    value: any
};

export type ModuleLoadOptions = {
    withFilePrefix?: boolean
};

export type ModuleLoadFn = (id: string) => unknown | Promise<unknown>;

export type ModuleLoadSyncFn = (id: string) => unknown;

/**
 * How the module reader loads a module.
 *
 * - `native`: Node's own `import()` / `require()` first, a transpiling
 *   loader only as fallback for recoverable failures.
 * - `transpile`: the transpiling loader only, for file paths (bare
 *   specifiers are read like under `native`). Local TS/JS files are
 *   transpiled (so they can be loaded fresh, see `cache`), while ESM
 *   packages from node_modules are still imported natively and stay one
 *   shared instance with the host's own imports.
 */
export type ModuleReaderStrategy = 'native' | 'transpile';

export type ModuleReaderOptions = {
    /**
     * Load strategy. Default: `native`.
     */
    strategy?: ModuleReaderStrategy,
    /**
     * Keep loaded modules in memory. `false` makes every read load the
     * module (and its transitively imported local files) fresh, e.g. for
     * live reloads. Requires strategy `transpile`: native imports cannot
     * be loaded fresh. Default: `true`.
     */
    cache?: boolean,
    /**
     * Persist transpiled output on disk: `false` to disable (e.g. on a
     * read-only file system), `true` for the default location, or a
     * directory path.
     */
    transpileCache?: boolean | string,
    /**
     * Map bare specifiers to fixed paths, e.g. to pin a package to the
     * host's own installed copy. Applies to transpiled loads.
     */
    alias?: Record<string, string>,
    /**
     * Custom asynchronous module loader. Only for strategy `native`. When
     * set, this replaces the built-in `await import(id)` call. Useful for test runners (e.g. Vitest)
     * where dynamic imports inside `node_modules/locter` would otherwise
     * escape the runner's module graph — defining this in user space lets
     * the runner rewrite the `import()`.
     */
    load?: ModuleLoadFn,
    /**
     * Custom synchronous module loader. Only for strategy `native`. When set,
     * this replaces the built-in
     * `require(id)` call.
     */
    loadSync?: ModuleLoadSyncFn
};
