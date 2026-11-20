/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
    afterAll,
    afterEach,
    describe,
    expect,
    it,
} from 'vitest';
import { ModuleReader } from '../../../src';
import { expectParity } from '../../helpers/parity';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'locter-module-decorators-'));

let counter = 0;

/**
 * Legacy (experimentalDecorators) property decorators, as used by e.g.
 * TypeORM entities: plain and initialized fields, inheritance, a field
 * read by a later initializer, a decorator returning an accessor, a static
 * field and a private field of the class itself.
 */
const SOURCE = `
export const calls: string[] = [];

function Field() : PropertyDecorator {
    return (target, key) => { calls.push(String(key)); };
}

function Computed() : any {
    return (target: object, key: string) => ({
        get() { return 'computed:' + key; },
        configurable: true,
        enumerable: false,
    });
}

export class Base {
    @Field() id: number;
}

export class Entity extends Base {
    @Field() name: string;

    @Field() count: number = 1;

    next = this.count + 1;

    @Computed() label: string;

    @Field() static version: number = 2;

    #secret = 'kept';

    get secret() { return this.#secret; }
}
`;

function writeEntity() : string {
    counter++;

    const dir = path.join(tmpDir, `scenario-${counter}`);

    fs.mkdirSync(dir);

    const filePath = path.join(dir, 'entity.ts');

    fs.writeFileSync(filePath, SOURCE);

    return filePath;
}

type EntityModule = {
    calls: string[],
    Entity: new () => Record<string, unknown>,
};

function inspect(input: unknown) {
    const { Entity, calls } = input as EntityModule;
    const entity = new Entity();

    return {
        calls: [...calls].sort(),
        ownKeys: Reflect.ownKeys(entity),
        count: entity.count,
        next: entity.next,
        name: entity.name,
        label: entity.label,
        labelOwn: Object.hasOwn(entity, 'label'),
        secret: entity.secret,
        version: (Entity as unknown as { version: number }).version,
    };
}

const reflect = Reflect as unknown as { metadata?: unknown };

afterEach(() => {
    delete reflect.metadata;
});

afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('src/format/built-in/module (decorators)', () => {
    it('should initialize decorated fields of legacy decorators', async () => {
        // no reflect-metadata: jiti's fallback for Reflect.metadata must
        // not drop initial values either
        expect(reflect.metadata).toBeUndefined();

        const entry = writeEntity();
        const reader = new ModuleReader({ strategy: 'transpile', transpileCache: false });

        const result = await expectParity(
            async () => inspect(await reader.read(entry)),
            () => inspect(reader.readSync(entry)),
        );

        expect(result).toEqual({
            calls: ['count', 'id', 'name', 'version'],
            // declaration order, the private fields stay invisible
            ownKeys: ['id', 'name', 'count', 'next'],
            count: 1,
            next: 2,
            name: undefined,
            // the accessor of the decorator is not shadowed by an own field
            label: 'computed:label',
            labelOwn: false,
            secret: 'kept',
            version: 2,
        });
    });

    it('should keep initial values in a scope that shadows undefined', async () => {
        expect(reflect.metadata).toBeUndefined();

        counter++;

        const dir = path.join(tmpDir, `scenario-${counter}`);

        fs.mkdirSync(dir);

        const entry = path.join(dir, 'shadowed.ts');

        fs.writeFileSync(entry, `
function Field() : PropertyDecorator {
    return () => {};
}

export function make(undefined: any) {
    class Entity {
        @Field() count: number = 1;
    }

    return new Entity();
}
`);

        const reader = new ModuleReader({ strategy: 'transpile', transpileCache: false });
        const { make } = await reader.read(entry) as { make: (input: unknown) => { count: number } };

        expect(make({ enumerable: true }).count).toEqual(1);
    });

    it('should emit design:type metadata for decorated fields', async () => {
        const types : Record<string, string> = {};

        reflect.metadata = (key: string, value: { name: string }) => (target: object, property?: string) => {
            if (key === 'design:type' && property) {
                types[property] = value.name;
            }
        };

        const reader = new ModuleReader({ strategy: 'transpile', transpileCache: false });
        const { Entity } = await reader.read(writeEntity()) as EntityModule;

        expect(new Entity().count).toEqual(1);
        expect(types).toMatchObject({
            id: 'Number',
            name: 'String',
            count: 'Number',
            version: 'Number',
        });
    });

    it('should keep its transpile cache in a revisioned directory of its own', async () => {
        const cacheDir = path.join(tmpDir, `cache-${++counter}`);
        const reader = new ModuleReader({ strategy: 'transpile', transpileCache: cacheDir });

        inspect(await reader.read(writeEntity()));

        expect(fs.readdirSync(cacheDir)).toEqual(['locter-r1']);
        expect(fs.readdirSync(path.join(cacheDir, 'locter-r1')).length).toBeGreaterThan(0);
    });
});
