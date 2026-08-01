# C-parity audit: seed9006-minetown-shops (Wave-6, 2026-08-01)

Scope: sessions-extra/seed9006-minetown-shops.session.json — wizard visits
Izchak's lighting store in minetown: wish/gold, levelport set, wizmap,
position-teleports, door bumping, shop greeting, priced pickup, unpaid
teleport-theft, Keystone Kop swarm, keeper wand of striking, angry `#pay`
compensation, billing menu, drop-and-sell.

## Score trajectory

| state | RNG | screens | cursors |
|---|---|---|---|
| base (before this wave) | 6640/7003 (runner), first desync @rng[6521] step 88 | 69/111 | 101/111 |
| after this wave | runner 6660/7003, first desync @rng[6522] step 88 | 69/111 | 101/111 |

Public regression suite (`bash frozen/score.sh`): **44/44 passing** after every
intermediate commit on `slice/cont9006`.

## Ported / corrected this wave

All changes are in `js/allmain.js` and `js/cmd.js`, each with C refs inline.

1. allmain.js (~line 4764 region, processMonsterTurns): monster striking-wand
   zap deferred until the monster believes the hero adjacent.
   C refs: muse.c:1824 (use_offensive), mhitu.c:758-761 (called from
   mattacku), monmove.c:880-892 + 935-971 (phase-three movement gate and
   phase-four attack gate), mon.c:2476-2483 (monnear).  Without this, Izchak
   zapped during step 88 instead of moving, one full turn earlier than C.

2. allmain.js (shk/priest block): the in-shop `rn2(25)` parity roll now fires
   whenever the angry-following keeper stands in a shop room on the
   `shk_move()` return -1 path. C refs: monmove.c:1353-1356
   (m_search_items shop rule), shk.c:4941-4948 (return -1 case),
   monmove.c:1807-1828 (m_move fall-through). Justification is empirical + the
   C source order: the getitems gate did not conclusively explain the roll
   from source alone (see "remaining"), but the recorder trace shows the roll
   on every -1 keeper turn at steps 80 and 88.

3. allmain.js: `updateMonsterTrack()` on committed shk_move -1 moves only.
   C refs: monmove.c:2062 + 76-86 (mon_track_add only in m_move).

4. cmd.js (teleportCursor dir-key handling): auto-describe reports the
   seen glyph — an object pile's name/quantity ("7 candles", "a candle").
   C refs: getpos.c:865-867 (auto_describe), pager.c do_screen_description /
   lookat naming via doname()/xname() stack objects.

## Diagnostics / verification

- rng diff: `node sessions-extra/rng-diff.mjs <session>` —
  first positional mismatch now rng[6522].
- Step-level screens: `node sessions-extra/show-screen.mjs <session> <step>`.
- Monster-turn instrumentation: `PROCDBG=1 PROCDBG_WIN=a,b`,
  `MONDBG=1 MONDBG_WIN=a,b`, and `RNG_SITE=1` stack sites were already wired
  into jsmain/allmain and remain available.
- The local C recorder binary (`nethack-c/recorder/install/.../nethack` plus
  `nethack-c/build-recorder.sh`) does **not** reproduce the canonical session
  any more: init_dungeon RNG diverges from the recording at roll #202
  (dungeon.c:1022 vs 1074 — the chance-roll was gated differently when the
  canonical build was produced; the patch series has since moved on).  Do not
  rely on re-recording for ground truth; the session.json files remain the
  authority.

## Remaining unported / divergent (this subsystem)

1. **rng[6522]**: C's `rn2(16)=1 @ m_move(monmove.c:1963)` for the monster
   right after Izchak's shop-skip roll.  `4*(cnt-j)=16` is inconsistent with
   Izchak's candidate count at (24,8) under C's own mfndpos rules
   (mon.c:2140-2400); either the C keeper's state differs subtly from the JS
   model in a way the flat RNG trace can't reveal (candidate door/Kop-cell
   inclusion), or the roll belongs to a Kop whose processing order relative
   to Izchak differs transiently.  Requires a live C-reproduction environment
   to resolve.

2. Mimic-as-object visibility/memory: JS draws the small mimic's fake ']' at
   (21,12) via a "remembered && Chebyshev≤2" fallback while C shows terrain
   until PHYSICALLY_SEEN — proper port needs C's levl-glyph memory semantics
   (display.c:527-592, M_AP_OBJECT).  A first attempt regressed
   seed0116 (a level-revisit memory case), so the fallback remains.

3. getpos '.' selection keeps the auto-describe topline (C step 61) — minor.

4. Steps 88-110 screens all cascade from the rng[6522] desync; shop-flow items
   (angry compensation billing, sellobj sale offer) never become comparable.
