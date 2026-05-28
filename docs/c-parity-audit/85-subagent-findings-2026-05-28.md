# Subagent Findings 2026-05-28: Direct Potionhit Visibility Wording

## Implemented Slice

C `potionhit()` computes the monster target square before effect handling. If `cansee(tx, ty)` is false, the thrown bottle only emits `Crash!`; the detailed bottle, monster/head/body, and saddle wording is skipped. Non-oil evaporation is also printed only when the same target square is visible, and worn-saddle feedback uses the stricter `!Blind && canseemon(mon) && cansee(tx, ty)` gate. Source anchors: `nethack-c/upstream/src/potion.c:1653`, `nethack-c/upstream/src/potion.c:1679`, and `nethack-c/upstream/src/potion.c:1706`.

JS now routes direct hero-thrown and wielded-potion monster hits through a local potion-hit target-visibility helper. Blind or out-of-sight target squares produce `Crash!` without evaporation or try-call prompts. Saddle hits still mutate the worn saddle when C would do so, but suppress wet/glow feedback when the saddle is not visible. Saddle feedback now uses the existing spotted-monster predicate, so a hero with see-invisible can receive the feedback for an invisible monster on a visible square.

Focused tests cover blind and out-of-sight unknown-potion hits with no evaporation/call prompt, blind and out-of-sight blessed-water saddle hits that uncurse the saddle silently and clear BUC knowledge, and a see-invisible saddle-hit case that still prints wet-saddle feedback.

## Audit Notes

- `js/vision.js` keeps raw `cansee()` as a bitmap check; potionhit uses a local wrapper because isolated tests can exercise direct hits before full vision state is initialized.
- The shared hit helper remains the right integration point: both thrown potions and wielded potion bashes call `heroThrownPotionHitMonster()`, so throw/melee routing did not need changes.
- C direct vapor exposure still runs before `trycall()` and does not require target-square visibility; this slice left the already-covered vapor ordering intact.

## Deferred Follow-Ups

- Identity-independent unknown-potion direct routing still needs a compact source-backed pass beyond the currently covered index/name cases.
- Full burning-oil explosion collateral remains broader explosion work.
- Shifted-vampire lethal revival and full polymorph `newcham()` equipment fallout still need monster lifecycle support.
- Broader vision-system parity should eventually remove the direct-hit test harness fallback once command tests initialize full vision consistently.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "potion hit|potionhit|saddle feedback|non-visible|see-invisible hero" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "non-visible|see-invisible hero|visible dknown no-vapor" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec test/shop-billing-helpers.test.mjs`
- `npm run score`
