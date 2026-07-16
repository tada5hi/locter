/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { buildFilePath } from '../locator';
import type { LocatorInfo } from '../locator';
import type { ModuleLoaderOptions } from './built-in/module/type';
import { useLoader } from './singleton';
import type { ILoader, LoaderFactory, Rule } from './type';

export function registerLoader(rule: Rule) : void;
export function registerLoader(test: string[] | RegExp, loader: ILoader | LoaderFactory) : void;
export function registerLoader(test: any, loader?: ILoader | LoaderFactory) : void {
    const manager = useLoader();
    if (typeof loader !== 'undefined') {
        manager.register(test, loader);

        return;
    }

    manager.register(test);
}

export async function load(input: LocatorInfo | string) : Promise<any> {
    const manager = useLoader();
    if (typeof input === 'string') {
        return manager.execute(input);
    }

    return manager.execute(buildFilePath(input));
}

export function loadSync(input: LocatorInfo | string) : any {
    const manager = useLoader();
    if (typeof input === 'string') {
        return manager.executeSync(input);
    }

    return manager.executeSync(buildFilePath(input));
}

/**
 * Override the built-in module loader's `import` / `require` calls.
 *
 * Useful for test runners (e.g. Vitest) where the dynamic `import()` inside
 * `node_modules/locter` would bypass the runner's module graph. Calling this
 * from user code (e.g. a Vitest setup file) lets the runner rewrite the
 * `import()` so loaded modules share identity with statically imported ones.
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
export function setModuleLoader(options: ModuleLoaderOptions) : void {
    useLoader().builtIn('module').configure(options);
}
