// Compile the Lua subset used by quest levels into ordered data. Calls outside
// NetHack's level API are rejected; no source text is evaluated by the game.
export function parseQuestLua(source) {
    const tokens = [];
    const scanner = /\s+|--[^\n]*|\[\[[\s\S]*?\]\]|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\d+|[A-Za-z_]\w*|[{}\[\](),;.:=#+|\-]/gy;
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
    const calls = new Set(['math.random', 'nh.rn2', 'percent', 'shuffle', 'd']);
    const selections = new Set(['area', 'new', 'set', 'grow', 'negate', 'clone', 'floodfill', 'filter_mapchar', 'rndcoord']);
    function atom() {
        const token = take();
        if (/^\d+$/.test(token)) return Number(token);
        if (token === 'true' || token === 'false') return token === 'true';
        if (token === 'nil' || token === 'random') return null;
        if (token.startsWith('[[')) return token.slice(2, -2).replace(/^\n/, '').replace(/\n$/, '');
        if (token.startsWith('"')) return JSON.parse(token);
        if (token.startsWith("'")) return token.slice(1, -1).replace(/\\(['\\])/g, '$1');
        if (token === '-' || token === '#') {
            const operand = primary();
            return token === '-' && typeof operand === 'number' ? -operand : { lua: 'unary', op: token, operand };
        }
        if (token === '(') { const result = value(); take(')'); return result; }
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
            const body = operations(['end']); take('end');
            return { operations: body };
        }
        if (!/^[A-Za-z_]\w*$/.test(token || '')) throw new Error(`Unsupported quest value ${token}`);
        let name = token;
        if (tokens[index] === '.') { take('.'); name += `.${take()}`; }
        if (tokens[index] !== '(') {
            if (name.includes('.')) throw new Error(`Unsupported quest value ${name}`);
            return { lua: 'var', name };
        }
        if (name.startsWith('selection.') && selections.has(name.slice(10)))
            return { selection: name.slice(10), args: args() };
        if (!calls.has(name)) throw new Error(`Unsupported quest call ${name}`);
        return { lua: 'call', name, args: args() };
    }
    function primary() {
        let result = atom();
        while (tokens[index] === '[' || tokens[index] === ':') {
            if (tokens[index] === '[') {
                take('['); const key = value(); take(']');
                result = { lua: 'index', value: result, index: key };
            } else {
                take(':'); const name = take();
                if (!selections.has(name)) throw new Error(`Unsupported quest selection ${name}`);
                result = { lua: 'method', value: result, name, args: args() };
            }
        }
        return result;
    }
    function value(min = 0) {
        let result = primary();
        const precedence = { '|': 1, '+': 2, '-': 2 };
        while ((precedence[tokens[index]] || 0) > min) {
            const op = take(), right = value(precedence[op]);
            result = { lua: 'binary', op, left: result, right };
        }
        return result;
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
    function operations(stops = []) {
        const result = [];
        while (index < tokens.length && !stops.includes(tokens[index])) {
            if (tokens[index] === ';') { take(); continue; }
            if (tokens[index] === 'local' || tokens[index + 1] === '=') {
                const local = tokens[index] === 'local';
                if (local) take();
                const name = take(); take('=');
                result.push([local ? '@local' : '@assign', name, value()]);
            } else if (tokens[index] === 'if') {
                take('if'); const condition = value(); take('then');
                const yes = operations(['else', 'end']);
                const no = tokens[index] === 'else' ? (take('else'), operations(['end'])) : [];
                take('end'); result.push(['@if', condition, yes, no]);
            } else if (tokens[index] === 'for') {
                take('for'); const name = take(); take('='); const from = value(); take(','); const to = value();
                let step = 1;
                if (tokens[index] === ',') { take(','); step = value(); }
                take('do'); const body = operations(['end']); take('end');
                result.push(['@for', name, from, to, step, body]);
            } else if (tokens[index] === 'des') {
                take('des'); take('.'); const operation = take();
                result.push([operation, ...args()]);
            } else result.push(['@call', value()]);
        }
        return result;
    }
    return operations();
}
