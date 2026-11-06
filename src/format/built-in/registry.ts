/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { FormatPreset } from '../registry/types';

import { ConfReader, ConfWriter } from './conf';
import { JSONReader, JSONWriter } from './json';
import { ModuleReader } from './module';
import { TextReader, TextWriter } from './text';
import { MODULE_FILE_EXTENSIONS } from './module/constants';
import { YAMLReader, YAMLWriter } from './yaml';

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
    conf: {
        extensions: ['.conf'],
        reader: () => new ConfReader(),
        writer: () => new ConfWriter(),
    },
    json: {
        extensions: ['.json'],
        reader: () => new JSONReader(),
        writer: () => new JSONWriter(),
    },
    yaml: {
        extensions: ['.yml', '.yaml'],
        reader: () => new YAMLReader(),
        writer: () => new YAMLWriter(),
    },
    text: {
        extensions: ['.txt'],
        reader: () => new TextReader(),
        writer: () => new TextWriter(),
    },
} as const satisfies Record<string, FormatPreset>;
