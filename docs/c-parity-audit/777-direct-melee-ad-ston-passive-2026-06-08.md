# C Parity Audit 777: Direct Melee AD_STON Passive

## Sources

- `nethack-c/upstream/include/monsters.h:170-181`: cockatrices and chickatrices carry passive `AT_NONE`/`AD_STON` attacks.
- `nethack-c/upstream/src/uhitm.c:786-789`: ordinary direct hero melee calls `passive(mon, uwep, mhit, malive, AT_WEAP, wep_was_destroyed)` after `known_hitum()` returns, including after lethal hits.
- `nethack-c/upstream/src/uhitm.c:5892-5957`: `AD_STON` is in the passive block that can affect the hero even if the defender just died. For `AT_WEAP`, bare hands petrify only when there is no worn glove, no current weapon, and no weapon destroyed during the hit.
- `nethack-c/upstream/src/mhitm.c:1489-1493`: `AT_WEAP` maps to glove protection and leaves weapon handling to the caller.
- `nethack-c/upstream/src/end.c:185-199`: `done_in_by(mon, STONING)` prints `You turn to stone...` and records the monster as the killer.

## JS Changes

- Added a separate direct-melee passive stoning helper instead of folding `AD_STON` into passive object erosion/drain.
- Shared passive attack metadata scanning between passive object effects and `AD_STON`, with narrow cockatrice/chickatrice fallbacks for local monster fixtures.
- Threaded the actual wielded weapon as contact protection even when the Monk damage path treats the attack as martial-arts bare-hand damage.
- Ran direct passive stoning from the nonlethal, consumed-egg, deferred-tail, and lethal direct-melee passive points. Fatal stoning exits before the final live-defender `rn2(3)` passive-tail roll.

## Tests

Added focused command-path coverage in `test/shop-billing-helpers.test.mjs`:

- bare-handed direct melee against a cockatrice petrifies the hero, sets statue bones state, and skips passive-object erosion text;
- worn gloves block bare-handed cockatrice passive stoning while preserving normal hit damage and the final passive-tail roll;
- a wielded weapon blocks cockatrice passive stoning while preserving ordinary weapon conduct and hit damage;
- a lethal bare-handed cockatrice hit still applies passive stoning after the kill message and marks the defender dead.

## Remaining Gaps

- Weapon-destroyed-during-hit protection is represented for consumed wielded eggs, but broader direct-melee object destruction during `hmon()` remains a future compact slice.
- Full monster lifecycle cleanup after a lethal passive-stoning hero death is still narrower than C's `killed()` path; this slice marks the defender dead and records the vanquish before death handoff.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot --test-name-pattern "direct hero melee (bare-handed cockatrice passive petrifies hero|gloved bare-handed cockatrice passive is blocked|weapon cockatrice passive is blocked|lethal bare-handed cockatrice still petrifies hero)" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot --test-name-pattern "direct hero melee (against disenchanter drains unpaid enchanted weapon|miss skips disenchanter drain and keeps live bill|plus-zero weapon hits disenchanter without drain|respects cancelled disenchanter passive drain|against rust monster rusts wielded weapon|respects cancelled rust monster passive erosion|against black pudding corrodes wielded weapon|against acid passive can corrode wielded weapon|acid-passive jelly fallback corrodes wielded weapon|against fire passive can burn flammable wielded weapon|cancelled fire passive rolls but skips weapon burn)" test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-reporter=dot test/*.mjs`
- `npm run score` (`44/44`)
