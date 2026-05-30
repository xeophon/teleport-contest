# C Parity Audit 215: Self Polymorph Unchanging

## Sources

- `nethack-c/upstream/src/zap.c:2657-2658`: direct wand self-zaps call `zapyourself(obj, TRUE)`.
- `nethack-c/upstream/src/spell.c:1500-1501`: self-targeted immediate spells, including polymorph, call `zapyourself(pseudo, TRUE)`.
- `nethack-c/upstream/src/zap.c:2804-2809`: `WAN_POLYMORPH` and `SPE_POLYMORPH` call `polyself(POLY_NOFLAGS)` only when the hero is not `Unchanging`.
- `nethack-c/upstream/src/zap.c:3008-3012`: observable wand effects call `learnwand()` after the `zapyourself()` switch.
- `nethack-c/upstream/src/polyself.c:483-495`: `polyself()` itself handles its own `Unchanging` and system-shock cases, but the self-zap polymorph branch skips calling it while `Unchanging`.
- `nethack-c/upstream/src/zap.c:123-133`: `learnwand()` suppresses spellbook-class pseudo objects, so spell self-polymorph never identifies a wand type.

## JS Changes

- Added a shared `polymorphSelfZapResult()` helper for wand and spell self-targeted polymorph.
- Blocked self-targeted wand and spell polymorph before system shock when `heroHasUnchanging()` is true, leaving no transformation/failure/shock message.
- Preserved C's learning split: unknown polymorph wands are not discovered when `Unchanging` blocks the effect, but a non-blocked wand self-zap is discovered even when `polyself()` ends in system shock.
- Kept spell self-polymorph source-neutral by passing no wand item into the shared helper.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- Self-cast polymorph spell under `Unchanging` consumes the spell action but does not roll system shock, damage the hero, transform the hero, or print a transform/failure message.
- Self-zapped unknown polymorph wand under `Unchanging` consumes the wand action without discovering the wand.
- Self-zapped unknown polymorph wand that reaches system shock still discovers the wand, damages the hero, and does not polymorph the hero.

## Remaining Gaps

- Successful `polyself()` equipment fallout is still partial. The next narrow row should cover no-hands/verysmall successful polyself dropping worn gloves and wielded weapons while leaving rings worn.
- Floor-pile shudder-to-material-golem fallout remains open; a focused food/organic stack row should cover the `gp.poly_zapped`/`create_polymon()`/`polyuse()` tail.
- Dragon armor merge, shield/helm/boots/eyewear fallout, `retouch_equipment()` artifact/material effects, and full `break_armor()` ordering remain broader.
- Full controlled polymorph, were/vampire/draconian special-form selection, and exact `newman()`/`polymon()` stat handling are not covered by this slice.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern="self-(cast|zapped) polymorph|spell polymorph" test/shop-billing-helpers.test.mjs` (`5` matching tests passed)
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` (`1095/1095` passed)
- `node --test test/*.mjs` (`1192/1192` passed)
- `npm run score` (`44/44` passing)
