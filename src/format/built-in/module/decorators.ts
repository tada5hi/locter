/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Bump whenever the transform output changes: it is part of the transpile
 * cache directory, and jiti's cache key (its version + the source) does
 * not cover the transform options.
 */
export const TRANSFORM_REVISION = 1;

/*
 * Structural stand-ins for the few Babel shapes used below; locter does not
 * depend on @babel/* (the plugin runs inside the Babel copy bundled by jiti).
 */
type Node = { type: string, [key: string]: any };

type NodePath = {
    node: Node,
    parentPath: NodePath | null,
    replaceWith(node: Node) : void,
    traverse(visitor: Record<string, (path: NodePath) => void>) : void,
};

type PluginState = {
    file: { addHelper(name: string) : Node },
};

type BabelAPI = {
    types: {
        arrowFunctionExpression(params: Node[], body: Node) : Node,
        callExpression(callee: Node, args: Node[]) : Node,
        classPrivateProperty(key: Node, value: Node) : Node,
        cloneNode(node: Node) : Node,
        identifier(name: string) : Node,
        numericLiteral(value: number) : Node,
        privateName(id: Node) : Node,
        stringLiteral(value: string) : Node,
        thisExpression() : Node,
        unaryExpression(operator: string, argument: Node) : Node,
    },
};

const WARNING_HELPER = /^_initializerWarningHelper\d*$/;

function isWarningCall(value: Node | null | undefined) : value is Node {
    return !!value &&
        value.type === 'CallExpression' &&
        value.callee.type === 'Identifier' &&
        WARNING_HELPER.test(value.callee.name) &&
        value.arguments.length === 2 &&
        value.arguments[1].type === 'ThisExpression';
}

/**
 * `(t) => t`, the fallback jiti emits for `Reflect.metadata?.(...)` when
 * reflect-metadata is not loaded.
 */
function isIdentityArrow(node: Node) : boolean {
    return node.type === 'ArrowFunctionExpression' &&
        node.params.length === 1 &&
        node.params[0].type === 'Identifier' &&
        node.body.type === 'Identifier' &&
        node.body.name === node.params[0].name;
}

function isReflectMetadataCall(node: Node) : boolean {
    return (node.type === 'OptionalCallExpression' || node.type === 'CallExpression') &&
        (node.callee.type === 'OptionalMemberExpression' || node.callee.type === 'MemberExpression') &&
        node.callee.object.type === 'Identifier' &&
        node.callee.object.name === 'Reflect' &&
        node.callee.property.type === 'Identifier' &&
        node.callee.property.name === 'metadata';
}

function collectPrivateNames(classBody: NodePath) : Set<string> {
    const names = new Set<string>();

    classBody.traverse({
        PrivateName(path) {
            names.add(path.node.id.name);
        },
    });

    return names;
}

/**
 * Completes jiti's legacy decorator support for class fields.
 *
 * jiti runs @babel/plugin-proposal-decorators (legacy) without
 * @babel/plugin-transform-class-properties. Legacy decorators then turn
 * every decorated field into `name = _initializerWarningHelper(...)`,
 * which throws once the class is instantiated (e.g. a TypeORM entity).
 *
 * Each such field becomes a private field whose initializer applies the
 * decorated descriptor through Babel's own `initializerDefineProperty`
 * helper, which is what the class-properties transform makes of it. The
 * field stays in place, so fields keep initializing in declaration order,
 * and a decorator that replaced the property by an accessor is not
 * shadowed. The private field holds no value and is invisible to
 * reflection (Object.keys, Reflect.ownKeys, JSON).
 *
 * It also replaces jiti's `Reflect.metadata?.(...) || ((t) => t)` fallback
 * by `() => void 0`, as TypeScript's `__metadata` helper does: for a
 * property decorator, a returned target is taken as the new descriptor and
 * drops the field's initial value.
 */
export function createDecoratorFieldsPlugin(api: BabelAPI) {
    const t = api.types;

    return {
        name: 'locter:legacy-decorator-fields',
        visitor: {
            LogicalExpression(path: NodePath) {
                const { node } = path;

                if (
                    node.operator === '||' &&
                    isReflectMetadataCall(node.left) &&
                    isIdentityArrow(node.right)
                ) {
                    // void 0: an enclosing binding named undefined can not shadow it
                    node.right = t.arrowFunctionExpression([], t.unaryExpression('void', t.numericLiteral(0)));
                }
            },
            ClassProperty(path: NodePath, state: PluginState) {
                const { node } = path;

                if (!isWarningCall(node.value) || node.static || node.computed) {
                    return;
                }

                let key : Node;

                if (node.key.type === 'Identifier') {
                    key = t.stringLiteral(node.key.name);
                } else if (node.key.type === 'StringLiteral' || node.key.type === 'NumericLiteral') {
                    key = t.cloneNode(node.key);
                } else {
                    return;
                }

                const classBody = path.parentPath as NodePath;
                const names = collectPrivateNames(classBody);

                let name = '__locterDecorated';
                let counter = 0;

                while (names.has(name)) {
                    counter++;
                    name = `__locterDecorated${counter}`;
                }

                const [descriptor] = node.value.arguments;
                const helper = state.file.addHelper('initializerDefineProperty');

                path.replaceWith(t.classPrivateProperty(
                    t.privateName(t.identifier(name)),
                    t.callExpression(helper, [t.thisExpression(), key, descriptor, t.thisExpression()]),
                ));
            },
        },
    };
}
