/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import resolve from '@rollup/plugin-node-resolve';
import babel from '@rollup/plugin-babel';
import terser from '@rollup/plugin-terser';
import pkg from './package.json' assert { type: 'json' };
import { findStaticImports } from 'mlly';
import MagicString from 'magic-string';

const extensions = [
    '.js', '.jsx', '.ts', '.tsx',
];

const CJSyntaxRe = /__filename|__dirname|require\(|require\.resolve\(/;

const CJSShim = `
import __cjs_url__ from 'url';
import __cjs_path__ from 'path';
import __cjs_mod__ from 'module';
const __filename = __cjs_url__.fileURLToPath(import.meta.url);
const __dirname = __cjs_path__.dirname(__filename);
const require = __cjs_mod__.createRequire(import.meta.url);
`;

function transformCJSToESM(code) {
    if (code.includes(CJSShim) || !CJSyntaxRe.test(code)) {
        return null;
    }

    const lastESMImport = findStaticImports(code).pop();
    const indexToAppend = lastESMImport ? lastESMImport.end : 0;
    const s = new MagicString(code);
    s.appendRight(indexToAppend, CJSShim);

    return {
        code: s.toString(),
        map: s.generateMap(),
    };
}

export default [
    {
        input: './src/index.ts',

        // Specify here external modules which you don't want to include in your bundle (for instance: 'lodash', 'moment' etc.)
        // https://rollupjs.org/guide/en/#external
        external: [
            ...Object.keys(pkg.dependencies || {}),
            ...Object.keys(pkg.peerDependencies || {}),
        ],

        plugins: [
            // Allows node_modules resolution
            resolve({ extensions }),

            // Compile TypeScript/JavaScript files
            babel({
                extensions,
                babelHelpers: 'bundled',
                include: [
                    'src/**/*',
                ],
            }),

            {
                renderChunk(code, _chunk, opts) {
                    if (opts.format === "es") {
                        return transformCJSToESM(code);
                    }

                    return null;
                }
            },

            terser()
        ],
        output: [
            {
                file: pkg.module,
                format: 'esm',
                sourcemap: true
            },
            {
                file: pkg.main,
                format: 'cjs',
                sourcemap: true
            }
        ],
    }
];
