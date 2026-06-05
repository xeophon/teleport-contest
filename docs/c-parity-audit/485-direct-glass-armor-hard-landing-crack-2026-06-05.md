# C Parity Audit 485: Direct Glass Armor Hard-Landing Crack

Implemented direct horizontal hero-thrown crackable glass armor hard-landing parity. When crystal plate mail or another crackable glass armor object is thrown at a visible monster, C treats it as a non-combat object: it misses the monster, runs the normal `tmiss()` wake side effects, then applies the hard-landing `breaktest()` at the impact square. Glass armor that fails resistance cracks or shatters through `erode_obj()` wording, not generic "thousand pieces" shatter wording.

No replay maps, private seeds, player names, move-count branches, or fixture-specific production branches are used.

## Source Anchors

- `nethack-c/upstream/src/dothrow.c:2011` through `:2300`: `thitmonst()` rolls `rnd(20)`, but armor falls through the weapon/gem/potion branches and calls `tmiss(obj, mon, TRUE)`.
- `nethack-c/upstream/src/dothrow.c:1951` through `:1965`: `tmiss()` prints the visible miss and can consume the `rn2(3)` wake side-effect roll before landing.
- `nethack-c/upstream/src/zap.c:3571`: `miss()` formats `The <object> misses <monster>.`
- `nethack-c/upstream/src/dothrow.c:1780` through `:1838`: the horizontal landing path runs `breaktest()`, silent crackable `breakmsg()`, `breakobj()`, then places and stacks surviving objects.
- `nethack-c/upstream/src/dothrow.c:2489`: `breakobj()` sends crackable armor to `erode_obj(..., ERODE_CRACK, EF_DESTROY | EF_VERBOSE)`.
- `nethack-c/upstream/src/dothrow.c:2582` through `:2596`: glass armor uses a 90 percent nonbreak chance before crack/shatter handling.
- `nethack-c/upstream/src/dothrow.c:2612` through `:2617`: `breakmsg()` is silent for crackable armor.
- `nethack-c/upstream/src/trap.c:277` through `:304`: crack erosion prints `cracks`, `cracks further`, `cracks completely`, or `shatters` and mutates or destroys the armor.
- `nethack-c/upstream/include/objclass.h:201`: `is_crackable()` is glass material plus armor class.
- `nethack-c/upstream/include/objects.h:559`: crystal plate mail is glass armor.
- `nethack-c/upstream/src/objnam.c:5471`: crystal plate mail's simple crackable armor name is `mail`.

## JS Changes

- `js/cmd.js`
  - Allows crackable armor impact helpers to consume a precomputed hard-landing break roll.
  - Lets crackable armor landing use explicit target coordinates instead of always deriving the hero square.
  - Routes non-hit direct thrown crackable armor through the crackable landing helper so generic crystal shatter wording is skipped.

## Tests

- `direct hero-thrown crystal plate mail miss lands intact after resisted hard landing`
- `direct hero-thrown crystal plate mail miss cracks on hard landing`
- `direct hero-thrown fully cracked crystal plate mail miss shatters on hard landing`

The tests cover the C RNG order `rnd(20)`, `rn2(3)`, then hard-landing `rn2(100)`; resisted, crack, and final-shatter outcomes; target-square landing; and absence of generic `thousand pieces` wording.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-name-pattern "direct hero-thrown.*crystal plate mail|upward hero-thrown crystal plate mail|upward hero-thrown fully cracked crystal plate mail|upward hero-thrown unpaid crystal plate mail" test/shop-billing-helpers.test.mjs` - pass, 7 matching tests
- `git diff --check` - pass
- `node --test` - pass, 1929 tests
- `npm run score` - pass, 44/44

## Remaining

- Broader generic upward falling-object damage remains incomplete outside the currently covered upward armor, corpse, tool, and weapon cases.
- Unpaid direct horizontal glass armor final-shatter billing can still use a dedicated shop canary.
