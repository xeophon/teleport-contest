# 761 - Direct melee setmangry blind Elbereth fade

## Implemented Slice

Ordinary direct hero melee survivor hits already suppress the C `setmangry(mon, TRUE)` Elbereth fade message while the hero is blind. This slice pins that behavior with focused source-backed tests.

The behavior remains inside the same direct-melee `setmangry(TRUE)` branch covered by audits 758-760. Blindness suppresses only the visible `"The engraving beneath you fades."` text; it does not suppress the hypocrisy message, alignment penalty, direct engraving deletion, wait-mask cleanup, or peaceful anger state transition.

Covered behavior:

- strict hero-square `Elbereth` remains required before the hypocrisy branch can run;
- a blind hero still receives `"You feel like a hypocrite."`;
- low-record hostile-target hypocrisy still consumes the `rnd(5)` penalty;
- the hero-square engraving is deleted even though no fade text is printed;
- the adjacent visible-hero canaries continue to cover the high-record peaceful-target penalty and visible fade text.

This remains local to ordinary direct melee survivor hits. It does not extend bullwhip apply force-attacks, wielded potion bash, wielded egg bash, projectile hits, two-weapon deferred wake queues, swallowed/jousting/artifact melee, or broader monster movement/flee decisions.

C anchors:

- `setmangry()` first checks `via_attack`, strict `sengr_at("Elbereth", u.ux, u.uy, TRUE)`, then `onscary(u.ux, u.uy, mon) || mon->mpeaceful`: `nethack-c/upstream/src/mon.c:4267`, `nethack-c/upstream/src/mon.c:4270`.
- Qualifying hypocrisy prints the message and applies the high-record or low-record alignment penalty before any fade handling: `nethack-c/upstream/src/mon.c:4271`, `nethack-c/upstream/src/mon.c:4280`.
- The fade message is guarded by `!Blind`, but `del_engr_at(u.ux, u.uy)` runs unconditionally after that guard: `nethack-c/upstream/src/mon.c:4282`, `nethack-c/upstream/src/mon.c:4283`, `nethack-c/upstream/src/mon.c:4284`.
- `del_engr_at()` directly deletes any engraving at the target location: `nethack-c/upstream/src/engrave.c:459`, `nethack-c/upstream/src/engrave.c:461`, `nethack-c/upstream/src/engrave.c:466`.

## Tests Added

Focused direct-melee coverage in `test/shop-billing-helpers.test.mjs` now asserts:

- a blind hero attacking a hostile survivor on exact `Elbereth` sees the hypocrisy message without the fade text, deletes the engraving, and still consumes the low-record `rnd(5)` penalty.

The focused command keeps adjacent visible-hero Elbereth, peaceful-target, and nonexact-text canaries from audit 758.

## Deferred Gaps

- Full `peacefuls_respond()` remains deferred.
- Exact `adjalign()` threshold side effects such as Erinys adjustments remain outside this local direct-melee alignment model.
- Bullwhip apply force-attacks, wielded potion bash, wielded egg bash, projectile hits, two-weapon deferred wake queues, swallowed/jousting/artifact melee, and other special helpers remain separate from this ordinary direct-melee hook.
- Full knockback movement, trap collisions, stun, and wording are still represented only by the existing RNG placeholder.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "direct hero melee (surviving peaceful target on Elbereth|nonexact Elbereth engraving|hostile vulnerable target on Elbereth|blind hostile target on Elbereth|hostile human-shaped target)" test/shop-billing-helpers.test.mjs` - 6 pass, 2718 skipped
- `git diff --check`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/*.mjs`
- `npm run score` - 44/44 passing
