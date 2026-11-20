/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type ResolveModuleOptions = {
    /**
     * Directory to resolve from (same semantics as locate()).
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
     * Export conditions, prepended to the defaults ['node', 'import'].
     */
    conditions?: string[],
};
