# C Parity Audit 817: Monster Life Saving Nonliving Eligibility

Closed a shared monster life-saving eligibility gap. C only lets a monster use a worn amulet of life saving when its current monster data is living, except for vampire shifters. JS previously recognized only a narrow subset of nonliving monsters, so vortexes, several undead classes, manes, and raw golem/vampire/wraith/lich class markers could still consume monster life-saving amulets. JS now uses a C-shaped nonliving predicate for the shared monster life-saving helper and for the local hero kill/destroy wording that is driven by the same C `nonliving()` check.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The canaries use synthetic non-shop floor state, local projectile and genocide cleanup fixtures, and ordinary worn monster amulets.

## Source Anchors

- `nethack-c/upstream/src/mon.c:2825` through `:2836`: `mlifesaver()` only returns a worn life-saving amulet when `!nonliving(mon->data) || is_vampshifter(mon)`.
- `nethack-c/upstream/include/mondata.h:216` through `:220`: `nonliving()` covers undead, `PM_MANES`, golems, and `S_VORTEX`.
- `nethack-c/upstream/include/monst.h:216` through `:219`: `is_vampshifter()` is an instance/base-form exception for vampire, vampire leader, and Vlad shifters.
- `nethack-c/upstream/src/mon.c:3091` through `:3103`: `mondead()` runs monster life-saving first; only failed/no life-saving reaches vampire-rise and steam-vortex cloud side effects.
- `nethack-c/upstream/src/mon.c:3498` through `:3506`: `xkilled()` uses `nonliving(mtmp->data) ? "destroy" : "kill"` for visible hero kill messages.

## JS Changes

- `js/cmd.js:43`
  - Added small local sets for Rider, lich, and vampire-family names used by the life-saving predicate.
- `js/cmd.js:22780`
  - Added `monsterIsVampireShifterForLifeSaving()` with `vampBase`, `chamBase`, `chamName`, and `cham` aliases.
- `js/cmd.js:22789`
  - Added `monsterIsNonlivingForLifeSaving()` to recognize local raw C class markers and semantic mlets/glyphs for liches, mummies, vampires, wraiths, zombies, golems, ghosts/shades, manes, and vortex-class monsters including `fog cloud`.
  - Explicitly guards Riders out of the nonliving inference so Death/Pestilence/Famine are not accidentally excluded by future broad fields.
- `js/cmd.js:23568` and `js/cmd.js:55341`
  - Hero projectile and direct-melee kill wording now use the same nonliving predicate, matching C's `destroy` wording for nonliving current forms while preserving vampire-bat shifter `kill` wording.

## Tests

- `test/shop-billing-helpers.test.mjs:78021`
  - Added a hero-thrown dagger canary where a visible steam vortex wearing life saving dies, prints `destroy`, drops the amulet, records the kill, and does not print or discover any medallion/life-saving text.
- `test/shop-billing-helpers.test.mjs:13901`
  - Added a genocide cleanup canary where a genocided steam vortex wearing life saving skips life-saving text and amulet consumption, drops the amulet, records the death, and still creates the harmless steam cloud.
  - Existing shifted-vampire projectile/direct-melee/genocide canaries continue to cover the vampire-shifter exception.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=spec --test-name-pattern "hero-thrown dagger lethal nonliving vortex|hero-thrown dagger lethal target ignores unworn monster life saving amulet|hero-thrown dagger revives shifted vampire lethal target before cleanup|genocide cleanup drops worn life saving amulet from nonliving steam vortex|genocide cleanup creates harmless gas cloud|genocide cleanup restores shifted vampire true form after failed life saving" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `git diff --check` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Full C monster-life-saving parity for every possible death caller still depends on those callers reaching the shared helper; this slice covers the shared predicate and two high-value current callers.
- Genocide cleanup still has separate `mondead()` side-effect gaps: Kop/vault guard hooks, quest leader and mail daemon bookkeeping, complete light-source cleanup with pre-death data, and livelog/achievement details.
- Exact genocide pluralization for `vortex` remains separate; the cleanup canary deliberately checks the life-saving absence rather than changing that message in this slice.
