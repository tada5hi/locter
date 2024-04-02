# Locter 🔥

[![npm version](https://badge.fury.io/js/locter.svg)](https://badge.fury.io/js/locter)
[![CI](https://github.com/tada5hi/locter/actions/workflows/main.yml/badge.svg)](https://github.com/tada5hi/locter/actions/workflows/main.yml)
[![codecov](https://codecov.io/gh/Tada5hi/locter/branch/master/graph/badge.svg?token=4KNSG8L13V)](https://codecov.io/gh/Tada5hi/locter)
[![Known Vulnerabilities](https://snyk.io/test/github/Tada5hi/locter/badge.svg?targetFile=package.json)](https://snyk.io/test/github/Tada5hi/locter?targetFile=package.json)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-%23FE5196?logo=conventionalcommits&logoColor=white)](https://conventionalcommits.org)

Locter is a library to locate and load a file/modules regarding specific criteria.

**Table of Contents**

- [Installation](#installation)
- [Usage](#usage)
  - [Locator](#locator)
  - [Loader](#loader)
- [License](#license)

## Installation

```bash
npm install locter --save
```

## Usage

The following examples are based on some shared assumptions:
- A folder named `files` exists in the root directory.
- The folder `files` contains the following files:
  - example.js
  - example.json
  - example.ts
  - example-long.ts


### Locator

**Multiple**

Locating multiple files will return information about all files matching the pattern.

```typescript
import { locateMany } from 'locter';

(async () => {
    let files = await locateMany(
        'files/example.{js,.ts}'
    );

    console.log(files);
    /*
    [
        { path: 'files', name: 'example', extension: '.js'},
        { path: 'files', name: 'example', extension: '.ts'}
    ]
     */

    files = await locateMany(
        'files/*.{js,ts}'
    );

    console.log(files);
    /*
    [
        { path: 'files', name: 'example', extension: '.js'},
        { path: 'files', name: 'example', extension: '.ts'},
        { path: 'files', name: 'example-long', extension: '.ts'},
    ]
     */
})
```

A synchronous variant is also available: `locateManySync`

**Single**

Locating a single file will return information about the first file matching the pattern.

```typescript
import { locate } from 'locter';

(async () => {
    let file = await locate(
        'files/example.{js,.ts}'
    );

    console.log(file);
    /*
    { path: 'files', name: 'example', extension: '.js'}
     */
})
```

A synchronous variant is also available: `locateSync`

### Loader

The `load` method can be used to load a file/module in an asynchronous fashion.
Either a string or the output of the locate/locateSync method can be passed as argument.

```typescript
import { load, locate } from 'locter';

(async () => {
    const file = await locate(
        'files/example.{js,.ts}'
    );

    let content = await load(file);
    console.log(content);
    // ...

    content = await load('...');
    console.log(content);
    // ...
})
```

There is also a synchronous method called `loadSync` to load files.

```typescript
import { loadSync, locateSync } from 'locter';

(async () => {
    const file = await locateSync(
        'files/example.{js,.ts}'
    );

    let content = await loadSync(file);
    console.log(content);
    // ...

    content = await loadSync('...');
    console.log(content);
    // ...
})
```

Two loaders are predefined from scratch and already registered:
- **ConfLoader**: This loader allows to load `.conf` files.
- **JSONLoader**: This loader allows to load `.json` files.
- **YAMLLoader**: This loader allows to load `.yml` files.
- **ModuleLoader**: This loader allows to load modules with
  `.js`, `.mjs`, `.mts`, `.cjs`, `.cts`, `.ts` file extensions independent of the environment (cjs or esm).

To register loader for other file types, the function `registerLoader` can be used.

```typescript
import { registerLoader } from 'locter';

registerLoader(['.ext'], {
    execute(input: string) {

    },
    executeSync(input: string) {

    }
})
```


## License

Made with 💚

Published under [MIT License](./LICENSE).
