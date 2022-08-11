[![npm version](https://badge.fury.io/js/locter.svg)](https://badge.fury.io/js/locter)
[![codecov](https://codecov.io/gh/Tada5hi/locter/branch/master/graph/badge.svg?token=4KNSG8L13V)](https://codecov.io/gh/Tada5hi/locter)
[![CI](https://github.com/tada5hi/locter/actions/workflows/main.yml/badge.svg)](https://github.com/tada5hi/locter/actions/workflows/main.yml)

# Locter 🔥
Locter is a library to locate and load a file regarding specific criteria.

**Table of Contents**

- [Installation](#installation)
- [Usage](#usage)
  - [Locator](#locator)
  - [Loader](#loader)

## Installation

```bash
npm install locter --save
```

---
**Important NOTE**

The public API is still in progress and in development ☂ and can still can change therefore until the v1.0.0 release.
So please stay patient, till it is fully available ⭐.

---

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

