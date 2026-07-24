# seed9003-wizard-genocide — findings

## What the session covers

Wizard-mode genocide probe on seed 9003 (playmode:debug). All intended
actions verified in the C recording (inspect-session.mjs):

- `#wizwish` 2 blessed scrolls of genocide (→`o`), cursed scroll of
  genocide (→`p`).
- Read blessed #1 (`ro`): two --More--s ("As you read the scroll, it
  disappears." / "You have found a scroll of genocide!") then
  `do_class_genocide()` prompt; answer `L` (class symbol) → "Wiped out all
  liches. Wiped out all demiliches.--More--" "Wiped out all master liches.
  Wiped out all arch-liches." (4 species; no RNG in the class loop).
- `#genocided` → "Genocided species:" window, dismissed with space.
- Read blessed #2 (`ro`): only one --More-- (type already known); answer
  `n` → wood/water/mountain nymphs wiped. `#genocided` again.
- Read cursed (`rp`): `do_genocide(0)` asks "What *type* of monster…";
  answer `newt` → `rn1(3,4)` newts spawned around the hero
  ("Sent in some newts.") — heavy makemon/enexto RNG. Final `#genocided`.

C source references: blessed → `do_class_genocide()` (read.c:2638);
uncursed/cursed → `do_genocide(how)` (read.c:2826), cursed creation branch
at read.c:2997-3013 (`Sent in %s%s.`); listing via
`list_genocided()` (insight.c:3007).

## Final JS score

`node frozen/ps_test_runner.mjs sessions-extra/seed9003-wizard-genocide.session.json`
→ **RNG 2221/2493, Screen 112/152 (cells 114/152, cursors 131/152) — FAIL**

RNG matches 2213 calls deep (into step 84). JS does track the genocide
state correctly: its #genocided window lists the same 7 species.

## Divergence 1 (RNG, step 79/84): no WIS exercise for magic scroll reads

C rolls `rn2(19)=17 @ exercise(attrib.c:509)` once per magic scroll read
(`seffects()` → `exercise(A_WIS, TRUE) /* just for trying */`,
read.c:2200; 4 such calls in the recording). JS's scroll-read path never
calls its `exerciseAttribute` — its exercise system is purely periodic
(js/allmain.js:3351-3400, turn%10/turn%5), so the roll is missing and the
streams shift. Fix area: JS doread/seffects equivalent in js/cmd.js must
exercise A_WIS per `oc_magic` scroll.

## Divergence 2 (RNG, step 84+): monster turns lack mcalcmove; extra rn2(76)

C per turn: `rn2(12)=6 @ mcalcmove(mon.c:1164)` (movement points per
monster; 14 calls), `rn2(70)=62 @ maybe_generate_rnd_mon(allmain.c:166)`,
`rn2(400)=136 @ dosounds(sounds.c:213)`, `rn2(20)=1 @ gethungry(eat.c:3191)`.
JS per turn: `rn2(70)`, `rn2(400)`, `rn2(20)`, `rn2(76)` — JS has no
mcalcmove roll (its monsters never move; same root cause as the
seed9002 alchemy finding: js/allmain.js:9904 gates `processMonsterTurns()`
on `u.umovement < NORMAL_SPEED` and even when it runs there is no
movement-point roll), and JS emits an extra `rn2(76)` (likely its own
spawn/sound variant with a different table size than C's rn2(70)).

## Divergence 3 (RNG, step 134+): cursed-genocide spawn placement is RNG-free

C spends 225 calls at `rn2(11)=9 @ collect_coords(teleport.c:700)` with
decreasing moduli (11,10,9,…) — enexto's Fisher-Yates shuffle of
candidate spots for the `rn1(3,4)` newts. JS's `enextoMonsterSpot()`
(js/mklev.js:19333-19339) is a *deterministic first-fit* over
`collectEnextoCoords` with no rn2 at all: different (and partly invalid —
wall-row) spawn positions, zero RNG, and the JS post-spawn screen shows
none of the newts near @. Fix area: port enexto/collect_coords shuffling.

## Divergence 4 (screen, steps 79-83, 133): message batching without --More--

C: "As you read the scroll, it disappears.--More--" then
"You have found a scroll of genocide!--More--" — one message per --More--
cycle. JS concatenates whole action message lists with two spaces and no
intermediate mores (`endGenocidePrompt()` js/cmd.js:33733 does
`setMessage(messages.join('  '), more)`; same pattern in the read path).
Consequence: the recipe's padding spaces, consumed by --More-- in C, land
in the JS getlin echo ("What class of monsters do you want to genocide?
  L" vs C "? L") — answers still resolve (mungspaces trims), but screens
diverge at every padded answer (steps 82, 107, 129-132). Fix area: JS
pline/more pacing (one message at a time, --More-- when the line is busy).

## Divergence 5 (screen, steps 78/103/126): read prompt letters not compacted

C: "What do you want to read? [i-mop or ?*]" — consecutive-letter runs are
range-compressed. JS: "[ijklmop or ?*]" — the read prompt builder
(js/cmd.js:67152, `readInvalidMore` path, and the initial doread prompt)
uses raw `inventoryLetters(...)` and bypasses
`getobjPromptLetters()`/`compactInventoryLetters()` (js/cmd.js:10835).

## Divergence 6 (screen, steps 100/123/149): #genocided window rendering

C: title "Genocided species:", C's `vanqsort_cmp` order (arch-liches,
master liches, demiliches, liches, wood nymphs, water nymphs, mountain
nymphs), footer "7 species genocided.", then --More--. JS
(js/cmd.js:33391): title "Genocided monster types:", plain alphabetical
order (arch-liches, demiliches, liches, master liches, …), no footer,
different window placement. Fix areas: window title/footer text, sort
comparator, popup geometry.

## Suggested fix order

1. js/cmd.js scroll read: A_WIS exercise roll per magic scroll.
2. js/mklev.js enextoMonsterSpot → port collect_coords shuffle (biggest
   RNG block, 225 calls).
3. js/allmain.js monster-turn scheduling + mcalcmove (shared with
   seed9002 finding).
4. js/cmd.js message pacing (--More-- between action messages).
5. Cosmetic: read-prompt compaction, #genocided window title/sort/footer.
