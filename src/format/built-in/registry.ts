/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { FormatPreset } from '../registry/type';
import { ConfReader } from './conf';
import { JSONReader } from './json';
import { ModuleReader } from './module';
import { MODULE_FILE_EXTENSIONS } from './module/constants';
import { YAMLReader } from './yaml';

/**
 * Every built-in format, in one place. Keys are the format ids; each entry
 * couples routing and construction. The id union, the extension → format
 * table, lazy caching, and the typed `builtInReader()` accessor are all
 * DERIVED from this object. Adding a format = adding one entry.
 *
 * Intentionally NOT re-exported from any barrel (internal API).
 */
export const BUILT_IN_PRESETS = {
    module: { extensions: MODULE_FILE_EXTENSIONS, reader: () => new ModuleReader() },
    conf: { extensions: ['.conf'], reader: () => new ConfReader() },
    json: { extensions: ['.json'], reader: () => new JSONReader() },
    yaml: { extensions: ['.yml', '.yaml'], reader: () => new YAMLReader() },
} as const satisfies Record<string, FormatPreset>;

export type BuiltInFormatId = keyof typeof BUILT_IN_PRESETS;

export type BuiltInReaderOf<K extends BuiltInFormatId> = ReturnType<(typeof BUILT_IN_PRESETS)[K]['reader']>;
