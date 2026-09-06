// Compile the two owning C functions unchanged. Expected quote strings must
// not depend on the JavaScript implementation or manually copied answers.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('..', import.meta.url));
const source = readFileSync(join(root, 'nethack-c/upstream/src/shk.c'), 'utf8');
const start = source.indexOf('\nvoid\nrecord_price_quote(');
const end = source.indexOf('\n}', source.indexOf('\nappend_price_quote(', start)) + 2;
if (start < 0 || end < start) throw new Error('Missing C price quote functions');
const cases = [];
const histories = [[], [0], [1], [20], [20, 20], [40, 20, 30], [40, 0, 5], [1000000]];
for (const buys of histories) for (const sells of histories)
    for (const length of [0, 6, 219, 230, 240, 245, 246, 247, 250, 254, 255])
        cases.push([buys, sells, 'x'.repeat(length)]);
const directory = mkdtempSync(join(tmpdir(), 'nethack-price-quotes-'));
try {
    const program = `
#include <stdio.h>
#include <string.h>
#include <limits.h>
typedef int boolean;
#define BUFSZ 256
#define Strcpy strcpy
struct objclass { unsigned long oc_buy_minseen, oc_buy_maxseen, oc_sell_minseen, oc_sell_maxseen; };
static struct objclass objects[1];
${source.slice(start, end)}
int main(void) {
    unsigned long price;
    int n, buy, sell, length;
    while (scanf("%d %d %d", &buy, &sell, &length) == 3) {
        objects[0] = (struct objclass) { ULONG_MAX, 0, ULONG_MAX, 0 };
        for (n = 0; n < buy + sell; ++n) {
            if (scanf("%lu", &price) != 1) return 1;
            record_price_quote(0, price, n < buy);
        }
        char buffer[BUFSZ], *end = buffer + length;
        memset(buffer, 'x', length); *end = '\\0';
        append_price_quote(buffer, &end, 0);
        puts(buffer);
    }
    return 0;
}
`;
    const cfile = join(directory, 'quotes.c'), executable = join(directory, 'quotes');
    writeFileSync(cfile, program);
    const compile = spawnSync(process.env.CC || 'cc', ['-std=c99', cfile, '-o', executable], { encoding: 'utf8' });
    if (compile.status !== 0) throw new Error(compile.error?.message || compile.stderr);
    const input = cases.map(([buys, sells, name]) => [buys.length, sells.length, name.length, ...buys, ...sells].join(' ')).join('\n');
    const run = spawnSync(executable, [], { encoding: 'utf8', input, maxBuffer: 2 * 1024 * 1024 });
    if (run.status !== 0) throw new Error(run.error?.message || run.stderr);
    const lines = run.stdout.split('\n');
    if (lines.length !== cases.length + 1) throw new Error('Unexpected C quote output length');
    const output = '[\n' + cases.map((row, index) => '  ' + JSON.stringify([...row, lines[index]])).join(',\n') + '\n]\n';
    const target = join(root, 'test/fixtures/oracles/price-quotes.json');
    if (process.argv.includes('--check')) {
        if (readFileSync(target, 'utf8') !== output) throw new Error('Run node tools/generate-price-quotes.mjs');
    } else writeFileSync(target, output);
    console.log(`${cases.length} C price quote histories and buffer boundaries`);
} finally {
    rmSync(directory, { recursive: true, force: true });
}
