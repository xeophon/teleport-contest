# seed9011-wizard-loot-chest — findings

## What the session covers

Wizard-mode container lifecycle, all on Dlvl:1 with a hostile newt nearby:

1. `#wizwish` "large box" — box creation incl. `olocked`/`otrapped` rolls and
   `mkbox_cnts` contents (5 items: scroll, 2 potions, 3 gem stacks).
2. Drop the box (`do`), encumbrance change messages.
3. `#wizwish` "skeleton key".
4. `a`pply key, direction `.` → "There is a large box here; unlock it?" →
   multi-turn picklock occupation → "You succeed in unlocking the box."
5. `#loot` → container menu ("Do what with the large box?") → `i` (put in) →
   category menu ("Put in what type of objects?") → `a` (all types) →
   objlist menu ("Put in what?") → `g` (potion of fruit juice, invlet_constant
   keeps invlets) → "You put an uncursed potion of fruit juice into the large box."
6. `#loot` → `o` (take out) → `a` (all types) → `c` (the same potion) →
   "g - an uncursed potion of fruit juice."
7. `a`pply key `.` → "lock it?" → "You succeed in locking the box."

Recorded with seed 9011, datetime 20260720093000. 80 steps.
Verified via inspect-session.mjs: every intended step happened (messages quoted
above appear in the recording).

## Final JS score

`node frozen/ps_test_runner.mjs sessions-extra/seed9011-wizard-loot-chest.session.json`
→ **FAIL — RNG 2602/2659, Screen 41/80 (cursors 45/80)**.

What already works: JS matched *all 2602 RNG calls* through the first wish —
level gen, starting inventory, the entire "large box" wish
(`rn2(41)=8 @ rnd_otyp_by_namedesc(objnam.c:3522)`, `rnd(2) @ next_ident`,
`rn2(5) @ mksobj_init` olocked, `rn2(10)` otrapped, `rn2(6) @ mkbox_cnts`,
5 content-item rolls, `rn2(100) @ makewish`), plus the drop and early combat.
Box/mkbox_cnts parity is correct.

## Divergence 1 (screen, step 19) — missing encumbrance message / --More--

C screen: `o - a large box.--More--`; JS screen: `o - a large box.` (no more).
The C `--More--` is produced because `encumber_msg()` runs every turn from
moveloop (`allmain.c:91/208/403`) and prints
"Your movements are slowed slightly because of your load."
right after the 350-weight box lands in inventory; the status line also gains
"Burdened" (C step 20). JS never prints the message for the wish path and does
not show "Burdened" — the string exists only in polyself-specific paths
(`js/cmd.js:15852`, `js/cmd.js:63400`); there is no general per-turn
encumber_msg equivalent. The following space key then dismisses C's --More--
but is an "Unknown command ' '." in JS, so message history diverges for the
rest of the session.
Suspect area: `js/cmd.js` wish-grant path (`finishRandomBlankWish` /
`godsNoticeWish`, ~`js/cmd.js:15901-15950`) and the missing moveloop
`encumber_msg` (js/allmain.js moveloop_core).

## Divergence 2 (RNG, index 2602 = step 45, the session killer) — "skeleton key" wish

C (step 45, Enter confirming the wish text):

```
rn2(81)=60 @ rnd_otyp_by_namedesc(objnam.c:3522)
rnd(2)=1   @ next_ident(mkobj.c:521)
rn2(100)=71 @ makewish(zap.c:6421)   # u.ublesscnt += rn1(100,50)
```

JS at the same input: prints "Nothing fitting that description exists in the
game." and re-prompts "For what do you wish?" (verified by replaying JS and
dumping its step-45 screen). The recipe's following keys (`ap.y …`) are then
eaten as wish text; after MAX_WISH_TRIES the JS grants a *random* object:
`rn2(13)=11` (WISH_RANDOM_CLASSES pick), `rnd(1000)=947` (mkobj within-class
pick), `rnd(2)=2` (next_ident). Everything downstream desyncs; the apply-key /
#loot lifecycle is never exercised in JS.

Root cause: JS's wizardWish parser (`js/cmd.js:70812+`) has no branch for
key-type tools. The tool branch regex (`js/cmd.js:44583`) lacks `key`/`pick`,
`WISH_TOOL_NAMEDESC_BOUNDS` (`js/cmd.js:3881`) lacks 'skeleton key' (C bound is
oc_prob 80 + xtra 1 = 81), and there is no explicit-otyp mapping for
SKELETON_KEY, so parsing falls through to `noFittingWishObject()`.
The namedesc-rn2 emulation scheme itself is fine — "large box" matched C's
`rn2(41)` exactly.

## Suggested fix areas (do NOT fix here)

1. Add 'skeleton key' (81), 'lock pick', 'credit card' to the JS wish tables
   and otyp mapping; verify against `rnd_otyp_by_namedesc` semantics
   (`objnam.c:3455-3528`, called unconditionally from readobjnam at
   `objnam.c:4749`).
2. Implement per-turn `encumber_msg` (burden change message + "Burdened"
   status flag) in js/allmain.js moveloop.
3. Re-score; then examine apply-key picklock occupation (`lock.c:98`
   `rn2(100) @ picklock`, `attrib.c:509` exercise) and the #loot menu chain
   (in_or_out_menu → query_category → query_objlist in pickup.c) which this
   recording covers but JS never reached.
