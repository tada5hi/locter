export type LocatorInfo = {
    directory: string,
    name: string,
    extension?: string,
    path: string,
};

export type LocatorOptions = {
    cwd: string[],
    ignore: string[],
    onlyFiles: boolean,
    onlyDirectories: boolean,
    dot: boolean,
};

export type LocatorOptionsInput = Partial<Omit<LocatorOptions, 'cwd' | 'ignore'>> & {
    cwd?: string | string[],
    ignore?: string | string[],
};

export type LocatorUpOptionsInput = Omit<LocatorOptionsInput, 'cwd'> & {
    cwd?: string,
    stopAt?: string,
};

export type WalkStep = {
    current: string,
    stopAt: string,
    baseOptions: Omit<LocatorOptionsInput, 'cwd'>,
};
