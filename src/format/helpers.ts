/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { LocatorInfo } from '../locator';
import type { ModuleReaderOptions } from './built-in/module/type';
import {
    type FormatRegistration,
    type ReadOptions,
    type Rule,
    type WriteOptions,
    useFormatRegistry,
} from './registry';

export function registerFormat(rule: Rule) : FormatRegistration {
    return useFormatRegistry().register(rule);
}

/**
 * Remove a rule from the process-global registry by its id
 * (as returned by registerFormat). Built-in ids cannot be unregistered.
 */
export function unregisterFormat(id: string) : boolean {
    return useFormatRegistry().unregister(id);
}

/**
 * Read a file/module RAW: the plain parsed value for data formats
 * (json/yaml/conf and custom readers — mutable, round-trip-symmetric
 * with write); for modules the normalized module record (a module IS a
 * record; normalization only irons out CJS/ESM interop divergence).
 *
 * options.format forces a registered format id instead of extension
 * dispatch — e.g. { format: 'text' } reads a module file's source
 * WITHOUT evaluating it.
 */
export async function read(input: LocatorInfo | string, options?: ReadOptions) : Promise<any> {
    return useFormatRegistry().read(input, options);
}

export function readSync(input: LocatorInfo | string, options?: ReadOptions) : any {
    return useFormatRegistry().readSync(input, options);
}

/**
 * Read a file/module and present the result as a normalized module
 * record — the uniform, frozen shape regardless of format: `.default`
 * always holds the loaded value, top-level keys are re-exposed as
 * named exports.
 */
export async function readAsModule(input: LocatorInfo | string, options?: ReadOptions) : Promise<any> {
    return useFormatRegistry().readAsModule(input, options);
}

export function readAsModuleSync(input: LocatorInfo | string, options?: ReadOptions) : any {
    return useFormatRegistry().readAsModuleSync(input, options);
}

/**
 * options.format forces a registered format id instead of extension
 * dispatch — this also lifts the bare-specifier guard (extensionless
 * paths) and the read-only block on module extensions.
 */
export async function write(input: LocatorInfo | string, value: unknown, options?: WriteOptions) : Promise<void> {
    return useFormatRegistry().write(input, value, options);
}

export function writeSync(input: LocatorInfo | string, value: unknown, options?: WriteOptions) : void {
    useFormatRegistry().writeSync(input, value, options);
}

/**
 * Override the built-in module reader's `import` / `require` calls.
 *
 * Useful for test runners (e.g. Vitest) where the dynamic `import()` inside
 * `node_modules/locter` would bypass the runner's module graph. Calling this
 * from user code (e.g. a Vitest setup file) lets the runner rewrite the
 * `import()` so loaded modules share identity with statically imported ones.
 *
 * Returns a restore function that re-applies the previous configuration —
 * handy for scoped overrides (e.g. test teardown). The restore function is
 * scoped to the exact reader instance it configured: after a registry
 * reset() (which discards that instance) it becomes a no-op instead of
 * re-applying stale configuration to the fresh instance.
 *
 * @example
 * ```ts
 * // vitest setup file
 * import { setModuleReader } from 'locter';
 *
 * setModuleReader({
 *     load: (id) => import(id),
 * });
 * ```
 */
export function setModuleReader(options: ModuleReaderOptions) : () => void {
    const reader = useFormatRegistry().builtInReader('module');
    const previous = reader.configure(options);

    return () => {
        reader.configure(previous);
    };
}
