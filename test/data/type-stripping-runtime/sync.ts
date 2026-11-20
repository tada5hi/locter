// Runs, then throws a SyntaxError while running (not while loading).
const counter = globalThis as { __locterRuntimeSync?: number };

counter.__locterRuntimeSync = (counter.__locterRuntimeSync ?? 0) + 1;

JSON.parse('{');

export const value : number = 1;
