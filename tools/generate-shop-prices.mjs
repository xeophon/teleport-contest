// Compile C's own object and monster tables and unchanged pricing functions.
// The artifact cost input isolates getprice; artifact-table costs have their
// own tests. No JavaScript game data supplies the expected prices.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('..', import.meta.url));
const source = join(root, 'nethack-c/upstream');
const extract = (file, name, type) => {
    const text = readFileSync(join(source, 'src', file), 'utf8');
    const start = text.indexOf('\n' + name + '(');
    if (start < 0) throw new Error(`Missing C function ${name}`);
    return type + text.slice(start, text.indexOf('\n}', start) + 2);
};
const directory = mkdtempSync(join(tmpdir(), 'nethack-shop-prices-'));
try {
    const program = `
#include "${join(source, 'src/objects.c')}"
#include "${join(source, 'src/monst.c')}"
#include "mondata.h"
static struct { int uhs; } u;
#define SATIATED 0
#define NOT_HUNGRY 1
#define HUNGRY 2
#define FAINTING 4
#define STARVED 6
#define max(a, b) ((a) > (b) ? (a) : (b))
#define debugpline0(message) ((void) 0)
#define ismnum(n) ((n) >= LOW_PM && (n) < NUMMONS)
static long artifact_cost;
long arti_cost(struct obj *obj) { return artifact_cost; }
${extract('eat.c', 'intrinsic_possible', 'int')}
${extract('shk.c', 'corpsenm_price_adj', 'static long')}
${extract('shk.c', 'getprice', 'static long')}
static void price_case(int type, int monster, int spe, int blessed, int cursed,
                       int eaten, long age, int hunger, int buying, long artifact) {
    struct obj obj = {0};
    obj.otyp = type; obj.oclass = objects[type].oc_class; obj.corpsenm = monster;
    obj.spe = spe; obj.blessed = blessed; obj.cursed = cursed; obj.oeaten = eaten;
    obj.age = age; obj.oartifact = artifact != 0; artifact_cost = artifact;
    u.uhs = hunger;
    printf("[%d,%d,%d,%d,%d,%d,%ld,%d,%d,%ld,%ld]\\n", type, monster, spe,
           blessed, cursed, eaten, age, hunger, buying, artifact, getprice(&obj, buying));
}
int main(void) {
    objects_globals_init(); monst_globals_init();
    for (int type = ARROW; type < NUM_OBJECTS; ++type) {
        for (int buy = 0; buy <= 1; ++buy) {
            price_case(type, NON_PM, 0, 0, 0, 0, 0, NOT_HUNGRY, buy, 0);
            price_case(type, NON_PM, -1, 0, 0, 0, 20L * objects[type].oc_cost, NOT_HUNGRY, buy, 0);
            price_case(type, NON_PM, 3, 1, 0, 0, 20L * objects[type].oc_cost - 1, NOT_HUNGRY, buy, 0);
            price_case(type, NON_PM, 0, 0, 1, 1, 1000, FAINTING, buy, 0);
            price_case(type, NON_PM, 0, 0, 0, 0, 0, HUNGRY, buy, 0);
        }
    }
    int foods[] = { TIN, EGG, CORPSE };
    for (int type = 0; type < 3; ++type) for (int mon = LOW_PM; mon < NUMMONS; ++mon)
        for (int buy = 0; buy <= 1; ++buy) for (int hunger = SATIATED; hunger <= STARVED; ++hunger)
            price_case(foods[type], mon, 0, 0, 0, 0, 0, hunger, buy, 0);
    for (int buy = 0; buy <= 1; ++buy) for (int spe = -1; spe <= 3; ++spe)
        for (int cost = 0; cost < 8; ++cost)
            price_case(LONG_SWORD, NON_PM, spe, 0, 0, 0, 0, NOT_HUNGRY, buy, 1001 + cost);
    return 0;
}
`;
    const cfile = join(directory, 'prices.c'), executable = join(directory, 'prices');
    writeFileSync(cfile, program);
    const compile = spawnSync(process.env.CC || 'cc', ['-std=c99', '-I', join(source, 'include'), cfile, '-o', executable], { encoding: 'utf8' });
    if (compile.status !== 0) throw new Error(compile.error?.message || compile.stderr);
    const run = spawnSync(executable, [], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
    if (run.status !== 0) throw new Error(run.error?.message || run.stderr);
    const rows = run.stdout.trim().split('\n').map(line => JSON.parse(line));
    const output = '[\n' + rows.map(row => '  ' + JSON.stringify(row)).join(',\n') + '\n]\n';
    const target = join(root, 'test/fixtures/oracles/shop-prices.json');
    if (process.argv.includes('--check')) {
        if (readFileSync(target, 'utf8') !== output) throw new Error('Run node tools/generate-shop-prices.mjs');
    } else writeFileSync(target, output);
    console.log(`${rows.length} C intrinsic object prices`);
} finally {
    rmSync(directory, { recursive: true, force: true });
}
