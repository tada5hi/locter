/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { LoaderPreset } from '../type';
import { ConfLoader } from './conf';
import { JSONLoader } from './json';
import { ModuleLoader } from './module';
import { MODULE_FILE_EXTENSIONS } from './module/constants';
import { YAMLLoader } from './yaml';

/**
 * Every built-in format, in one place. Keys are the loader ids; each entry
 * couples routing and construction. The id union, the extension → loader
 * table, lazy caching, and the typed `builtIn()` accessor are all DERIVED
 * from this object. Adding a format = adding one entry.
 *
 * Intentionally NOT re-exported from any barrel (internal API).
 */
export const BUILT_IN_PRESETS = {
    module: { extensions: MODULE_FILE_EXTENSIONS, create: () => new ModuleLoader() },
    conf: { extensions: ['.conf'], create: () => new ConfLoader() },
    json: { extensions: ['.json'], create: () => new JSONLoader() },
    yaml: { extensions: ['.yml', '.yaml'], create: () => new YAMLLoader() },
} as const satisfies Record<string, LoaderPreset>;

export type BuiltInLoaderId = keyof typeof BUILT_IN_PRESETS;

export type BuiltInLoaderOf<K extends BuiltInLoaderId> = ReturnType<(typeof BUILT_IN_PRESETS)[K]['create']>;
