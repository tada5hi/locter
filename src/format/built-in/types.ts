import type { IWriter } from '../types';
import type { BUILT_IN_PRESETS } from './registry';

export type BuiltInFormatId = keyof typeof BUILT_IN_PRESETS;

export type BuiltInReaderOf<K extends BuiltInFormatId> = ReturnType<(typeof BUILT_IN_PRESETS)[K]['reader']>;

/**
 * Built-in format ids whose preset declares a writer — derived at the type
 * level, so builtInWriter('module') is a compile error, not a runtime one.
 */
export type WritableBuiltInFormatId = {
    [K in BuiltInFormatId]: (typeof BUILT_IN_PRESETS)[K] extends { writer: () => IWriter } ? K : never
}[BuiltInFormatId];

export type BuiltInWriterOf<K extends WritableBuiltInFormatId> = ReturnType<(typeof BUILT_IN_PRESETS)[K]['writer']>;
