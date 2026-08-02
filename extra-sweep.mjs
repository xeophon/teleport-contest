import { readdirSync } from 'fs';
import { execFileSync } from 'child_process';
const files = readdirSync('sessions-extra').filter(f=>f.endsWith('.session.json'));
for (const f of files) {
  let out = '', err='';
  try { out = execFileSync('node',['frozen/ps_test_runner.mjs',`sessions-extra/${f}`],{encoding:'utf8',stdio:['ignore','pipe','pipe']}); }
  catch(e) { out=e.stdout||''; err=e.stderr||''; }
  const all = out + '\n' + err;
  const line = all.split('\n').filter(l=>/PASS:|FAIL:/.test(l)).pop() || 'NO-RESULT';
  console.log(f.padEnd(46), line.replace(/^\s+/,'').slice(0,110));
}
