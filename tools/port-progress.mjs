// Run the source-derived tests and both C recording corpora separately.
// Session percentages describe these recordings, not how much C is ported.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
if (args.some((arg, i) => i % 2 === 0 && !['--output', '--baseline'].includes(arg))
    || args.length % 2 !== 0) {
    console.error('Usage: npm run progress -- [--output report.json] [--baseline report.json]');
    process.exit(2);
}
const options = Object.fromEntries(Array.from({ length: args.length / 2 }, (_, i) => args.slice(2 * i, 2 * i + 2)));
const output = resolve(options['--output'] || join(root, '.cache/port-progress/latest.json'));
const baseline = options['--baseline'] ? JSON.parse(readFileSync(resolve(options['--baseline']), 'utf8')) : null;
const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' });
const dirty = spawnSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' });
const report = {
    timestamp: new Date().toISOString(),
    commit: head.status === 0 ? head.stdout.trim() : null,
    dirty: dirty.status === 0 ? !!dirty.stdout.trim() : null,
    node: process.version,
    unit: {},
    corpora: {},
};

const tests = readdirSync(join(root, 'test')).filter(name => name.endsWith('.test.mjs')).sort();
console.log('Running source-derived unit tests...');
const unit = spawnSync(process.execPath, ['--test', '--test-reporter=tap', ...tests.map(name => join(root, 'test', name))], {
    cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 120_000,
});
for (const key of ['tests', 'pass', 'fail', 'cancelled', 'skipped', 'todo']) {
    const match = unit.stdout?.match(new RegExp(`^# ${key} (\\d+)`, 'm'));
    report.unit[key] = match ? Number(match[1]) : null;
}
report.unit.exitCode = unit.status;
if (unit.error) report.unit.error = unit.error.message;
console.log(`Unit tests: ${report.unit.pass}/${report.unit.tests} passing; ${report.unit.fail} failed`);
if (baseline?.unit) {
    report.unit.change = Object.fromEntries(['tests', 'pass', 'fail', 'todo'].map(key => [key,
        report.unit[key] == null || baseline.unit[key] == null ? null : report.unit[key] - baseline.unit[key],
    ]));
    console.log(`  Changes from baseline: ${JSON.stringify(report.unit.change)}`);
}
if (unit.status !== 0) console.error(unit.stdout, unit.stderr);

for (const corpus of ['sessions', 'sessions-extra']) {
    console.log(`Scoring ${corpus} against the C recordings...`);
    const child = spawnSync(process.execPath, ['frozen/ps_test_runner.mjs', corpus], {
        cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 600_000,
    });
    const marker = '__RESULTS_JSON__';
    const start = child.stdout?.lastIndexOf(marker) ?? -1;
    if (child.status !== 0 || start < 0) {
        report.corpora[corpus] = { error: child.error?.message || child.stderr || 'No scorer result', exitCode: child.status };
        console.error(report.corpora[corpus].error);
        continue;
    }
    const bundle = JSON.parse(child.stdout.slice(start + marker.length).trim());
    const result = {
        passing: bundle.results.filter(row => row.passed).length,
        sessions: bundle.results.length,
        metrics: {},
        results: bundle.results,
    };
    for (const row of bundle.results) {
        for (const [metric, counts] of Object.entries(row.metrics || {})) {
            const sum = result.metrics[metric] ??= { matched: 0, total: 0 };
            sum.matched += counts.matched;
            sum.total += counts.total;
        }
    }
    // An errored worker has zero denominators in the frozen runner. Keep the
    // error count visible so its missing frames cannot inflate a parity claim.
    result.errors = bundle.results.filter(row => row.error).length;
    const previous = baseline?.corpora?.[corpus];
    if (previous?.results) {
        const previousRows = new Map(previous.results.map(row => [row.session, row]));
        const currentRows = new Set(bundle.results.map(row => row.session));
        result.addedSessions = bundle.results.filter(row => !previousRows.has(row.session)).map(row => row.session);
        result.removedSessions = previous.results.filter(row => !currentRows.has(row.session)).map(row => row.session);
        result.changes = [];
        for (const row of bundle.results) {
            const before = previousRows.get(row.session);
            if (!before) continue;
            const delta = {};
            for (const metric of ['rngCalls', 'screens', 'cursors']) {
                const oldCounts = before.metrics?.[metric];
                const newCounts = row.metrics?.[metric];
                if (oldCounts && newCounts) delta[metric] = {
                    matched: newCounts.matched - oldCounts.matched,
                    total: newCounts.total - oldCounts.total,
                };
            }
            if (before.passed !== row.passed || before.error !== row.error
                || Object.values(delta).some(counts => counts.matched || counts.total)) {
                result.changes.push({ session: row.session, passedBefore: before.passed, passedAfter: row.passed, delta });
            }
        }
    } else if (previous) {
        result.baselineError = previous.error || 'No baseline session results';
    }
    report.corpora[corpus] = result;
    const screens = result.metrics.screens;
    const rng = result.metrics.rngCalls;
    console.log(`${corpus}: ${result.passing}/${result.sessions} sessions; screens ${screens.matched}/${screens.total}; RNG ${rng.matched}/${rng.total}; errors ${result.errors}`);
    if (result.changes) console.log(`  Changes from baseline: ${JSON.stringify(result.changes)}`);
    if (result.addedSessions?.length || result.removedSessions?.length)
        console.log(`  Corpus changes: added ${JSON.stringify(result.addedSessions)}, removed ${JSON.stringify(result.removedSessions)}`);
    if (result.baselineError) console.log(`  Baseline unavailable: ${result.baselineError}`);
}

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(`Report: ${output}`);
process.exitCode = report.unit.exitCode !== 0
    || Object.values(report.corpora).some(result => result.error || result.errors || result.passing !== result.sessions) ? 1 : 0;
