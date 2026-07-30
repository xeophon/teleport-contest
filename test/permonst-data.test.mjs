// permonst-data.test.mjs — parity invariants for js/permonst.js (the mons[] port).
//
// All expected values below were transcribed by hand from
// nethack-c/upstream sources (include/monsters.h entries, interpreted with
// include/monattk.h AT_/AD_ codes, include/monflag.h MS_/MZ_/MR_/M1_/M2_/M3_/G_
// codes, include/defsym.h S_ class numbers + letters, include/color.h colors,
// include/weight.h WT_* weights). Fixture answers are NOT consulted.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  MONS, NUMMONS, NON_PM, LOW_PM, HIGH_PM, SPECIAL_PM, NATTK, PM,
  PM_GIANT_ANT, PM_ACID_BLOB, PM_QUEEN_BEE, PM_LONG_WORM_TAIL,
  PM_COCKATRICE, PM_CHICKATRICE, PM_MEDUSA, PM_WIZARD_OF_YENDOR,
  AT_BITE, AT_TUCH, AT_WEAP, AT_MAGC, AT_NONE,
  AD_PHYS, AD_STON, AD_RUST, AD_SAMU, AD_DRIN,
  MS_SILENT, MS_GROAN, MZ_TINY, MZ_SMALL, MZ_MEDIUM, MZ_GIGANTIC,
  MR_FIRE, MR_COLD, MR_POISON, MR_STONE,
  M1_ANIMAL, M1_CARNIVORE, M1_HERBIVORE, M1_METALLIVORE, M1_BREATHLESS,
  M1_MINDLESS, M1_AMORPHOUS, M1_WALLWALK, M1_REGEN, M1_NOLIMBS, M1_NOHANDS,
  M2_UNDEAD, M2_WERE, M2_GIANT, M2_MERC, M2_HOSTILE, M2_NOPOLY,
  M3_COVETOUS, M3_INFRAVISIBLE,
  G_NOGEN, G_GENO, G_FREQ, G_UNIQ, G_SGROUP, G_NOCORPSE,
  is_giant, is_undead, is_were, touch_petrifies, flesh_petrifies,
  breathless, amorphous, passes_walls, species_regenerates, regenerates,
  carnivore, herbivore, metallivore, is_mercenary, is_mindless, mindless,
} from '../js/permonst.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const C_MONSTERS_H = [
  path.join(HERE, '..', 'nethack-c', 'upstream', 'include', 'monsters.h'),
  path.join(HERE, '..', '..', 'xeophon-teleport-contest', 'nethack-c', 'upstream', 'include', 'monsters.h'),
  '/Users/xeophon/code/misc/2026-07-26-xeophon-teleport-contest/nethack-c/upstream/include/monsters.h',
].find((p) => existsSync(p));

/* Count live MON(NAM(...))/MON(NAMS(...)) entries in nethack-c include/monsters.h,
 * i.e. after the C preprocessor drops #if 0 / #ifdef CHARON regions
 * (MAIL_STRUCTURES is defined: include/global.h:430). */
function countLiveMonEntries(cfile) {
  let src = readFileSync(cfile, 'utf8');
  src = src.replace(/\/\*[\s\S]*?\*\//g, ''); // strip /* */ comments
  const out = [];
  const stack = [];
  for (const line of src.split('\n')) {
    const s = line.trim();
    if (s.startsWith('#if')) {
      stack.push(!(s.startsWith('#if 0') || s.startsWith('#ifdef CHARON')));
      continue;
    }
    if (s.startsWith('#else')) { if (stack.length) stack[stack.length - 1] = !stack[stack.length - 1]; continue; }
    if (s.startsWith('#elif')) { if (stack.length) stack[stack.length - 1] = false; continue; }
    if (s.startsWith('#endif')) { stack.pop(); continue; }
    if (stack.every(Boolean)) out.push(line);
  }
  const n = (out.join('\n').match(/\bMON\(\s*NAMS?\(/g) || []).length;
  return n;
}

test('constant values match C headers', () => {
  // include/monattk.h
  assert.equal(AT_NONE, 0); assert.equal(AT_BITE, 2); assert.equal(AT_TUCH, 5);
  assert.equal(AT_WEAP, 254); assert.equal(AT_MAGC, 255);
  assert.equal(AD_PHYS, 0); assert.equal(AD_STON, 18); assert.equal(AD_RUST, 24);
  assert.equal(AD_DRIN, 32); assert.equal(AD_SAMU, 252);
  // include/monflag.h
  assert.equal(MS_SILENT, 0); assert.equal(MS_GROAN, 44);
  assert.equal(MZ_TINY, 0); assert.equal(MZ_SMALL, 1); assert.equal(MZ_MEDIUM, 2);
  assert.equal(MZ_GIGANTIC, 7);
  assert.equal(MR_FIRE, 0x01); assert.equal(MR_COLD, 0x02);
  assert.equal(MR_POISON, 0x20); assert.equal(MR_STONE, 0x80);
  assert.equal(M1_ANIMAL, 0x00040000); assert.equal(M1_CARNIVORE, 0x20000000);
  assert.equal(M1_HERBIVORE, 0x40000000); assert.equal(M1_METALLIVORE >>> 0, 0x80000000);
  assert.equal(M1_MINDLESS, 0x00010000); assert.equal(M1_BREATHLESS, 0x00000400);
  assert.equal(M1_AMORPHOUS, 0x00000004); assert.equal(M1_WALLWALK, 0x00000008);
  assert.equal(M1_REGEN, 0x00800000); assert.equal(M1_NOLIMBS, 0x00006000);
  assert.equal(M1_NOHANDS, 0x00002000);
  assert.equal(M2_UNDEAD, 0x02); assert.equal(M2_WERE, 0x04); assert.equal(M2_GIANT, 0x2000);
  assert.equal(M2_MERC, 0x0200); assert.equal(M2_HOSTILE, 0x100000); assert.equal(M2_NOPOLY, 0x01);
  assert.equal(M3_COVETOUS, 0x1F); assert.equal(M3_INFRAVISIBLE, 0x0200);
  // G_* (monflag.h) and permonst.h bounds
  assert.equal(G_NOGEN, 0x0200); assert.equal(G_GENO, 0x0020); assert.equal(G_FREQ, 0x07);
  assert.equal(G_UNIQ, 0x1000); assert.equal(G_SGROUP, 0x0080); assert.equal(G_NOCORPSE, 0x0010);
  assert.equal(NATTK, 6); // include/permonst.h
  assert.equal(NON_PM, -1); // include/permonst.h enum monnums
  assert.equal(LOW_PM, 0);  // NON_PM + 1
});

test('table order and count invariants', assertCount => {
  // NetHack 5.0 has no playermon/PM_NULL slot: index 0 is PM_GIANT_ANT
  // (include/permonst.h LOW_PM == NON_PM+1; src/dog.c:226 "static init yields 0").
  assert.equal(MONS[0].pm, 0);
  assert.equal(MONS[0].bn, 'PM_GIANT_ANT');
  assert.equal(MONS[0].name, 'giant ant');
  assert.equal(MONS[PM_QUEEN_BEE].name, 'queen bee');
  assert.equal(MONS.length, NUMMONS);
  assert.equal(HIGH_PM, NUMMONS - 1);
  // include/permonst.h: SPECIAL_PM == PM_LONG_WORM_TAIL
  assert.equal(SPECIAL_PM, PM_LONG_WORM_TAIL);
  assert.equal(MONS[PM_LONG_WORM_TAIL].name, 'long worm tail');
  // contiguous, unique, self-consistent indices
  const seen = new Set();
  MONS.forEach((m, i) => {
    assert.equal(m.pm, i, `pm index mismatch for ${m.bn}`);
    assert.equal(m.attacks.length, NATTK, `attack count for ${m.bn}`);
    assert.ok(!seen.has(m.bn), `duplicate basename ${m.bn}`);
    seen.add(m.bn);
    assert.equal(PM.get(m.bn), i, `PM map mismatch for ${m.bn}`);
  });
  // exactly one entry per enum value
  assert.equal(seen.size, MONS.length);
  if (C_MONSTERS_H) {
    const liveCount = countLiveMonEntries(C_MONSTERS_H);
    assert.equal(MONS.length, liveCount,
      'MONS.length must equal the number of live MON() entries in include/monsters.h');
  } else {
    assertCount.todo('monsters.h not found in checkout; cannot recount MON() entries');
  }
});

/* Spot checks: every listed field transcribed from include/monsters.h for the
 * named monster. attacks rows are [aatyp, adtyp, damn, damd] in C order. */
const SPOT_CHECKS = [
{ idx: 0, bn: 'PM_GIANT_ANT', name: 'giant ant', names: null, sym: 'a', mlet: 1, lvl: 2, mmove: 18, ac: 3, mr: 0, align: 0, geno: 0x00A3, attacks: [[2,0,1,4],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 10, nutrition: 10, sound: 0, size: 0, mres: 0x00, cres: 0x00, m1: 541335552, m2: 1048576, m3: 0, difficulty: 4, color: 3 },
{ idx: 1, bn: 'PM_KILLER_BEE', name: 'killer bee', names: null, sym: 'a', mlet: 1, lvl: 1, mmove: 18, ac: -1, mr: 0, align: 0, geno: 0x0062, attacks: [[6,7,1,3],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 1, nutrition: 5, sound: 10, size: 0, mres: 0x20, cres: 0x20, m1: 268705793, m2: 1179648, m3: 0, difficulty: 6, color: 11 },
{ idx: 2, bn: 'PM_SOLDIER_ANT', name: 'soldier ant', names: null, sym: 'a', mlet: 1, lvl: 3, mmove: 18, ac: 3, mr: 0, align: 0, geno: 0x00A2, attacks: [[2,0,2,4],[6,7,3,4],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 20, nutrition: 5, sound: 0, size: 0, mres: 0x20, cres: 0x20, m1: 809771008, m2: 1048576, m3: 0, difficulty: 7, color: 4 },
{ idx: 6, bn: 'PM_ACID_BLOB', name: 'acid blob', names: null, sym: 'b', mlet: 2, lvl: 1, mmove: 3, ac: 8, mr: 0, align: 0, geno: 0x0022, attacks: [[0,8,1,8],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 30, nutrition: 10, sound: 0, size: 0, mres: 0xE4, cres: 0xC0, m1: 134345732, m2: 8650752, m3: 0, difficulty: 2, color: 2 },
{ idx: 8, bn: 'PM_GELATINOUS_CUBE', name: 'gelatinous cube', names: null, sym: 'b', mlet: 2, lvl: 6, mmove: 6, ac: 8, mr: 0, align: 0, geno: 0x0022, attacks: [[5,14,2,4],[0,14,1,4],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 600, nutrition: 150, sound: 0, size: 3, mres: 0xF7, cres: 0x17, m1: 1744957440, m2: 9699328, m3: 0, difficulty: 8, color: 6 },
{ idx: 28, bn: 'PM_FLOATING_EYE', name: 'floating eye', names: null, sym: 'e', mlet: 5, lvl: 2, mmove: 1, ac: 9, mr: 10, align: 0, geno: 0x0025, attacks: [[0,14,0,70],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 10, nutrition: 10, sound: 0, size: 1, mres: 0x00, cres: 0x00, m1: 59905, m2: 1310720, m3: 512, difficulty: 3, color: 4 },
{ idx: 29, bn: 'PM_FREEZING_SPHERE', name: 'freezing sphere', names: null, sym: 'e', mlet: 5, lvl: 6, mmove: 13, ac: 4, mr: 0, align: 0, geno: 0x0832, attacks: [[13,3,4,6],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 10, nutrition: 10, sound: 0, size: 1, mres: 0x02, cres: 0x02, m1: 125953, m2: 1310720, m3: 512, difficulty: 9, color: 15 },
{ idx: 12, bn: 'PM_JACKAL', name: 'jackal', names: null, sym: 'd', mlet: 4, lvl: 0, mmove: 12, ac: 7, mr: 0, align: 0, geno: 0x00A3, attacks: [[2,0,1,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 300, nutrition: 250, sound: 1, size: 1, mres: 0x00, cres: 0x00, m1: 537141248, m2: 1048576, m3: 512, difficulty: 1, color: 3 },
{ idx: 16, bn: 'PM_LITTLE_DOG', name: 'little dog', names: null, sym: 'd', mlet: 4, lvl: 2, mmove: 18, ac: 6, mr: 0, align: 0, geno: 0x0021, attacks: [[2,0,1,6],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 150, nutrition: 150, sound: 1, size: 1, mres: 0x00, cres: 0x00, m1: 537141248, m2: 4194304, m3: 512, difficulty: 3, color: 15 },
{ idx: 34, bn: 'PM_JAGUAR', name: 'jaguar', names: null, sym: 'f', mlet: 6, lvl: 4, mmove: 15, ac: 6, mr: 0, align: 0, geno: 0x0022, attacks: [[1,0,1,4],[1,0,1,4],[2,0,1,8],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 600, nutrition: 300, sound: 5, size: 3, mres: 0x00, cres: 0x00, m1: 537141248, m2: 1048576, m3: 768, difficulty: 6, color: 3 },
{ idx: 40, bn: 'PM_GREMLIN', name: 'gremlin', names: null, sym: 'g', mlet: 7, lvl: 5, mmove: 12, ac: 2, mr: 25, align: -9, geno: 0x0022, attacks: [[1,0,1,6],[1,0,1,6],[2,0,1,4],[1,253,0,0],[0,0,0,0],[0,0,0,0]], weight: 100, nutrition: 20, sound: 20, size: 1, mres: 0x20, cres: 0x20, m1: 268566530, m2: 16777216, m3: 512, difficulty: 8, color: 2 },
{ idx: 43, bn: 'PM_HOBBIT', name: 'hobbit', names: null, sym: 'h', mlet: 8, lvl: 1, mmove: 9, ac: 10, mr: 0, align: 6, geno: 0x0022, attacks: [[254,0,1,6],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 500, nutrition: 200, sound: 25, size: 1, mres: 0x00, cres: 0x00, m1: 1610743808, m2: 1073741824, m3: 768, difficulty: 2, color: 2 },
{ idx: 44, bn: 'PM_DWARF', name: 'dwarf', names: null, sym: 'h', mlet: 8, lvl: 2, mmove: 6, ac: 10, mr: 10, align: 4, geno: 0x0023, attacks: [[254,0,1,8],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 900, nutrition: 300, sound: 25, size: 2, mres: 0x00, cres: 0x00, m1: 1610743904, m2: 1946157088, m3: 768, difficulty: 4, color: 1 },
{ idx: 46, bn: 'PM_DWARF_LEADER', name: 'dwarf leader', names: ['dwarf lord','dwarf lady','dwarf leader'], sym: 'h', mlet: 8, lvl: 4, mmove: 6, ac: 10, mr: 10, align: 5, geno: 0x0022, attacks: [[254,0,2,4],[254,0,2,4],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 900, nutrition: 300, sound: 25, size: 2, mres: 0x00, cres: 0x00, m1: 1610743904, m2: 1946158112, m3: 768, difficulty: 6, color: 4 },
{ idx: 48, bn: 'PM_MIND_FLAYER', name: 'mind flayer', names: null, sym: 'h', mlet: 8, lvl: 9, mmove: 12, ac: 5, mr: 90, align: -8, geno: 0x0021, attacks: [[254,0,1,4],[16,32,2,1],[16,32,2,1],[16,32,2,1],[0,0,0,0],[0,0,0,0]], weight: 1450, nutrition: 400, sound: 9, size: 2, mres: 0x00, cres: 0x00, m1: 1627521025, m2: 1913651200, m3: 768, difficulty: 13, color: 13 },
{ idx: 49, bn: 'PM_MASTER_MIND_FLAYER', name: 'master mind flayer', names: null, sym: 'h', mlet: 8, lvl: 13, mmove: 12, ac: 0, mr: 90, align: -8, geno: 0x0021, attacks: [[254,0,1,8],[16,32,2,1],[16,32,2,1],[16,32,2,1],[16,32,2,1],[16,32,2,1]], weight: 1450, nutrition: 400, sound: 9, size: 2, mres: 0x00, cres: 0x00, m1: 1627521025, m2: 1913651200, m3: 768, difficulty: 19, color: 13 },
{ idx: 50, bn: 'PM_MANES', name: 'manes', names: null, sym: 'i', mlet: 9, lvl: 1, mmove: 3, ac: 7, mr: 0, align: -7, geno: 0x0071, attacks: [[1,0,1,3],[1,0,1,3],[2,0,1,4],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 100, nutrition: 100, sound: 0, size: 1, mres: 0x24, cres: 0x00, m1: 268435456, m2: 17825792, m3: 768, difficulty: 3, color: 1 },
{ idx: 51, bn: 'PM_HOMUNCULUS', name: 'homunculus', names: null, sym: 'i', mlet: 9, lvl: 2, mmove: 12, ac: 6, mr: 10, align: -7, geno: 0x0022, attacks: [[2,4,1,3],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 60, nutrition: 100, sound: 0, size: 0, mres: 0x24, cres: 0x24, m1: 268435457, m2: 16777216, m3: 768, difficulty: 3, color: 2 },
{ idx: 56, bn: 'PM_BLUE_JELLY', name: 'blue jelly', names: null, sym: 'j', mlet: 10, lvl: 4, mmove: 0, ac: 8, mr: 10, align: 0, geno: 0x0022, attacks: [[0,3,0,6],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 50, nutrition: 20, sound: 0, size: 2, mres: 0x22, cres: 0x22, m1: 130052, m2: 1310720, m3: 0, difficulty: 5, color: 4 },
{ idx: 59, bn: 'PM_KOBOLD', name: 'kobold', names: null, sym: 'k', mlet: 11, lvl: 0, mmove: 6, ac: 10, mr: 0, align: -2, geno: 0x0021, attacks: [[254,0,1,4],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 400, nutrition: 100, sound: 24, size: 1, mres: 0x20, cres: 0x00, m1: 1879179264, m2: 1074790400, m3: 768, difficulty: 1, color: 3 },
{ idx: 62, bn: 'PM_KOBOLD_SHAMAN', name: 'kobold shaman', names: null, sym: 'k', mlet: 11, lvl: 2, mmove: 6, ac: 6, mr: 10, align: -4, geno: 0x0021, attacks: [[255,241,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 450, nutrition: 150, sound: 24, size: 1, mres: 0x20, cres: 0x00, m1: 1879179264, m2: 2148532224, m3: 768, difficulty: 4, color: 12 },
{ idx: 63, bn: 'PM_LEPRECHAUN', name: 'leprechaun', names: null, sym: 'l', mlet: 12, lvl: 5, mmove: 15, ac: 8, mr: 20, align: 0, geno: 0x0024, attacks: [[1,20,1,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 60, nutrition: 30, sound: 20, size: 0, mres: 0x00, cres: 0x00, m1: 33685504, m2: 269484032, m3: 512, difficulty: 4, color: 2 },
{ idx: 64, bn: 'PM_SMALL_MIMIC', name: 'small mimic', names: null, sym: 'm', mlet: 13, lvl: 7, mmove: 3, ac: 7, mr: 0, align: 0, geno: 0x0022, attacks: [[1,0,3,4],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 300, nutrition: 200, sound: 0, size: 2, mres: 0x40, cres: 0x00, m1: 539292932, m2: 1048576, m3: 0, difficulty: 8, color: 3 },
{ idx: 67, bn: 'PM_WOOD_NYMPH', name: 'wood nymph', names: null, sym: 'n', mlet: 14, lvl: 3, mmove: 12, ac: 9, mr: 20, align: 0, geno: 0x0022, attacks: [[1,21,0,0],[1,22,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 600, nutrition: 300, sound: 31, size: 2, mres: 0x00, cres: 0x00, m1: 33685504, m2: 1074921472, m3: 512, difficulty: 5, color: 2 },
{ idx: 70, bn: 'PM_GOBLIN', name: 'goblin', names: null, sym: 'o', mlet: 15, lvl: 0, mmove: 6, ac: 10, mr: 0, align: -3, geno: 0x0022, attacks: [[254,0,1,4],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 400, nutrition: 100, sound: 24, size: 1, mres: 0x00, cres: 0x00, m1: 1610743808, m2: 1073741952, m3: 768, difficulty: 1, color: 7 },
{ idx: 72, bn: 'PM_ORC', name: 'orc', names: null, sym: 'o', mlet: 15, lvl: 1, mmove: 9, ac: 10, mr: 0, align: -3, geno: 0x0260, attacks: [[254,0,1,8],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 850, nutrition: 150, sound: 24, size: 2, mres: 0x20, cres: 0x00, m1: 1610743808, m2: 1946157185, m3: 768, difficulty: 3, color: 1 },
{ idx: 75, bn: 'PM_URUK_HAI', name: 'Uruk-hai', names: null, sym: 'o', mlet: 15, lvl: 3, mmove: 7, ac: 10, mr: 0, align: -4, geno: 0x0061, attacks: [[254,0,1,8],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 1300, nutrition: 300, sound: 24, size: 2, mres: 0x20, cres: 0x00, m1: 1610743808, m2: 1946157184, m3: 768, difficulty: 5, color: 0 },
{ idx: 79, bn: 'PM_IRON_PIERCER', name: 'iron piercer', names: null, sym: 'p', mlet: 16, lvl: 5, mmove: 1, ac: 0, mr: 0, align: 0, geno: 0x0022, attacks: [[2,0,3,6],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 400, nutrition: 300, sound: 0, size: 2, mres: 0x00, cres: 0x00, m1: 537164048, m2: 1048576, m3: 0, difficulty: 6, color: 6 },
{ idx: 94, bn: 'PM_CAVE_SPIDER', name: 'cave spider', names: null, sym: 's', mlet: 19, lvl: 1, mmove: 12, ac: 3, mr: 0, align: 0, geno: 0x00A2, attacks: [[2,0,1,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 50, nutrition: 50, sound: 0, size: 0, mres: 0x20, cres: 0x20, m1: 541335680, m2: 1048576, m3: 0, difficulty: 3, color: 7 },
{ idx: 96, bn: 'PM_GIANT_SPIDER', name: 'giant spider', names: null, sym: 's', mlet: 19, lvl: 5, mmove: 15, ac: 4, mr: 0, align: 0, geno: 0x0021, attacks: [[2,7,2,4],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 200, nutrition: 100, sound: 0, size: 3, mres: 0x20, cres: 0x20, m1: 809771008, m2: 68157440, m3: 0, difficulty: 7, color: 5 },
{ idx: 97, bn: 'PM_SCORPION', name: 'scorpion', names: null, sym: 's', mlet: 19, lvl: 5, mmove: 15, ac: 3, mr: 0, align: 0, geno: 0x0022, attacks: [[1,0,1,2],[1,0,1,2],[6,7,1,4],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 50, nutrition: 100, sound: 0, size: 1, mres: 0x20, cres: 0x20, m1: 809771136, m2: 1048576, m3: 0, difficulty: 8, color: 1 },
{ idx: 218, bn: 'PM_PIT_VIPER', name: 'pit viper', names: null, sym: 'S', mlet: 45, lvl: 6, mmove: 15, ac: 2, mr: 0, align: 0, geno: 0x0021, attacks: [[2,7,1,4],[2,7,1,4],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 100, nutrition: 60, sound: 9, size: 2, mres: 0x20, cres: 0x20, m1: 810313858, m2: 1048576, m3: 256, difficulty: 9, color: 4 },
{ idx: 219, bn: 'PM_COBRA', name: 'cobra', names: null, sym: 'S', mlet: 45, lvl: 6, mmove: 18, ac: 2, mr: 0, align: 0, geno: 0x0021, attacks: [[2,7,2,4],[10,11,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 250, nutrition: 100, sound: 9, size: 2, mres: 0x20, cres: 0x20, m1: 810313858, m2: 1048576, m3: 0, difficulty: 10, color: 4 },
{ idx: 220, bn: 'PM_TROLL', name: 'troll', names: null, sym: 'T', mlet: 46, lvl: 7, mmove: 12, ac: 4, mr: 0, align: -3, geno: 0x0022, attacks: [[254,0,4,2],[1,0,4,2],[2,0,2,6],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 800, nutrition: 350, sound: 11, size: 3, mres: 0x00, cres: 0x00, m1: 545390592, m2: 84934656, m3: 768, difficulty: 9, color: 3 },
{ idx: 221, bn: 'PM_ICE_TROLL', name: 'ice troll', names: null, sym: 'T', mlet: 46, lvl: 9, mmove: 10, ac: 2, mr: 20, align: -3, geno: 0x0821, attacks: [[254,0,2,6],[1,3,2,6],[2,0,2,6],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 1000, nutrition: 300, sound: 11, size: 3, mres: 0x02, cres: 0x02, m1: 545390592, m2: 84934656, m3: 768, difficulty: 12, color: 15 },
{ idx: 225, bn: 'PM_UMBER_HULK', name: 'umber hulk', names: null, sym: 'U', mlet: 47, lvl: 9, mmove: 6, ac: 2, mr: 25, align: 0, geno: 0x0022, attacks: [[1,0,3,4],[1,0,3,4],[2,0,2,5],[15,25,0,0],[0,0,0,0],[0,0,0,0]], weight: 1200, nutrition: 500, sound: 0, size: 3, mres: 0x00, cres: 0x00, m1: 536870944, m2: 67108864, m3: 512, difficulty: 12, color: 3 },
{ idx: 129, bn: 'PM_VAMPIRE_BAT', name: 'vampire bat', names: null, sym: 'B', mlet: 28, lvl: 5, mmove: 20, ac: 6, mr: 0, align: 0, geno: 0x0022, attacks: [[2,0,1,6],[2,7,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 30, nutrition: 20, sound: 6, size: 1, mres: 0x24, cres: 0x00, m1: 1887707137, m2: 1048576, m3: 512, difficulty: 7, color: 0 },
{ idx: 226, bn: 'PM_VAMPIRE', name: 'vampire', names: null, sym: 'V', mlet: 48, lvl: 10, mmove: 12, ac: 1, mr: 25, align: -8, geno: 0x0031, attacks: [[1,0,1,6],[2,15,1,6],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 1450, nutrition: 400, sound: 32, size: 2, mres: 0x24, cres: 0x00, m1: 276956161, m2: 118505474, m3: 512, difficulty: 12, color: 1 },
{ idx: 106, bn: 'PM_FOG_CLOUD', name: 'fog cloud', names: null, sym: 'v', mlet: 22, lvl: 3, mmove: 1, ac: 0, mr: 0, align: 0, geno: 0x0032, attacks: [[11,0,1,6],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 0, nutrition: 0, sound: 0, size: 4, mres: 0xA4, cres: 0x00, m1: 1176581, m2: 1310720, m3: 0, difficulty: 4, color: 7 },
{ idx: 154, bn: 'PM_AIR_ELEMENTAL', name: 'air elemental', names: null, sym: 'E', mlet: 31, lvl: 8, mmove: 36, ac: 2, mr: 30, align: 0, geno: 0x0011, attacks: [[11,0,1,10],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 0, nutrition: 0, sound: 0, size: 4, mres: 0xA0, cres: 0x00, m1: 1176577, m2: 67371008, m3: 0, difficulty: 10, color: 6 },
{ idx: 156, bn: 'PM_EARTH_ELEMENTAL', name: 'earth elemental', names: null, sym: 'E', mlet: 31, lvl: 8, mmove: 6, ac: 2, mr: 30, align: 0, geno: 0x0011, attacks: [[1,0,4,6],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 2500, nutrition: 0, sound: 0, size: 4, mres: 0xA3, cres: 0x00, m1: 2225160, m2: 67371008, m3: 0, difficulty: 10, color: 3 },
{ idx: 153, bn: 'PM_STALKER', name: 'stalker', names: null, sym: 'E', mlet: 31, lvl: 8, mmove: 12, ac: 3, mr: 0, align: 0, geno: 0x0023, attacks: [[1,0,4,4],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 900, nutrition: 400, sound: 0, size: 3, mres: 0x00, cres: 0x00, m1: 17039361, m2: 93323264, m3: 256, difficulty: 9, color: 15 },
{ idx: 146, bn: 'PM_RED_DRAGON', name: 'red dragon', names: null, sym: 'D', mlet: 30, lvl: 15, mmove: 9, ac: -1, mr: 20, align: -4, geno: 0x0021, attacks: [[12,2,6,6],[2,0,3,8],[1,0,1,4],[1,0,1,4],[0,0,0,0],[0,0,0,0]], weight: 4500, nutrition: 1500, sound: 3, size: 7, mres: 0x01, cres: 0x01, m1: 559947777, m2: 3054501888, m3: 768, difficulty: 20, color: 1 },
{ idx: 145, bn: 'PM_SILVER_DRAGON', name: 'silver dragon', names: null, sym: 'D', mlet: 30, lvl: 15, mmove: 9, ac: -1, mr: 20, align: 4, geno: 0x0021, attacks: [[12,3,4,6],[2,0,3,8],[1,0,1,4],[1,0,1,4],[0,0,0,0],[0,0,0,0]], weight: 4500, nutrition: 1500, sound: 3, size: 7, mres: 0x02, cres: 0x00, m1: 559947777, m2: 3054501888, m3: 0, difficulty: 20, color: 14 },
{ idx: 136, bn: 'PM_BABY_RED_DRAGON', name: 'baby red dragon', names: null, sym: 'D', mlet: 30, lvl: 12, mmove: 9, ac: 2, mr: 10, align: 0, geno: 0x0020, attacks: [[2,0,2,6],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 1500, nutrition: 500, sound: 3, size: 4, mres: 0x01, cres: 0x00, m1: 538976257, m2: 873463808, m3: 512, difficulty: 13, color: 1 },
{ idx: 10, bn: 'PM_COCKATRICE', name: 'cockatrice', names: null, sym: 'c', mlet: 3, lvl: 5, mmove: 6, ac: 6, mr: 30, align: 0, geno: 0x0025, attacks: [[2,0,1,3],[5,18,0,0],[0,18,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 30, nutrition: 30, sound: 9, size: 1, mres: 0xA0, cres: 0xA0, m1: 1615077376, m2: 1048576, m3: 512, difficulty: 8, color: 11 },
{ idx: 9, bn: 'PM_CHICKATRICE', name: 'chickatrice', names: null, sym: 'c', mlet: 3, lvl: 4, mmove: 4, ac: 8, mr: 30, align: 0, geno: 0x00A1, attacks: [[2,0,1,2],[5,18,0,0],[0,18,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 10, nutrition: 10, sound: 9, size: 0, mres: 0xA0, cres: 0xA0, m1: 1610883072, m2: 1048576, m3: 512, difficulty: 7, color: 3 },
{ idx: 11, bn: 'PM_PYROLISK', name: 'pyrolisk', names: null, sym: 'c', mlet: 3, lvl: 6, mmove: 6, ac: 6, mr: 30, align: 0, geno: 0x0021, attacks: [[15,2,2,6],[2,0,1,6],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 30, nutrition: 30, sound: 9, size: 1, mres: 0x21, cres: 0x21, m1: 1615077376, m2: 1048576, m3: 512, difficulty: 8, color: 1 },
{ idx: 212, bn: 'PM_RUST_MONSTER', name: 'rust monster', names: null, sym: 'R', mlet: 44, lvl: 5, mmove: 18, ac: 2, mr: 0, align: 0, geno: 0x0022, attacks: [[5,24,0,0],[5,24,0,0],[0,24,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 1000, nutrition: 250, sound: 0, size: 2, mres: 0x00, cres: 0x00, m1: 2147753986, m2: 1048576, m3: 512, difficulty: 8, color: 3 },
{ idx: 213, bn: 'PM_DISENCHANTER', name: 'disenchanter', names: null, sym: 'R', mlet: 44, lvl: 12, mmove: 12, ac: -10, mr: 0, align: -3, geno: 0x0422, attacks: [[1,41,4,4],[0,41,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 750, nutrition: 200, sound: 5, size: 3, mres: 0x00, cres: 0x00, m1: 537133056, m2: 1048576, m3: 512, difficulty: 14, color: 4 },
{ idx: 232, bn: 'PM_XORN', name: 'xorn', names: null, sym: 'X', mlet: 50, lvl: 8, mmove: 9, ac: -2, mr: 20, align: 0, geno: 0x0021, attacks: [[1,0,1,3],[1,0,1,3],[1,0,1,3],[2,0,4,6],[0,0,0,0],[0,0,0,0]], weight: 1200, nutrition: 700, sound: 3, size: 2, mres: 0x83, cres: 0x80, m1: 2149581832, m2: 68157440, m3: 0, difficulty: 11, color: 3 },
{ idx: 125, bn: 'PM_ARCHON', name: 'Archon', names: null, sym: 'A', mlet: 27, lvl: 19, mmove: 16, ac: -6, mr: 80, align: 15, geno: 0x0811, attacks: [[254,0,2,4],[254,0,2,4],[15,11,2,6],[1,0,1,8],[255,241,4,6],[0,0,0,0]], weight: 1450, nutrition: 400, sound: 34, size: 3, mres: 0x37, cres: 0x00, m1: 25296897, m2: 3338671105, m3: 768, difficulty: 26, color: 5 },
{ idx: 285, bn: 'PM_WIZARD_OF_YENDOR', name: 'Wizard of Yendor', names: null, sym: '@', mlet: 53, lvl: 30, mmove: 12, ac: -8, mr: 100, align: -128, geno: 0x1200, attacks: [[1,252,2,12],[255,241,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 1450, nutrition: 400, sound: 34, size: 2, mres: 0x21, cres: 0x21, m1: 1736573953, m2: 2249263113, m3: 607, difficulty: 34, color: 13 },
{ idx: 271, bn: 'PM_SHOPKEEPER', name: 'shopkeeper', names: null, sym: '@', mlet: 53, lvl: 12, mmove: 16, ac: 0, mr: 50, align: 0, geno: 0x0200, attacks: [[254,0,4,4],[254,0,4,4],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 1450, nutrition: 400, sound: 39, size: 2, mres: 0x00, cres: 0x00, m1: 1610743808, m2: 3290431497, m3: 512, difficulty: 15, color: 15 },
{ idx: 274, bn: 'PM_ORACLE', name: 'Oracle', names: null, sym: '@', mlet: 53, lvl: 12, mmove: 0, ac: 0, mr: 50, align: 0, geno: 0x1200, attacks: [[0,1,0,4],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 1450, nutrition: 400, sound: 40, size: 2, mres: 0x00, cres: 0x00, m1: 1610743808, m2: 2228233, m3: 512, difficulty: 13, color: 12 },
{ idx: 284, bn: 'PM_MEDUSA', name: 'Medusa', names: null, sym: '@', mlet: 53, lvl: 20, mmove: 12, ac: 2, mr: 50, align: -15, geno: 0x1200, attacks: [[254,0,2,4],[1,0,1,8],[15,18,0,0],[2,7,1,6],[0,0,0,0],[0,0,0,0]], weight: 1450, nutrition: 400, sound: 9, size: 3, mres: 0xA0, cres: 0xA0, m1: 1879179779, m2: 68812801, m3: 576, difficulty: 25, color: 10 },
{ idx: 286, bn: 'PM_CROESUS', name: 'Croesus', names: null, sym: '@', mlet: 53, lvl: 20, mmove: 15, ac: 0, mr: 40, align: 15, geno: 0x1200, attacks: [[254,0,4,10],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 1450, nutrition: 400, sound: 28, size: 2, mres: 0x00, cres: 0x00, m1: 1627521024, m2: 4145612809, m3: 512, difficulty: 22, color: 5 },
{ idx: 311, bn: 'PM_DEATH', name: 'Death', names: null, sym: '&', mlet: 56, lvl: 30, mmove: 12, ac: -5, mr: 100, align: 0, geno: 0x1200, attacks: [[5,37,8,8],[5,37,8,8],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 1450, nutrition: 1, sound: 35, size: 2, mres: 0xB7, cres: 0x00, m1: 92405761, m2: 119013377, m3: 1792, difficulty: 34, color: 13 },
{ idx: 312, bn: 'PM_PESTILENCE', name: 'Pestilence', names: null, sym: '&', mlet: 56, lvl: 30, mmove: 12, ac: -5, mr: 100, align: 0, geno: 0x1200, attacks: [[5,38,8,8],[5,38,8,8],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 1450, nutrition: 1, sound: 35, size: 2, mres: 0xB7, cres: 0x00, m1: 92405761, m2: 119013377, m3: 1792, difficulty: 34, color: 13 },
{ idx: 239, bn: 'PM_KOBOLD_ZOMBIE', name: 'kobold zombie', names: null, sym: 'Z', mlet: 52, lvl: 0, mmove: 6, ac: 10, mr: 0, align: -2, geno: 0x0031, attacks: [[1,0,1,4],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 400, nutrition: 50, sound: 44, size: 1, mres: 0x26, cres: 0x00, m1: 268633088, m2: 17825794, m3: 256, difficulty: 1, color: 3 },
{ idx: 248, bn: 'PM_SKELETON', name: 'skeleton', names: null, sym: 'Z', mlet: 52, lvl: 12, mmove: 8, ac: 4, mr: 0, align: 0, geno: 0x0210, attacks: [[254,0,2,6],[5,13,1,6],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 300, nutrition: 5, sound: 19, size: 2, mres: 0xA6, cres: 0x00, m1: 2294784, m2: 1183842306, m3: 256, difficulty: 14, color: 15 },
{ idx: 183, bn: 'PM_LICH', name: 'lich', names: null, sym: 'L', mlet: 38, lvl: 11, mmove: 6, ac: 0, mr: 30, align: -9, geno: 0x0031, attacks: [[5,3,1,10],[255,241,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 1200, nutrition: 100, sound: 21, size: 2, mres: 0x26, cres: 0x02, m1: 276956160, m2: 2148532226, m3: 256, difficulty: 14, color: 3 },
{ idx: 184, bn: 'PM_DEMILICH', name: 'demilich', names: null, sym: 'L', mlet: 38, lvl: 14, mmove: 9, ac: -2, mr: 60, align: -12, geno: 0x0031, attacks: [[5,3,3,4],[255,241,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 1200, nutrition: 100, sound: 21, size: 2, mres: 0x26, cres: 0x02, m1: 276956160, m2: 2148532226, m3: 256, difficulty: 18, color: 1 },
{ idx: 279, bn: 'PM_NURSE', name: 'nurse', names: null, sym: '@', mlet: 53, lvl: 11, mmove: 6, ac: 0, mr: 0, align: 0, geno: 0x0023, attacks: [[1,27,2,6],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 1450, nutrition: 400, sound: 30, size: 2, mres: 0x20, cres: 0x20, m1: 1610743808, m2: 1048585, m3: 512, difficulty: 13, color: 15 },
{ idx: 314, bn: 'PM_MAIL_DAEMON', name: 'mail daemon', names: null, sym: '&', mlet: 56, lvl: 56, mmove: 24, ac: 10, mr: 127, align: 0, geno: 0x0210, attacks: [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 600, nutrition: 300, sound: 0, size: 2, mres: 0xB7, cres: 0x00, m1: 285344771, m2: 18874369, m3: 768, difficulty: 26, color: 12 },
{ idx: 315, bn: 'PM_DJINNI', name: 'djinni', names: null, sym: '&', mlet: 56, lvl: 7, mmove: 12, ac: 4, mr: 30, align: 0, geno: 0x0210, attacks: [[254,0,2,8],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 1500, nutrition: 400, sound: 29, size: 2, mres: 0xA0, cres: 0x00, m1: 268566529, m2: 1090519041, m3: 512, difficulty: 8, color: 11 },
{ idx: 321, bn: 'PM_KRAKEN', name: 'kraken', names: null, sym: ';', mlet: 57, lvl: 20, mmove: 3, ac: 6, mr: 0, align: -3, geno: 0x0220, attacks: [[1,0,2,4],[1,0,2,4],[7,28,2,6],[2,0,5,4],[0,0,0,0],[0,0,0,0]], weight: 1800, nutrition: 1000, sound: 0, size: 4, mres: 0x00, cres: 0x00, m1: 537141762, m2: 68157441, m3: 512, difficulty: 22, color: 1 },
{ idx: 169, bn: 'PM_GIANT', name: 'giant', names: null, sym: 'H', mlet: 34, lvl: 6, mmove: 6, ac: 0, mr: 0, align: 2, geno: 0x0221, attacks: [[254,0,2,10],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 2250, nutrition: 750, sound: 43, size: 4, mres: 0x00, cres: 0x00, m1: 537001984, m2: 1845501952, m3: 768, difficulty: 8, color: 1 },
{ idx: 264, bn: 'PM_ELF', name: 'elf', names: null, sym: '@', mlet: 53, lvl: 0, mmove: 12, ac: 10, mr: 2, align: -3, geno: 0x0200, attacks: [[254,0,1,8],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 800, nutrition: 350, sound: 25, size: 2, mres: 0x04, cres: 0x04, m1: 1627521024, m2: 1073741841, m3: 768, difficulty: 1, color: 15 },
{ idx: 260, bn: 'PM_HUMAN', name: 'human', names: null, sym: '@', mlet: 53, lvl: 0, mmove: 12, ac: 10, mr: 0, align: 0, geno: 0x0200, attacks: [[254,0,1,6],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 1450, nutrition: 400, sound: 25, size: 2, mres: 0x00, cres: 0x00, m1: 1610743808, m2: 1140850697, m3: 512, difficulty: 2, color: 15 },
{ idx: 327, bn: 'PM_CHAMELEON', name: 'chameleon', names: null, sym: ':', mlet: 58, lvl: 6, mmove: 5, ac: 6, mr: 10, align: 0, geno: 0x0022, attacks: [[2,0,4,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 100, nutrition: 100, sound: 0, size: 0, mres: 0x00, cres: 0x00, m1: 537141248, m2: 1064961, m3: 0, difficulty: 7, color: 3 },
{ idx: 382, bn: 'PM_APPRENTICE', name: 'apprentice', names: null, sym: '@', mlet: 53, lvl: 5, mmove: 12, ac: 10, mr: 30, align: 0, geno: 0x0200, attacks: [[254,0,1,6],[255,241,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 1450, nutrition: 400, sound: 38, size: 2, mres: 0x00, cres: 0x00, m1: 1610743808, m2: 3290431497, m3: 512, difficulty: 8, color: 15 },
{ idx: 355, bn: 'PM_NORN', name: 'Norn', names: null, sym: '@', mlet: 53, lvl: 20, mmove: 15, ac: 0, mr: 90, align: 0, geno: 0x1200, attacks: [[254,0,4,10],[254,0,4,10],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 1800, nutrition: 550, sound: 36, size: 4, mres: 0x02, cres: 0x00, m1: 1610743808, m2: 3290562569, m3: 640, difficulty: 24, color: 5 },
{ idx: 328, bn: 'PM_CROCODILE', name: 'crocodile', names: null, sym: ':', mlet: 58, lvl: 6, mmove: 9, ac: 5, mr: 0, align: 0, geno: 0x0021, attacks: [[2,0,4,2],[1,0,1,12],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 1450, nutrition: 400, sound: 4, size: 3, mres: 0x00, cres: 0x00, m1: 543433218, m2: 68157440, m3: 0, difficulty: 7, color: 3 },
{ idx: 290, bn: 'PM_AMOROUS_DEMON', name: 'amorous demon', names: ['incubus','succubus','amorous demon'], sym: '&', mlet: 56, lvl: 6, mmove: 12, ac: 0, mr: 70, align: -9, geno: 0x0011, attacks: [[2,35,0,0],[1,0,1,3],[1,0,1,3],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 1450, nutrition: 400, sound: 31, size: 2, mres: 0x21, cres: 0x00, m1: 268566529, m2: 51380480, m3: 768, difficulty: 8, color: 7 },
{ idx: 98, bn: 'PM_LURKER_ABOVE', name: 'lurker above', names: null, sym: 't', mlet: 20, lvl: 10, mmove: 3, ac: 3, mr: 0, align: 0, geno: 0x0022, attacks: [[11,28,1,6],[11,0,2,6],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 800, nutrition: 350, sound: 0, size: 4, mres: 0x00, cres: 0x00, m1: 537194753, m2: 84934656, m3: 0, difficulty: 12, color: 7 },
{ idx: 99, bn: 'PM_TRAPPER', name: 'trapper', names: null, sym: 't', mlet: 20, lvl: 12, mmove: 3, ac: 3, mr: 0, align: 0, geno: 0x0022, attacks: [[11,28,1,8],[11,0,2,8],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 800, nutrition: 350, sound: 0, size: 4, mres: 0x00, cres: 0x00, m1: 537194752, m2: 84934656, m3: 0, difficulty: 14, color: 2 },
{ idx: 115, bn: 'PM_PURPLE_WORM', name: 'purple worm', names: null, sym: 'w', mlet: 23, lvl: 15, mmove: 9, ac: 6, mr: 20, align: 0, geno: 0x0022, attacks: [[2,0,2,8],[11,26,1,10],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 2700, nutrition: 700, sound: 0, size: 7, mres: 0x00, cres: 0x00, m1: 541876224, m2: 101711872, m3: 0, difficulty: 17, color: 5 },
{ idx: 177, bn: 'PM_MINOTAUR', name: 'minotaur', names: null, sym: 'H', mlet: 34, lvl: 15, mmove: 15, ac: 6, mr: 0, align: 0, geno: 0x0220, attacks: [[1,0,3,10],[1,0,3,10],[4,0,2,8],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 1500, nutrition: 700, sound: 13, size: 3, mres: 0x00, cres: 0x00, m1: 537264128, m2: 101711872, m3: 768, difficulty: 17, color: 3 },
{ idx: 178, bn: 'PM_JABBERWOCK', name: 'jabberwock', names: null, sym: 'J', mlet: 36, lvl: 15, mmove: 12, ac: -2, mr: 50, align: 0, geno: 0x0021, attacks: [[2,0,2,10],[2,0,2,10],[1,0,2,10],[1,0,2,10],[0,0,0,0],[0,0,0,0]], weight: 1300, nutrition: 600, sound: 16, size: 3, mres: 0x00, cres: 0x00, m1: 537133057, m2: 1175453696, m3: 512, difficulty: 18, color: 9 },
{ idx: 302, bn: 'PM_BALROG', name: 'balrog', names: null, sym: '&', mlet: 56, lvl: 16, mmove: 5, ac: -2, mr: 75, align: -14, geno: 0x0411, attacks: [[254,0,8,4],[254,0,4,6],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 1450, nutrition: 400, sound: 0, size: 3, mres: 0x21, cres: 0x00, m1: 285212673, m2: 1192231168, m3: 768, difficulty: 20, color: 1 },
{ idx: 303, bn: 'PM_JUIBLEX', name: 'Juiblex', names: null, sym: '&', mlet: 56, lvl: 50, mmove: 3, ac: -7, mr: 65, align: -15, geno: 0x1610, attacks: [[11,33,4,10],[10,8,3,6],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], weight: 1500, nutrition: 0, sound: 15, size: 3, mres: 0xE1, cres: 0x00, m1: 419463685, m2: 51971329, m3: 321, difficulty: 26, color: 10 },
];

test('spot checks: 82 well-known monsters match C field-for-field', () => {
  for (const e of SPOT_CHECKS) {
    const m = MONS[e.idx];
    assert.equal(m.bn, e.bn, `${e.bn}: basename`);
    assert.equal(m.name, e.name, `${e.bn}: name`);
    assert.deepEqual(m.names, e.names, `${e.bn}: names`);
    assert.equal(m.sym, e.sym, `${e.bn}: sym letter`);
    assert.equal(m.mlet, e.mlet, `${e.bn}: S_ class`);
    assert.equal(m.lvl, e.lvl, `${e.bn}: mlevel`);
    assert.equal(m.mmove, e.mmove, `${e.bn}: mmove`);
    assert.equal(m.ac, e.ac, `${e.bn}: ac`);
    assert.equal(m.mr, e.mr, `${e.bn}: magic resistance`);
    assert.equal(m.align, e.align, `${e.bn}: alignment`);
    assert.equal(m.geno, e.geno, `${e.bn}: geno`);
    const atk = m.attacks.map((a) => [a.aatyp, a.adtyp, a.damn, a.damd]);
    assert.deepEqual(atk, e.attacks, `${e.bn}: attacks`);
    assert.equal(m.weight, e.weight, `${e.bn}: weight`);
    assert.equal(m.nutrition, e.nutrition, `${e.bn}: nutrition`);
    assert.equal(m.sound, e.sound, `${e.bn}: sound`);
    assert.equal(m.size, e.size, `${e.bn}: size`);
    assert.equal(m.mres, e.mres, `${e.bn}: mresists`);
    assert.equal(m.cres, e.cres, `${e.bn}: mconveys`);
    assert.equal(m.m1, e.m1, `${e.bn}: mflags1`);
    assert.equal(m.m2, e.m2, `${e.bn}: mflags2`);
    assert.equal(m.m3, e.m3, `${e.bn}: mflags3`);
    assert.equal(m.difficulty, e.difficulty, `${e.bn}: difficulty`);
    assert.equal(m.color, e.color, `${e.bn}: color`);
    assert.equal(PM.get(e.bn), e.idx, `${e.bn}: PM map`);
  }
});

test('mondata.h predicate spot checks', () => {
  assert.ok(is_giant(PM.get('PM_STORM_GIANT')));
  assert.ok(!is_giant(PM.get('PM_OGRE')));
  assert.ok(is_undead(PM.get('PM_KOBOLD_ZOMBIE')) && is_undead(PM.get('PM_LICH')));
  assert.ok(!is_undead(PM_GIANT_ANT));
  assert.ok(is_were(PM.get('PM_WERERAT')) && !is_were(PM_ACID_BLOB));
  assert.ok(touch_petrifies(PM_COCKATRICE) && touch_petrifies(PM_CHICKATRICE));
  assert.ok(!touch_petrifies(PM_MEDUSA) && flesh_petrifies(PM_MEDUSA)); // mondata.h:200-203
  assert.ok(breathless(PM.get('PM_LEATHER_GOLEM')) && !breathless(PM_GIANT_ANT));
  assert.ok(amorphous(PM_ACID_BLOB) && !amorphous(PM_GIANT_ANT));
  assert.ok(passes_walls(PM.get('PM_XORN')) && passes_walls(PM.get('PM_GHOST')));
  assert.ok(!passes_walls(PM_GIANT_ANT));
  assert.ok(species_regenerates(PM.get('PM_TROLL')));
  assert.equal(species_regenerates, regenerates);
  assert.ok(carnivore(PM.get('PM_LITTLE_DOG')) && herbivore(PM.get('PM_PONY')));
  assert.ok(metallivore(PM.get('PM_RUST_MONSTER')) && metallivore(PM.get('PM_XORN')));
  assert.ok(!metallivore(PM.get('PM_RED_DRAGON')));
  assert.ok(is_mercenary(PM.get('PM_SOLDIER')) && is_mercenary(PM.get('PM_WATCHMAN')));
  assert.ok(!is_mercenary(PM_GIANT_ANT));
  assert.ok(is_mindless(PM.get('PM_KOBOLD_ZOMBIE')) && !is_mindless(PM_WIZARD_OF_YENDOR));
  assert.equal(is_mindless, mindless);
});
