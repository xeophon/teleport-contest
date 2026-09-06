// Compile obj_typename and its C helpers unchanged against the original object
// definitions. These answers cover every type, both roles and called names at
// the buffer limit without using JavaScript name-generation code.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('..', import.meta.url));
const source = join(root, 'nethack-c/upstream');
const text = readFileSync(join(source, 'src/objnam.c'), 'utf8');
const extract = (name, type) => {
    const start = text.indexOf('\n' + name + '(');
    if (start < 0) throw new Error(`Missing C function ${name}`);
    return type + text.slice(start, text.indexOf('\n}', start) + 2);
};
const directory = mkdtempSync(join(tmpdir(), 'nethack-object-type-names-'));
try {
    const program = `
#include "${join(source, 'src/objects.c')}"
#define eos(s) ((s) + strlen(s))
#define Role_if(role) samurai
#define panic(...) abort()
static int samurai;
static char buffer[BUFSZ];
static char *nextobuf(void) { return buffer; }
${text.slice(text.indexOf('struct Jitem {'), text.indexOf('\n};', text.indexOf('struct Jitem {')) + 3)}
${text.slice(text.indexOf('#define GemStone('), text.indexOf('\n};', text.indexOf('static const struct Jitem Japanese_items[]')) + 3)}
${extract('Japanese_item_name', 'const char *')}
${extract('xcalled', 'static void')}
${extract('obj_typename', 'char *')}
int main(void) {
    objects_globals_init();
    for (int type = 0; type < NUM_OBJECTS; ++type)
        objects[type].oc_name_idx = objects[type].oc_descr_idx = type;
    char long_name[301]; memset(long_name, 'x', 300); long_name[300] = '\\0';
    char *names[] = { NULL, "amber named thing", long_name };
    for (int type = 0; type < NUM_OBJECTS; ++type) for (int known = 0; known <= 1; ++known)
        for (samurai = 0; samurai <= 1; ++samurai) for (int called = 0; called < 3; ++called) {
            objects[type].oc_name_known = known; objects[type].oc_uname = names[called];
            printf("%d %d %d %d\\n%s\\n", type, known, samurai, called, obj_typename(type));
        }
    return 0;
}
`;
    const cfile = join(directory, 'names.c'), executable = join(directory, 'names');
    writeFileSync(cfile, program);
    const compile = spawnSync(process.env.CC || 'cc', ['-std=c99', '-I', join(source, 'include'), cfile, '-o', executable], { encoding: 'utf8' });
    if (compile.status !== 0) throw new Error(compile.error?.message || compile.stderr);
    const run = spawnSync(executable, [], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
    if (run.status !== 0) throw new Error(run.error?.message || run.stderr);
    const lines = run.stdout.trimEnd().split('\n'), rows = [];
    if (lines.length % 2) throw new Error('Unexpected C type name output length');
    for (let i = 0; i < lines.length; i += 2) rows.push([...lines[i].split(' ').map(Number), lines[i + 1]]);
    const output = '[\n' + rows.map(row => '  ' + JSON.stringify(row)).join(',\n') + '\n]\n';
    const target = join(root, 'test/fixtures/oracles/object-type-names.json');
    if (process.argv.includes('--check')) {
        if (readFileSync(target, 'utf8') !== output) throw new Error('Run node tools/generate-object-type-names.mjs');
    } else writeFileSync(target, output);
    console.log(`${rows.length} C object type names`);
} finally {
    rmSync(directory, { recursive: true, force: true });
}
