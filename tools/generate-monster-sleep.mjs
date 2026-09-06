// Compile mhitm.c:sleep_monst unchanged. Hooks expose the order of its
// external operations; these cases test state transitions, not the hooks.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('..', import.meta.url));
const source = readFileSync(join(root, 'nethack-c/upstream/src/mhitm.c'), 'utf8');
const start = source.indexOf('\nint\nsleep_monst('), end = source.indexOf('\n}', start) + 2;
if (start < 0 || end < start) throw new Error('Missing C sleep_monst');
const cases = [];
for (const how of [-1, 0, 11]) for (const amount of [-200, 0, 1, 126, 200])
    for (const sleeping of [0, 1]) for (const frozen of [0, 127]) for (const movable of [0, 1])
        for (const [mimic, appearance] of [[0, 0], [0, 1], [1, 0], [1, 1], [1, 2], [1, 3]])
            for (const resistance of [0, 1, 2, 3])
                cases.push([how, amount, sleeping, frozen, movable, mimic, appearance, resistance]);
const directory = mkdtempSync(join(tmpdir(), 'nethack-monster-sleep-'));
try {
    const program = `
#include <stdio.h>
#define S_MIMIC 1
#define M_AP_FURNITURE 1
#define M_AP_OBJECT 2
#define M_AP_TYPE(mon) ((mon)->m_ap_type)
#define AD_SLEE 4
#define NOTELL 0
#define min(a,b) ((a) < (b) ? (a) : (b))
struct permonst { int mlet; };
struct monst { int msleeping, mfrozen, mcanmove, m_ap_type, meating, mx, my; struct permonst *data; };
static int protection, resist_calls, reveals, finished;
static void seemimic(struct monst *mon) { mon->m_ap_type = 0; reveals++; }
static int resists_sleep(struct monst *mon) { return protection == 1; }
static int defended(struct monst *mon, int adtyp) { return protection == 2; }
static int resist(struct monst *mon, char how, int amount, int tell) { resist_calls++; return protection == 3; }
static void shieldeff(int x, int y) { }
static void finish_meating(struct monst *mon) { mon->meating = 0; finished++; }
${source.slice(start, end)}
int main(void) {
    int how, amount, mimic, affected;
    struct permonst data;
    struct monst mon = {0}; mon.data = &data;
    while (scanf("%d %d %d %d %d %d %d %d", &how, &amount, &mon.msleeping,
        &mon.mfrozen, &mon.mcanmove, &mimic, &mon.m_ap_type, &protection) == 8) {
        data.mlet = mimic; mon.meating = 5;
        resist_calls = reveals = finished = 0;
        affected = sleep_monst(&mon, amount, how);
        printf("%d %d %d %d %d %d %d\\n", affected, mon.msleeping, mon.mfrozen,
            mon.mcanmove, mon.meating, resist_calls, reveals);
    }
}
`;
    const cfile = join(directory, 'sleep.c'), executable = join(directory, 'sleep');
    writeFileSync(cfile, program);
    const compile = spawnSync(process.env.CC || 'cc', ['-std=c99', cfile, '-o', executable], { encoding: 'utf8' });
    if (compile.status !== 0) throw new Error(compile.error?.message || compile.stderr);
    const run = spawnSync(executable, [], { encoding: 'utf8', input: cases.map(c => c.join(' ')).join('\n'), maxBuffer: 2 * 1024 * 1024 });
    if (run.status !== 0) throw new Error(run.error?.message || run.stderr);
    const lines = run.stdout.trim().split('\n');
    if (lines.length !== cases.length) throw new Error('Unexpected C sleep output');
    const output = '[\n' + cases.map((row, index) => '  ' + JSON.stringify([...row, lines[index].split(' ').map(Number)])).join(',\n') + '\n]\n';
    const target = join(root, 'test/fixtures/oracles/monster-sleep.json');
    if (process.argv.includes('--check')) {
        if (readFileSync(target, 'utf8') !== output) throw new Error('Run node tools/generate-monster-sleep.mjs');
    } else writeFileSync(target, output);
    console.log(`${cases.length} C monster sleep transitions`);
} finally {
    rmSync(directory, { recursive: true, force: true });
}
