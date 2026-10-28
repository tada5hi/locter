import config from '@tada5hi/eslint-config';

export default [
    ...await config(),
    { ignores: ['dist/**', 'test/data/**'] },
    {
        rules: {
            // maintainer: declined 2026-10-28
            'unicorn/prefer-object-iterable-methods': 'off',
        },
    },
];
