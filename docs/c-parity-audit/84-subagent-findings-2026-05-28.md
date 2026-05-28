# Subagent Findings 2026-05-28: Stone-to-Flesh Resistance, Boulders, and Gems

## Implemented Slice

C `stone_to_flesh_obj()` first filters by object material, accepting only `MINERAL` and `GEMSTONE`, then applies `obj_resists(obj, 2, 98)` before class-specific replacement. Invocation objects and Rider corpses always resist; other objects roll exactly one `rn2(100)`, with ordinary objects resisting on `< 2` and artifacts on `< 98`. Source anchors: `nethack-c/upstream/src/zap.c:1457`, `nethack-c/upstream/src/zap.c:2002`, and `nethack-c/upstream/src/zap.c:2006`.

JS now applies that resistance gate for covered stone-to-flesh object rows. Marble wands and mineral/gemstone rings still transform as before when they do not resist, but now consume the C-shaped resistance roll. `BOULDER` now maps to `ENORMOUS_MEATBALL`, and eligible mineral/gemstone `GEM_CLASS` objects map to `MEATBALL`. Worthless glass gems fail the material gate and do not consume the object-resistance roll.

Focused tests cover carried boulder to enormous meatball, floor boulder to enormous meatball, floor gemstone stack to same-quantity meatballs, ordinary object resistance, and glass-gem no-op/no-resistance-roll behavior. The new tests also assert these stone-to-flesh paths do not increment polymorph-pile conduct or object-discovery score.

## Object Metadata Notes

Local JS object metadata remains scattered across generators, wishing helpers, display, shop, merge, and command code. For this slice, the stone-to-flesh material classifier stays local to `cmd.js` because a shared object registry is still larger than the behavioral patch. Relevant existing anchors include boulder normalization at `js/cmd.js:23255`, food metadata at `js/cmd.js:1360`, wished gem metadata near `js/cmd.js:25663`, and RNG helpers in `js/rng.js`.

The local helper recognizes C's real gemstone names, gray/mineral stones, rocks, and boulders, while treating explicit or name-derived worthless glass as ineligible. This is intentionally narrow and should be replaced by the future canonical object table described in `PORTING_PLAN.md`.

## Deferred Follow-Ups

- Statue and figurine stone-to-flesh rows still need monster/statue lifecycle support before they can be implemented without local special-case drift.
- C's smell message can be `You smell a delicious smell.` for non-Monk meat eaters who have already broken vegetarian conduct; JS still uses the odor message for every covered transform.
- `poly_obj()` has broader worn, wielded, quivered, Sokoban guilt, and boulder-square collateral behavior. The current slice covers object replacement and billing/display shape, not the full `poly_obj()` lifecycle.
- Artifact resistance is now represented by the `98%` gate, but a focused artifact stone-to-flesh regression can be added once there is a stable source-backed artifact stone/gem fixture.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "stone to flesh" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec test/shop-billing-helpers.test.mjs`
- `npm run score`
