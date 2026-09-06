// Parse declarative des programs into data. Unsupported Lua is an error;
// generated level data never evaluates source text in the game runtime.
export function parseQuestLua(source) {
    const tokens = [];
    const scanner = /\s+|--[^\n]*|\[\[[\s\S]*?\]\]|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|-?\d+|[A-Za-z_]\w*|[{}(),;.=]/gy;
    let offset = 0;
    while (offset < source.length) {
        scanner.lastIndex = offset;
        const match = scanner.exec(source);
        if (!match) throw new Error(`Unsupported quest Lua at ${source.slice(offset, offset + 80)}`);
        offset = scanner.lastIndex;
        if (!/^\s|^--/.test(match[0])) tokens.push(match[0]);
    }
    let index = 0;
    const take = expected => {
        const token = tokens[index++];
        if (expected && token !== expected) throw new Error(`Expected ${expected}, got ${token}`);
        return token;
    };
    function value() {
        const token = take();
        if (/^-?\d+$/.test(token)) return Number(token);
        if (token === 'true' || token === 'false') return token === 'true';
        if (token === 'nil' || token === 'random') return null;
        if (token.startsWith('[[')) return token.slice(2, -2).replace(/^\n/, '').replace(/\n$/, '');
        if (token.startsWith('"')) return JSON.parse(token);
        if (token.startsWith("'")) return token.slice(1, -1).replace(/\\(['\\])/g, '$1');
        if (token === '{') {
            const named = {}, positional = [];
            while (tokens[index] !== '}') {
                if (tokens[index + 1] === '=') {
                    const key = take(); take('='); named[key] = value();
                } else positional.push(value());
                if (tokens[index] !== '}') take(',');
            }
            take('}');
            if (!Object.keys(named).length) return positional;
            if (positional.some(item => item !== null)) throw new Error('Mixed quest tables are unsupported');
            return named;
        }
        if (token === 'function') {
            take('('); take(')');
            const body = operations('end'); take('end');
            return { operations: body };
        }
        if (token === 'selection') {
            take('.'); const selection = take();
            return { selection, args: args() };
        }
        throw new Error(`Unsupported quest value ${token}`);
    }
    function args() {
        take('(');
        const result = [];
        while (tokens[index] !== ')') {
            result.push(value());
            if (tokens[index] !== ')') take(',');
        }
        take(')');
        return result;
    }
    function operations(stop) {
        const result = [];
        while (index < tokens.length && tokens[index] !== stop) {
            if (tokens[index] === ';') { take(); continue; }
            take('des'); take('.'); const operation = take();
            result.push([operation, ...args()]);
        }
        return result;
    }
    return operations();
}
