/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isBuiltin } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolveModuleURL } from 'exsolve';
import { LocterError, wrapLoaderError } from '../errors';
import type { ResolveModuleOptions } from './types';

const DEFAULT_CONDITIONS = ['node', 'import'];

function buildParentURL(options: ResolveModuleOptions) : string {
    if (options.parentURL) {
        if (options.parentURL instanceof URL) {
            return options.parentURL.href;
        }

        if (options.parentURL.startsWith('file:')) {
            return options.parentURL;
        }

        return pathToFileURL(path.resolve(options.parentURL)).href;
    }

    // A directory URL needs a trailing slash, otherwise the last segment
    // is treated as a file and relative specifiers resolve from its parent.
    const { href } = pathToFileURL(path.resolve(options.cwd || process.cwd()));

    return href.endsWith('/') ? href : `${href}/`;
}

function buildConditions(conditions: string[] = []) : string[] {
    return [...new Set([...conditions, ...DEFAULT_CONDITIONS])];
}

function resolveFilePath(specifier: string, options: ResolveModuleOptions = {}) : string {
    if (isBuiltin(specifier)) {
        throw new LocterError({
            message: `The builtin module "${specifier}" has no file path.`,
            path: specifier,
        });
    }

    try {
        const url = resolveModuleURL(specifier, {
            from: buildParentURL(options),
            conditions: buildConditions(options.conditions),
            extensions: options.extensions,
            suffixes: options.suffixes,
            // no shared cache: installs and links may change between calls
            cache: false,
        });

        // fileURLToPath (unlike exsolve's resolveModulePath, which always
        // uses forward slashes) yields native separators on Windows.
        return fileURLToPath(url);
    } catch (e) {
        throw wrapLoaderError(e, specifier);
    }
}

/**
 * Resolve a module specifier (bare, subpath, or relative) to an absolute
 * file path, honoring package "exports" with the given export conditions.
 * Symlinks are always resolved: the result is the real path.
 *
 * @throws NotFoundError when the specifier does not resolve (not installed,
 *         not exported, or no entry matching the conditions).
 */
export async function resolveModule(
    specifier: string,
    options?: ResolveModuleOptions,
) : Promise<string> {
    // exsolve resolves synchronously, so the async variant shares the sync path.
    return resolveFilePath(specifier, options);
}

/**
 * Sync variant of {@link resolveModule}.
 */
export function resolveModuleSync(
    specifier: string,
    options?: ResolveModuleOptions,
) : string {
    return resolveFilePath(specifier, options);
}
