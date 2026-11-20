// Valid TypeScript that Node can not strip (an enum, a decorator), but
// jiti can transpile.
function noop(target: any, key: string) {}

export enum Color {
    Red = 'red',
}

class Palette {
    @noop
    pick() : Color {
        return Color.Red;
    }
}

export default new Palette().pick();
