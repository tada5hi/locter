/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Document, ToStringOptions, YAMLMap } from 'yaml';
import {
    isMap,
    isNode,
    isScalar,
    parseDocument,
    stringify as stringifyYAML,
} from 'yaml';
import { hasOwnProperty, isObject } from '../../../utils';
import { TextFileWriter } from '../../text-file';

export type YAMLWriterOptions = ToStringOptions;

function pairKey(key: unknown) : string {
    return isScalar(key) ? String(key.value) : String(key);
}

/**
 * Merge a plain object into an existing YAML map node: added/changed keys
 * are set, absent keys are deleted, and nested objects recurse — so
 * comments, anchors, and formatting attached to surviving keys are
 * preserved. Arrays, scalars, and type changes replace the node wholesale
 * (comments inside the replaced subtree are lost).
 */
function graftMap(doc: Document, node: YAMLMap, value: Record<string, unknown>) : void {
    for (const pair of [...node.items]) {
        if (!hasOwnProperty(value, pairKey(pair.key))) {
            node.delete(pair.key);
        }
    }

    for (const key of Object.keys(value)) {
        const entry = value[key];
        const current = node.get(key, true);

        if (isMap(current) && isObject(entry)) {
            graftMap(doc, current, entry);
            continue;
        }

        const replacement = doc.createNode(entry);
        if (isNode(current)) {
            // keep comments anchored to the value node itself
            // (`key: value # trailing`, standalone lines above the value)
            replacement.commentBefore = current.commentBefore;
            replacement.comment = current.comment;
            replacement.spaceBefore = current.spaceBefore;
        }

        node.set(doc.createNode(key), replacement);
    }
}

/**
 * Writes YAML preserving hand-edited structure where possible: when the
 * target file already exists, the new value is grafted into its parsed
 * document, so comments and anchors attached to surviving keys survive
 * the write-back. New files are plain `yaml.stringify` output. An
 * existing file that fails to parse throws (wrapped as WriteError)
 * instead of being silently overwritten.
 */
export class YAMLWriter extends TextFileWriter {
    protected options : YAMLWriterOptions;

    constructor(options: YAMLWriterOptions = {}) {
        super();
        this.options = options;
    }

    protected override get usesExistingContent() : boolean {
        return true;
    }

    stringify(value: unknown, existing?: string) : string {
        if (typeof existing === 'undefined') {
            return stringifyYAML(value, this.options);
        }

        // widen from Document.Parsed: contents is replaced with
        // freshly created (non-parsed) nodes while grafting
        const doc : Document = parseDocument(existing);
        if (doc.errors.length > 0) {
            throw doc.errors[0];
        }

        if (isMap(doc.contents) && isObject(value)) {
            graftMap(doc, doc.contents, value);
        } else {
            doc.contents = doc.createNode(value);
        }

        return doc.toString(this.options);
    }
}
