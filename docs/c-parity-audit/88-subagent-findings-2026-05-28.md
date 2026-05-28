# Audit 88: Force-Lock Occupation Cleanup

Date: 2026-05-28

## Implemented Slice

This slice implements the narrow forced-chest parity gap selected from the fresh C-source audit:

- force-lock occupation now gives up before wake/success RNG when the weapon is gone, unwielded, or the current polyform has no hands;
- the 50-turn give-up gate uses C's post-increment effort rule, so the matching attribute is exercised only after real effort;
- successful forcing and blade-break give-up call the real attribute exercise path instead of spending throwaway RNG;
- `#force` chance now follows C's `objects[uwep->otyp].oc_wldam * 2` for common forceable weapons, with explicit metadata taking priority when present.

## C Anchors

- `nethack-c/upstream/src/lock.c:221`: `forcelock()` combines the post-increment 50-turn timeout with missing weapon and no-hands give-up.
- `nethack-c/upstream/src/lock.c:223`: only an effort that leaves `usedtime >= 50` exercises Dexterity or Strength on give-up.
- `nethack-c/upstream/src/lock.c:228`: blade breakage is checked before the success roll.
- `nethack-c/upstream/src/lock.c:238`: blade breakage gives up and exercises Dexterity.
- `nethack-c/upstream/src/lock.c:244`: the success roll is `rn2(100) < xlock.chance`.
- `nethack-c/upstream/src/lock.c:247`: successful forcing exercises Dexterity for blades and Strength for blunt weapons.
- `nethack-c/upstream/src/lock.c:252`: only blunt successful forcing can destroy the chest via the later `rn2(3)` roll.
- `nethack-c/upstream/src/lock.c:744`: starting `#force` stores chance as object large-damage times two.

## JS Touch Points

- `js/allmain.js`: exported `processForceLockOccupation()` for source-derived occupation tests and aligned the timeout/no-hands give-up ordering.
- `js/cmd.js`: added `forceLockOccupationShouldGiveUp()` and reused it from both the full occupation loop and single-tick test helper.
- `js/cmd.js`: replaced the ad hoc force chance table with a C large-damage lookup plus explicit `oc_wldam`/`wldam`/`ldam` support.
- `js/cmd.js`: successful forcing now routes through `exerciseAttribute()` for the C-visible Dexterity/Strength exercise side effect.
- `test/shop-billing-helpers.test.mjs`: added coverage for no-hands early give-up, 50-turn effort exercise, successful blade Dexterity exercise, and dagger/spear/dwarvish spear/club/mace/war-hammer force chances.

## Deferred Gaps

- Remaining forced-chest follow-ups are separate source-backed slices: buried-zombie disturbance, mimic/disguise wake reveal, and ice-box corpse timer details.
- The force weapon chance table should eventually collapse into the canonical object registry once object `oc_wldam` metadata is shared across callers.

## Additional Subagent Follow-Ups

- Projectile landing/shop transfer: C throws route through `flooreffects()` before `ship_object()`, `place_object()`, container impact, and `check_shop_obj()` (`nethack-c/upstream/src/dothrow.c:1804`, `:1819`, `:1824`, `:1830`, `:1835`). The JS `landProjectileObjectWithShopHandling()` path still places immediately and should get a narrow pre-placement floor-effects gate.
- Potionhit lifecycle: lethal blessed-water hits on shifted vampire forms call `killed(mon)` from `potionhit()` (`nethack-c/upstream/src/potion.c:1831`) and `mondead()` revives vampshifters through `vamprises()` before ordinary death cleanup (`nethack-c/upstream/src/mon.c:3096`). The JS water branch still needs a water-only revival patch or a broader death-lifecycle helper.
- Monster diet metadata: C diet predicates are the `M1_CARNIVORE` and `M1_HERBIVORE` bits (`nethack-c/upstream/include/monflag.h:114`, `:115`; `nethack-c/upstream/include/mondata.h:90`, `:91`). JS still uses ad hoc `form.carnivorous` flags for polyself smell and related checks.

## Verification

Focused checks run before documentation update:

```bash
node --check js/cmd.js
node --check js/allmain.js
node --check test/shop-billing-helpers.test.mjs
node --test --test-reporter=spec --test-name-pattern 'force|forcing' test/shop-billing-helpers.test.mjs
node --test test/shop-billing-helpers.test.mjs
npm run score
```

Result: focused force tests pass, `13` run and `737` skipped under the name filter; full helper suite passes `750/750`; public score remains `44/44`.
