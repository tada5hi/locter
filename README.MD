# Locter 🔥

[![npm version](https://badge.fury.io/js/locter.svg)](https://badge.fury.io/js/locter)
[![CI](https://github.com/tada5hi/locter/actions/workflows/main.yml/badge.svg)](https://github.com/tada5hi/locter/actions/workflows/main.yml)
[![codecov](https://codecov.io/gh/Tada5hi/locter/branch/master/graph/badge.svg?token=4KNSG8L13V)](https://codecov.io/gh/Tada5hi/locter)
[![Known Vulnerabilities](https://snyk.io/test/github/Tada5hi/locter/badge.svg?targetFile=package.json)](https://snyk.io/test/github/Tada5hi/locter?targetFile=package.json)
[![semantic-release: angular](https://img.shields.io/badge/semantic--release-angular-e10079?logo=semantic-release)](https://github.com/semantic-release/semantic-release)

Locter is a library to locate and load a file regarding specific criteria.

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
import { locateFiles } from 'locter';

(async () => {
    let files = await locateFiles(
        'files/example.{js,.ts}',
        {
            path: process.cwd()
        }
    );

    console.log(files);
    /*
    [
        { path: 'files', name: 'example', extension: '.js'},
        { path: 'files', name: 'example', extension: '.ts'}
    ]
     */

    files = await locateFiles(
        'files/*.{js,ts}',
        {
            path: process.cwd()
        }
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

A synchronous variant is also available: `locateFilesSync`

**Single**

Locating a single file will return information about the first file matching the pattern.

```typescript
import { locateFile } from 'locter';

(async () => {
    let file = await locateFile(
        'files/example.{js,.ts}',
        {
            path: process.cwd()
        }
    );

    console.log(file);
    /*
    { path: 'files', name: 'example', extension: '.js'}
     */
})
```

A synchronous variant is also available: `locateFileSync`

### Loader

The method will load the located file.

```typescript
import { loadFile, locateFile } from 'locter';

(async () => {
    const file = await locateFile(
        'files/example.{js,.ts}',
        {
            path: process.cwd()
        }
    );

    const content = loadFile(file);

    console.log(content);

    // ...
})
```

A synchronous variant is also available: `loadFileSync`

## License

Made with 💚

Published under [MIT License](./LICENSE).
