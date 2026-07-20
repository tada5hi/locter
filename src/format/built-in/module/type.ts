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

export type ModuleReaderOptions = {
    /**
     * Custom asynchronous module loader. When set, this replaces the
     * built-in `await import(id)` call. Useful for test runners (e.g. Vitest)
     * where dynamic imports inside `node_modules/locter` would otherwise
     * escape the runner's module graph — defining this in user space lets
     * the runner rewrite the `import()`.
     */
    load?: ModuleLoadFn,
    /**
     * Custom synchronous module loader. When set, this replaces the built-in
     * `require(id)` call.
     */
    loadSync?: ModuleLoadSyncFn
};
