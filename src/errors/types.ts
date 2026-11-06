import { type ErrorOptions } from '@ebec/core';

export type LocterErrorOptions = ErrorOptions & {
    path?: string,
};

export type LocterErrorInput = string | LocterErrorOptions;
