# C Parity Audit 214: Spell Polymorph Floor Piles

## Sources

- `nethack-c/upstream/include/objects.h:1388-1390` and `1474-1475`: the polymorph spell is an immediate directional spell, and wand/spell polymorph share the same object effect family.
- `nethack-c/upstream/src/spell.c:1397-1403`: successful spell casting consumes energy and exercises wisdom before effect dispatch.
- `nethack-c/upstream/src/spell.c:1457-1470` and `1486-1513`: immediate spells ask for a direction; self-targeted spells call `zapyourself()`, while nonzero directions call `weffects()` with the pseudo spell object.
- `nethack-c/upstream/src/zap.c:3436-3451`: `weffects()` is shared by wands and spell pseudo objects, including lateral beam dispatch through `bhit()`.
- `nethack-c/upstream/src/zap.c:3382-3390`: downward zaps process the hero-square pile through `bhitpile()` before map effects.
- `nethack-c/upstream/src/zap.c:3391-3407`: upward zaps only hit the hero-square object when the hero is hiding under objects, and then only as a direct top-object `bhito()` hit.
- `nethack-c/upstream/src/zap.c:2428-2505`: `bhitpile()` applies the hiding-under skip rules and boulder restack pass after pile processing.
- `nethack-c/upstream/src/zap.c:2191-2221`: `WAN_POLYMORPH` and `SPE_POLYMORPH` share object-hit polymorph behavior through `bhito()`.
- `nethack-c/upstream/src/zap.c:6100-6141`: monster resistance uses wand attack level 12 for wands and the caster level for spell pseudo objects.
- `nethack-c/upstream/src/zap.c:123-133`: `learnwand()` suppresses wand learning for spellbook-class pseudo objects.

## JS Changes

- Routed the `polymorph` spell's direction prompt into the existing floor-pile polymorph helpers instead of falling through to the generic spell message.
- Reused the wand floor-pile downward, upward hiding-under, and lateral-ray routing with no wand item attached, so spell hits do not mark wand appearances known.
- Split the lateral polymorph monster-hit helper so wands still use wand-class resistance while spell beams pass the caster level into the shared monster polymorph path.
- Kept the recent boulder eligibility, boulder restacking, and hiding-under top-cover behavior active for spell-triggered floor pile hits.
- Left the self-targeted polymorph spell on the existing local polyself/system-shock path; full C `zapyourself()` inventory fallout is outside this slice.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- A lateral polymorph spell ray reaches and affects a nonadjacent floor pile without a wand inventory item.
- A downward polymorph spell affects the hero-square floor pile through the same pile helper as wand zaps.

## Remaining Gaps

- Full spell pseudo-object identity is still approximate; the cast path only consumes `next_ident()` through the existing pseudo-object call.
- Self-targeted spell polymorph still lacks full C `zapyourself()` inventory and equipment fallout.
- Downward polymorph map and engraving effects from `zap_map()` remain unmodeled.
- Swallowed spell polymorph, broader spell skill/hunger side effects, and full monster ray parity remain larger command/effect slices.
- Full `poly_obj()` fidelity, including golem creation and exact generated-object metadata, remains broader than this floor-pile routing slice.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern="spell polymorph|floor polymorph (downward hits|lateral floor)" test/shop-billing-helpers.test.mjs` (`3` matching tests passed)
- `node --test test/shop-billing-helpers.test.mjs` (`1092/1092`)
- `node --test test/*.mjs` (`1189/1189`)
- `npm run score` (`44/44`)
