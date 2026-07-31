
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const sess = JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const seg = sess.segments[0];
const bin = '/tmp/nh-fix9127/nethack-c/recorder/install/games/lib/nethackdir/nethack';
const install = '/tmp/nh-fix9127/nethack-c/recorder/install/games/lib/nethackdir';
const homeDir = '/tmp/nh-home'; fs.mkdirSync(homeDir, {recursive:true});
fs.writeFileSync(homeDir + '/.nethackrc', seg.nethackrc + '\n');
const name = (seg.nethackrc.match(/name:([^\s,]+)/)||[])[1] || 'Wizard';
const child = spawn(bin, ['-u', name], { stdio: ['pipe','pipe','inherit'],
  env: { ...process.env, NETHACKDIR: install, HACKDIR: install, HOME: homeDir, TERM: 'xterm-256color',
         TZ: 'America/New_York', NETHACK_NO_DELAY: '1', NETHACK_SEED: String(seg.seed),
         NETHACK_RNGLOG: '/tmp/c_rng.log',
         NETHACK_FIXED_DATETIME: seg.datetime, NOMUX_MARKERS: '1', NETHACK_RAW_KEYS: '1' } });
let out = '';
let buf = '';
let awaiting = true;
let sent = 0;
let got = 0;
child.stdout.on('data', d => { buf += d.toString('latin1'); out += d.toString('latin1'); pump(); });
function pump() {
  const m = buf.match(/\x1b\]7777;/);
  if (!m) return;
  const idx = buf.indexOf('\x1b]7777;');
  const end = buf.indexOf('\x07', idx);
  if (end < 0) return;
  buf = buf.slice(end+1);
  got++;
  if (sent < seg.moves.length) {
    const ch = seg.moves[sent++];
    child.stdin.write(ch, 'latin1');
  } else if (awaiting) { awaiting=false; setTimeout(()=>{child.kill('SIGKILL'); fs.writeFileSync('/tmp/c_session_raw.txt', out, 'latin1'); process.exit(0);}, 500); }
}
setTimeout(()=>{ child.kill('SIGKILL'); fs.writeFileSync('/tmp/c_session_raw.txt', out, 'latin1'); console.error('TIMEOUT sent',sent,'got',got); process.exit(1); }, 90000);
