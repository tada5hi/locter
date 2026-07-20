/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Single source of truth for the extensions handled by the module loader:
 * consumed by BOTH the built-in routing registry and the jiti config.
 */
export const MODULE_FILE_EXTENSIONS = ['.js', '.mjs', '.mts', '.cjs', '.cts', '.ts'] as const;
