/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { LocatorInfo } from '../locator';
import { useLoader } from './singleton';
import type { Loader, Rule } from './type';
import { buildLoaderFilePath } from './utils';

export function registerLoader(rule: Rule) : void;
export function registerLoader(test: string[] | RegExp, loader: Loader) : void;
export function registerLoader(test: any, loader?: Loader) : void {
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

    return manager.execute(buildLoaderFilePath(input, true));
}

export function loadSync(input: LocatorInfo | string) : any {
    const manager = useLoader();
    if (typeof input === 'string') {
        return manager.executeSync(input);
    }

    return manager.executeSync(buildLoaderFilePath(input, true));
}
