# C Parity Audit 484: Upward Glass Armor Resisted Falling Damage

Implemented the resisted-break side of upward-thrown crackable glass armor. When glass armor falls back onto the hero and the crackable armor `breaktest()` roll resists, C does not use the special crack-only helper. It falls through the normal nonbreaking-object damage branch: weight-based damage, hard-helmet mitigation and messaging, `u.udaminc`, half physical damage, landing via `hitfloor()`, then HP loss from "falling object".

No replay maps, private seeds, player names, move-count branches, or fixture-specific production branches are used.

## Source Anchors

- `nethack-c/upstream/src/dothrow.c:1256` through `:1285`: `toss_up()` chooses ceiling/almost-ceiling wording, and crackable armor can be handled by `breakobj()` only when `breaktest()` succeeds.
- `nethack-c/upstream/src/dothrow.c:1291` through `:1303`: self-hit breakage calls `breaktest()`, `breakmsg()`, and `breakobj()`; if the object still exists it lands without falling damage.
- `nethack-c/upstream/src/dothrow.c:1341` through `:1380`: objects that did not break use `dmgval()` or weight-based damage, clamp heavy non-weapon damage to 6, apply hard-helmet reduction, `u.udaminc`, and half physical damage.
- `nethack-c/upstream/src/dothrow.c:1382` through `:1397`: worn helmets print the hard-helmet protection message or the non-hard helmet failure message.
- `nethack-c/upstream/src/dothrow.c:1420` through `:1423`: the object lands with `hitfloor(obj, TRUE)` before the hero loses HP to "falling object".
- `nethack-c/upstream/src/dothrow.c:2582` through `:2596`: glass armor has a 90 percent nonbreak chance before crackable breakage can happen.

## JS Changes

- `js/cmd.js`
  - Replaces the local crackable-armor-only falling damage helper with `heroThrownCrackableArmorFallingDamage()`, which delegates resisted armor falls to the existing generic upward object damage calculation.
  - Adds hard-helmet and non-hard helmet messaging for resisted crackable armor falls.
  - Applies falling damage after `landCrackableArmorObjectWithShopHandling()`, matching C's `hitfloor()` before `losehp()` ordering.

## Tests

- `upward hero-thrown crystal plate mail resisted crack uses hard helmet falling damage`
  - Throws crystal plate mail upward with the ceiling miss and crack-resistance rolls fixed by normal RNG.
  - Asserts the hard helmet message appears, the armor hits the floor and lands intact, no crack/shatter/harmless message appears, HP drops by only one, and RNG order is `rn2(5)`, self-hit `rn2(100)`, weight `rnd(5)`, and landing `rn2(100)`.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-name-pattern "upward hero-thrown crystal plate mail|upward hero-thrown fully cracked crystal plate mail|upward hero-thrown unpaid crystal plate mail" test/shop-billing-helpers.test.mjs` - pass, 4 matching tests
- `git diff --check` - pass
- `node --test` - pass, 1926 tests
- `npm run score` - pass, 44/44

## Remaining

- Horizontal/direct hero-thrown glass armor landing still needs the C miss-then-hard-landing crack/shatter path.
