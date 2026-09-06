// shk.c: record_price_quote and append_price_quote. Quotes belong to the
// object type, so another stack and a restored game see the same range.
import { game } from './gstate.js';

export function recordPriceQuote(typeId, price, buying) {
    if (typeId == null) return;
    const quotes = game._object_price_quotes ??= {};
    const type = quotes[typeId] ??= {};
    const direction = buying ? 'buy' : 'sell';
    const seen = type[direction] ??= { min: price, max: price };
    seen.min = Math.min(seen.min, price);
    seen.max = Math.max(seen.max, price);
}

export function appendPriceQuote(name, typeId) {
    const quotes = game._object_price_quotes?.[typeId];
    if (!quotes) return name;
    const prices = [];
    for (const direction of ['buy', 'sell']) {
        const seen = quotes[direction];
        if (seen) prices.push(direction + ' ' + seen.min + (seen.min < seen.max ? '-' + seen.max : ''));
    }
    const suffix = ' {' + prices.join(' ') + '}';
    // C deliberately leaves another byte beyond the terminating NUL.
    return suffix.length < 256 - name.length - 1 ? name + suffix : name;
}
