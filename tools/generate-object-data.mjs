// Read the unmodified C object definitions with their own initializer macros.
// This keeps bitfields, aliases and conditional entries aligned with the game.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('..', import.meta.url));
const source = join(root, 'nethack-c/upstream');
const directory = mkdtempSync(join(tmpdir(), 'nethack-object-data-'));
const fields = ['id', 'symbol', 'name', 'description', 'nameKnown', 'merge', 'usesKnown',
    'magic', 'charged', 'unique', 'noWish', 'big', 'tough', 'direction', 'material',
    'subtype', 'property', 'class', 'delay', 'color', 'probability', 'weight', 'cost',
    'smallDamage', 'largeDamage', 'oc1', 'oc2', 'nutrition'];
const numericFields = ['oc_name_known', 'oc_merge', 'oc_uses_known', 'oc_magic',
    'oc_charged', 'oc_unique', 'oc_nowish', 'oc_big', 'oc_tough', 'oc_dir', 'oc_material',
    'oc_subtyp', 'oc_oprop', 'oc_class', 'oc_delay', 'oc_color', 'oc_prob', 'oc_weight',
    'oc_cost', 'oc_wsdam', 'oc_wldam', 'oc_oc1', 'oc_oc2', 'oc_nutrition'];
try {
    const program = String.raw`
#include <stdio.h>
#include "objects.c"
struct enum_name { int id; const char *name; };
static struct enum_name names[] = {
#define DUMP_ENUMS
#include "objects.h"
#undef DUMP_ENUMS
};
static void json_string(const char *s) {
    if (!s) { fputs("null", stdout); return; }
    putchar('"');
    for (; *s; ++s) {
        unsigned char c = (unsigned char) *s;
        if (c == '"' || c == '\\') putchar('\\');
        if (c < 32) printf("\\u%04x", c);
        else putchar(c);
    }
    putchar('"');
}
int main(void) {
    putchar('[');
    for (int i = 0; i < NUM_OBJECTS; ++i) {
        struct objclass *o = &obj_init[i];
        if (names[i].id != i) return 2;
        if (i) putchar(',');
        printf("\n[%d,", i);
        json_string(names[i].name); putchar(',');
        json_string(obj_descr_init[i].oc_name); putchar(',');
        json_string(obj_descr_init[i].oc_descr);
        ${numericFields.map(field => `printf(",%d", (int) o->${field});`).join('\n        ')}
        putchar(']');
    }
    fputs("\n]\n", stdout);
    return 0;
}
`;
    const input = join(directory, 'objects.c');
    const executable = join(directory, 'objects');
    // The helper includes the owning source by absolute path so its filename
    // cannot resolve back to this temporary translation unit.
    writeFileSync(input, program.replace('#include "objects.c"', '#include "' + join(source, 'src/objects.c') + '"'));
    const compile = spawnSync(process.env.CC || 'cc', ['-std=c99', '-I', join(source, 'include'), input, '-o', executable], { encoding: 'utf8' });
    if (compile.status !== 0) throw new Error(compile.error?.message || compile.stderr);
    const dump = spawnSync(executable, [], { encoding: 'utf8' });
    if (dump.status !== 0) throw new Error(dump.error?.message || dump.stderr || 'C object enum does not match its initializer');
    const rows = JSON.parse(dump.stdout);
    const output = '// Generated from C include/objects.h and src/objects.c.\n'
        + '// Native object IDs are retained here; legacy JS object IDs are a separate namespace.\n'
        + 'const fields = ' + JSON.stringify(fields) + ';\n'
        + 'export const OBJECT_DATA = Object.freeze([\n'
        + rows.map(row => '    ' + JSON.stringify(row)).join(',\n') + '\n'
        + '].map(row => Object.freeze(Object.fromEntries(fields.map((field, i) => [field, row[i]])))));\n';
    const target = join(root, 'js/object_data.js');
    if (process.argv.includes('--check')) {
        if (readFileSync(target, 'utf8') !== output) throw new Error('Run node tools/generate-object-data.mjs');
    } else writeFileSync(target, output);
    console.log(`${rows.length} canonical C object definitions`);
} finally {
    rmSync(directory, { recursive: true, force: true });
}
