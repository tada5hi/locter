/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type ResolveModuleOptions = {
    /**
     * Directory to resolve from.
     *
     * default: process.cwd()
     */
    cwd?: string,
    /**
     * Resolve relative to a specific file (path or file: URL).
     * Takes precedence over cwd when both are set.
     */
    parentURL?: string | URL,
    /**
     * Export conditions, added to the defaults ['node', 'import'].
     * The key order of the package's "exports" decides which entry
     * matches, not the order of this list.
     */
    conditions?: string[],
    /**
     * Opt-in: extensions to try for extensionless specifiers
     * (e.g. ['.ts', '.js'] lets './file' resolve to './file.ts').
     * Strict ESM resolution (no extension probing) by default.
     */
    extensions?: string[],
    /**
     * Opt-in: path suffixes to try (e.g. ['', '/index'] lets './dir'
     * resolve to './dir/index.js' together with extensions).
     * Strict ESM resolution by default.
     */
    suffixes?: string[],
};
