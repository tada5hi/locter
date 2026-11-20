// Runs, then throws a SyntaxError while running (not while loading).
const counter = globalThis as { __locterRuntimeAsync?: number };

counter.__locterRuntimeAsync = (counter.__locterRuntimeAsync ?? 0) + 1;

JSON.parse('{');

export const value : number = 1;
