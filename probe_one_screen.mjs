
import { readFileSync } from 'fs';
import { join } from 'path';
const PROJECT_ROOT = '/tmp/nh-cont9150';
const { normalizeSession } = await import(join(PROJECT_ROOT, 'frozen/session_loader.mjs'));
const { decodeScreen } = await import(join(PROJECT_ROOT, 'frozen/screen-decode.mjs'));
const sessionData = JSON.parse(readFileSync(join(PROJECT_ROOT, 'sessions-extra/seed9150-wizard-harass-intervene.session.json'), 'utf8'));
const cSteps = normalizeSession(sessionData).segments.flatMap(sg => sg.steps || []);
const i = +(process.env.STEP || 143);
const g = decodeScreen(cSteps[i].screen);
for (const r of g) console.log(r.map(c => c.ch ?? '?').join(''));
