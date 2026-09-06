// Inventory the reference, not a percentage-of-parity estimator. A JavaScript
// symbol with the same name says nothing about its missing branches or callers.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const assignments = JSON.parse(readFileSync(new URL('docs/c-source-audit/assignments.json', root), 'utf8'));
const assigned = Object.values(assignments.partitions).flat();
const files = readdirSync(new URL('nethack-c/upstream/src/', root)).filter(name => name.endsWith('.c')).sort();
if (new Set(assigned).size !== assigned.length || files.length !== assigned.length
    || files.some(name => !assigned.includes(name.slice(0, -2))))
    throw new Error('Every C source file must occur in exactly one audit partition');
const inventory = files.map(file => {
    const source = readFileSync(new URL(`nethack-c/upstream/src/${file}`, root), 'utf8');
    const functions = [...source.matchAll(/^([A-Za-z_]\w*)\(/gm)].map(match => ({
        name: match[1], line: source.slice(0, match.index).split('\n').length,
    }));
    return {
        file, partition: Object.keys(assignments.partitions).find(key => assignments.partitions[key].includes(file.slice(0, -2))),
        lines: source.split('\n').length - 1,
        sha256: createHash('sha256').update(source).digest('hex'),
        functions,
    };
});
const output = JSON.stringify({ reference: assignments.source, note: 'Lexical function inventory; not branch coverage or proof of parity.', files: inventory }, null, 2) + '\n';
const target = new URL('docs/c-source-audit/inventory.json', root);
if (process.argv.includes('--check')) {
    if (readFileSync(target, 'utf8') !== output) throw new Error('Run node tools/audit-c-sources.mjs');
} else writeFileSync(target, output);
console.log(`${files.length} C files; ${inventory.reduce((sum, file) => sum + file.functions.length, 0)} lexical function entries; all files assigned once.`);
