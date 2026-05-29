# Subagent Findings 2026-05-29

Fresh read-only agents audited five separate C parity areas. No private-suite details were used.

## Implemented Slice: `#rub` Gray Stones And Cursed Touchstone Shatter

- C anchors: `apply.c:1770` `rub_ok()`, `apply.c:1785` `dorub()` gray-stone dispatch, `apply.c:2690` sighted source observation, `apply.c:2707` cursed touchstone shatter, and `zap.c:1458` `obj_resists()`.
- JS anchor before work: `js/cmd.js` `rubObjectLetters()` and `rubObject` input only listed lamps and royal jelly, while `beginUseStone()`/`finishUseStone()` lacked source observation and cursed-touchstone shatter.
- Implemented in `docs/c-parity-audit/160-rub-gray-stone-touchstone-shatter-2026-05-29.md`.
- Remaining from the agent: full touchstone effect matrix, reusable `getobj()`, and broader `#rub` no-hands command parity.

## Ordinary Stairs And Ladder Shipping

- C `ship_object()` sends ordinary objects down same-dungeon stairs/ladders before normal placement, sale, and stacking.
- C stairs use a `rn2(3)` no-drop chance, while ladders do not.
- C queues migration with source-level metadata and delivers at the reciprocal up stair or up ladder.
- JS still handles only seen-hole/trapdoor shipping and stores queued objects without stair/ladder metadata.
- Safe next slice: same-dungeon down-stairs/down-ladder migration for non-gold, non-boulder, non-ball/chain dropped objects and projectile landings.

## Monster-Thrown Hit Follow-Ups

- C `drop_throw(obj, ohit, x, y)` breaks hit eggs, can mulch hit missiles with `should_mulch_missile()`, places surviving hit objects, then calls `passive_obj()` before stacking.
- JS `landMonsterThrownObject()` accepts `ohit` but real call sites mostly omit hit state, and the lander only uses `ohit` for eggs.
- Safe next slice: add hit missile mulch in the lander, then thread `ohit` through confirmed hit paths before adding narrow passive-object mutation.

## Lateral Wand Polymorph

- C lateral polymorph uses `bhit(..., rn1(8, 6), ...)`, checks monsters before piles on each square, subtracts extra range after monster hits, and continues for polymorph.
- JS lateral polymorph remains adjacent-only and the current pile helper handles one coordinate.
- Safe next slice: local lateral polymorph beam traversal with pile-only processing first, then monster-first ordering.

## Helmet `tiphat()`

- C carried `#tip` dispatches to `tiphat()` only for the actually worn helmet.
- C cursed worn helmets block with the curse message and BUC discovery; uncursed worn helmets ask for direction and spend a move after the doff/tip interaction.
- JS carried `#tip` currently treats worn helmets as ordinary downplayed objects and prints `Nothing happens.`
- Safe next slice: worn helmet selection enters a direction prompt; non-worn helmets remain ordinary no-effect.
