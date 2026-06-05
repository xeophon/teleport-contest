# C Parity Audit 497: Upward Grappling-Hook Toss-Up

Hero-thrown grappling hooks now use the generic non-potion `toss_up()` falling-object path. A grappling hook thrown upward no longer falls through to direction command assist; it consumes the C ceiling and breaktest rolls, falls back onto the hero, uses weapon-tool `dmgval()` small-target damage, lands on the hero square before HP loss, and leaves the existing floor/shop landing flow responsible for final placement.

No replay maps, private seeds, player names, move-count branches, or fixture-specific runtime branches are used. The canary uses deterministic test RNG only to assert the live RNG call shape.

## Source Anchors

- `nethack-c/upstream/src/dothrow.c:1256` through `:1285`: `toss_up()` chooses ceiling/no-ceiling/almost-hit wording and performs the roof `breaktest()` before falling back onto the hero.
- `nethack-c/upstream/src/dothrow.c:1291` through `:1298`: surviving non-potions run a second `breaktest()` when they hit the hero.
- `nethack-c/upstream/src/dothrow.c:1341` through `:1358`: nonbreaking objects use `dmgval()` first, falling back to weight damage only when weapon damage is zero.
- `nethack-c/upstream/src/dothrow.c:1588` through `:1589`: upward non-returning hero throws call `toss_up(obj, rn2(5) && !Underwater)`.
- `nethack-c/upstream/include/objects.h:1010` through `:1012`: grappling hook is an iron `WEPTOOL` with small-target damage `d2`, large-target damage `d6`, and flail skill.
- `nethack-c/upstream/src/weapon.c:216` through `:227`: `dmgval()` treats weapon-tools like weapons and rolls the configured small/large damage dice.

## JS Changes

- `js/cmd.js`
  - Adds `grappling hook` to the modeled upward weapon/tool small-target damage map as `2`.
  - Adds `grappling hook` to the large-target damage map as `6`.
  - Keys `GRAPPLING_HOOK` objects explicitly in `tossUpWeaponObjectKey()` while preserving kind-based matching for existing test objects.

## Tests

- `upward hero-thrown grappling hook self-hits with weapon-tool damage and lands`
  - Pins upward direction routing, no command-assist fallback, ceiling/self-hit wording, floor landing, no harmless-object wording, HP loss within the C `d2` range, and RNG order `rn2(5)`, `rn2(100)`, `rnd(2)`, `rn2(100)`.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot --test-name-pattern "upward hero-thrown grappling hook" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot --test-name-pattern "upward hero-thrown (grappling hook|pick-axe|tin opener)" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot` - pass
- `npm run score` - pass, 44/44 public sessions
- `git diff --check` - pass
