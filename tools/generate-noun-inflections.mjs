// Compile the owning C inflection functions unchanged to produce an independent
// oracle. No game build, JavaScript implementation, or hand-transcribed answers
// participate in the expected results.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { OBJECT_DATA } from '../js/object_data.js';
import { MONS } from '../js/permonst.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const objectSource = readFileSync(join(root, 'nethack-c/upstream/src/objnam.c'), 'utf8');
const helperSource = readFileSync(join(root, 'nethack-c/upstream/src/hacklib.c'), 'utf8');
const extract = (source, name, type) => {
    const start = source.indexOf('\n' + name + '(');
    if (start < 0) throw new Error(`Missing C function ${name}`);
    return type + source.slice(start, source.indexOf('\n}', start) + 2) + '\n';
};
const pairs = objectSource.slice(objectSource.indexOf('struct sing_plur {'), objectSource.indexOf('/* singularize/pluralize decisions'));
const special = objectSource.slice(objectSource.indexOf('static const char *const special_subjs[]'), objectSource.indexOf('/* return form of the verb (input plural) for present tense'));
const nouns = new Set(OBJECT_DATA.flatMap(type => [type.name, type.description]).filter(Boolean));
for (const mon of MONS) for (const name of [mon.name, ...(mon.names || [])]) if (name) nouns.add(name);
for (const name of ['child', 'children', 'goose', 'geese', 'mongoose', 'slice', 'ox', 'oxen', 'muskox', 'fox', 'VAX',
    'craft', 'aircraft', 'hovercraft', 'shaman', 'human', 'talisman', 'caveman', 'specimen', 'abdomen', 'amen',
    'knife', 'tooth', 'foot', 'staff', 'serum', 'ovum', 'passerby', 'man', 'men', 'women',
    'alga', 'algae', 'hypha', 'larva', 'amoeba', 'vertebra', 'lotus', 'wumpus', 'bus', 'virus',
    'gateau', 'bureau', 'matzo', 'matzoh', 'matza', 'matzah', 'matzot', 'codex', 'spadix', 'neocortex', 'index',
    'stomach', 'anarch', 'loch', 'epoch', 'tomato', 'potato', 'dingo', 'elf', 'dwarf', 'hoof', 'nerf', 'serf',
    'cookies', 'pies', 'harpies', 'genies', 'progenies', 'zombies', 'valkyries', 'cloves', 'nerves', 'nurses',
    'axes', 'boxes', 'lynxes', 'churches', 'lotuses', 'splashes', 'priestesses', 'tomatoes', 'dingoes', 'Aleaxes',
    'lens', 'tengus', 'hezrous', 'bacteria', 'baluchitheria', 'nemesis', 'nemeses', 'Hippocrates', 'Pelias',
    'he', 'him', 'his', 'she', 'her', 'it', 'its', 'they', 'them', 'their', 'ya', 'pair of boots', 'pair of dancers']) nouns.add(name);
const inputs = new Set(['', ' ', '  ', 'x', 'X', '@', '123', 'A+', 'elf ', 'elf   ', ' elf', '\telf']);
for (const name of nouns) {
    inputs.add(name); inputs.add(name.toLowerCase()); inputs.add(name.toUpperCase());
    inputs.add(name[0].toUpperCase() + name.slice(1).toLowerCase());
    inputs.add(name.slice(0, -1).toLowerCase() + name.at(-1).toUpperCase());
}
for (const prefix of ['potion', 'potions', 'child', 'children', 'lump', 'lumps', 'lurker', 'VAX', 'pair'])
    for (const suffix of [' of healing', ' labeled X', ' called scarlet', ' named The Eye', ' above', ' versus poison',
        ' from the tree', ' in a box', ' on a stick', ' a la mode', ' with cream', " d'arc", ' de force',
        ' du jour', ' au lait', '-in-law', '-at-arms']) inputs.add(prefix + suffix);
const words = [...inputs];
const directory = mkdtempSync(join(tmpdir(), 'nethack-noun-inflections-'));
try {
    const program = String.raw`
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <strings.h>
typedef int boolean;
#define TRUE 1
#define FALSE 0
#define staticfn static
#define Strcpy strcpy
#define Strcat strcat
#define Strlen(s) ((int) strlen(s))
#define Strcasecpy(dst, src) (void) strcasecpy(dst, src)
#define strcmpi strcasecmp
#define strncmpi strncasecmp
#define eos(s) ((s) + strlen(s))
#define SIZE(a) (sizeof(a) / sizeof((a)[0]))
#define BSTRCMPI(base, ptr, str) ((ptr) < base || strcmpi((ptr), str))
#define BSTRNCMPI(base, ptr, str, n) ((ptr) < base || strncmpi((ptr), str, n))
#define impossible(...) ((void) 0)
static const char vowels[] = "aeiou";
static const struct { const char *he, *him, *his; } genders[] = {
    {"he", "him", "his"}, {"she", "her", "her"}, {"it", "it", "its"}, {"they", "them", "their"}
};
static char buffers[4][1024];
static int current;
static char *nextobuf(void) { return buffers[(current++) % 4]; }
static boolean badman(const char *, boolean);
static boolean ch_ksound(const char *);
${['letter', 'highc', 'lowc'].map(name => extract(helperSource, name, name === 'letter' ? 'boolean' : 'char')).join('\n')}
${extract(helperSource, 'chrcasecpy', 'char')}
${extract(helperSource, 'strcasecpy', 'char *')}
${special}
${pairs}
${extract(objectSource, 'singplur_lookup', 'static boolean')}
${extract(objectSource, 'singplur_compound', 'static char *')}
${extract(objectSource, 'makeplural', 'char *')}
${extract(objectSource, 'makesingular', 'char *')}
${extract(objectSource, 'ch_ksound', 'static boolean')}
${extract(objectSource, 'badman', 'static boolean')}
int main(void) {
    char line[512];
    while (fgets(line, sizeof line, stdin)) {
        line[strcspn(line, "\n")] = '\0';
        puts(makeplural(line));
        puts(makesingular(line));
    }
    return 0;
}
`;
    const source = join(directory, 'inflections.c'), executable = join(directory, 'inflections');
    writeFileSync(source, program);
    const compile = spawnSync(process.env.CC || 'cc', ['-std=c99', source, '-o', executable], { encoding: 'utf8' });
    if (compile.status !== 0) throw new Error(compile.error?.message || compile.stderr);
    const run = spawnSync(executable, [], { encoding: 'utf8', input: words.join('\n') + '\n', maxBuffer: 8 * 1024 * 1024 });
    if (run.status !== 0) throw new Error(run.error?.message || run.stderr);
    const lines = run.stdout.split('\n');
    if (lines.length !== words.length * 2 + 1) throw new Error('Unexpected C output length');
    const output = '[\n' + words.map((word, i) => '  ' + JSON.stringify([word, lines[i * 2], lines[i * 2 + 1]])).join(',\n') + '\n]\n';
    const target = join(root, 'test/fixtures/oracles/noun-inflections.json');
    if (process.argv.includes('--check')) {
        if (readFileSync(target, 'utf8') !== output) throw new Error('Run node tools/generate-noun-inflections.mjs');
    } else writeFileSync(target, output);
    console.log(`${words.length} C noun inflections`);
} finally {
    rmSync(directory, { recursive: true, force: true });
}
