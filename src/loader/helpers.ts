/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { LocatorInfo } from '../locator';
import type { ModuleLoaderOptions } from './built-in/module/type';
import {
    type LoaderFactory,
    type LoaderRegistration,
    type Rule,
    useLoaderRegistry,
} from './registry';
import type { ILoader } from './type';

export function registerLoader(rule: Rule) : LoaderRegistration;
export function registerLoader(test: string[] | RegExp, loader: ILoader | LoaderFactory) : LoaderRegistration;
export function registerLoader(test: any, loader?: ILoader | LoaderFactory) : LoaderRegistration {
    const manager = useLoaderRegistry();
    if (typeof loader !== 'undefined') {
        return manager.register(test, loader);
    }

    return manager.register(test);
}

/**
 * Remove a rule from the process-global registry by its id
 * (as returned by registerLoader). Built-in ids cannot be unregistered.
 */
export function unregisterLoader(id: string) : boolean {
    return useLoaderRegistry().unregister(id);
}

export async function load(input: LocatorInfo | string) : Promise<any> {
    return useLoaderRegistry().load(input);
}

export function loadSync(input: LocatorInfo | string) : any {
    return useLoaderRegistry().loadSync(input);
}

/**
 * Override the built-in module loader's `import` / `require` calls.
 *
 * Useful for test runners (e.g. Vitest) where the dynamic `import()` inside
 * `node_modules/locter` would bypass the runner's module graph. Calling this
 * from user code (e.g. a Vitest setup file) lets the runner rewrite the
 * `import()` so loaded modules share identity with statically imported ones.
 *
 * Returns a restore function that re-applies the previous configuration —
 * handy for scoped overrides (e.g. test teardown). The restore function is
 * scoped to the exact loader instance it configured: after a registry
 * reset() (which discards that instance) it becomes a no-op instead of
 * re-applying stale configuration to the fresh instance.
 *
 * @example
 * ```ts
 * // vitest setup file
 * import { setModuleLoader } from 'locter';
 *
 * setModuleLoader({
 *     load: (id) => import(id),
 * });
 * ```
 */
export function setModuleLoader(options: ModuleLoaderOptions) : () => void {
    const loader = useLoaderRegistry().builtIn('module');
    const previous = loader.configure(options);

    return () => {
        loader.configure(previous);
    };
}
