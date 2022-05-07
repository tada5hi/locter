module.exports = {
    testEnvironment: 'node',
    transform: {
        "^.+\\.tsx?$": "ts-jest"
    },
    moduleFileExtensions: [
        "ts",
        "tsx",
        "js",
        "jsx",
        "json",
        "node",
    ],
    testRegex: '(/unit/.*|(\\.|/)(test|spec))\\.(ts|js)x?$',
    testPathIgnorePatterns: [
        "dist",
        "unit/mock-util.ts"
    ],
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        'src/**/*.{ts,tsx,js,jsx}',
        '!src/**/*.d.ts',
        '!src/api/index.ts',
        '!src/api/utils/**/*.{ts,js}',
        '!src/cli/**/*.{ts,js}',
        '!src/database/**/*.{ts,js}',
        '!src/utils/**/*.{ts,js}',
        '!src/seeder/**/*.{ts,js}',
    ],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
        }
    },
    rootDir: '../'
};
