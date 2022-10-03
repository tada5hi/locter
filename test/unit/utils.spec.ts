/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { removeFileNameExtension } from "../../src/utils/file-name";

describe('src/utils/*.ts', function () {
    it('should remove file name extension', () => {
        let data = removeFileNameExtension('test.js', ['.js', '.ts']);
        expect(data).toEqual('test');

        data = removeFileNameExtension('test.mts', ['.js', '.ts']);
        expect(data).toEqual('test.mts');

        data = removeFileNameExtension('test.js', []);
        expect(data).toEqual('test.js');

        data = removeFileNameExtension('test.js');
        expect(data).toEqual('test');
    })
});
