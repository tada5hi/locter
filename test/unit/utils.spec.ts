/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isJestRuntimeEnvironment, removeFileNameExtension } from '../../src';

describe('src/utils/*.ts', () => {
    it('should remove file name extension', () => {
        let data = removeFileNameExtension('test.js', ['.js', '.ts']);
        expect(data).toEqual('test');

        data = removeFileNameExtension('test.mts', ['.js', '.ts']);
        expect(data).toEqual('test.mts');

        data = removeFileNameExtension('test.js', []);
        expect(data).toEqual('test.js');

        data = removeFileNameExtension('test.js');
        expect(data).toEqual('test');
    });

    it('should detect environment', () => {
        const jestEnv = isJestRuntimeEnvironment();
        expect(jestEnv).toEqual(true);
    });
});
