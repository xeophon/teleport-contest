# C Parity Audit 200: Direct Melee AD_ENCH Drain

## Sources

- `nethack-c/upstream/include/monsters.h:2155`: disenchanters carry passive `AT_NONE/AD_ENCH`.
- `nethack-c/upstream/src/uhitm.c:778-810`: direct hero melee calls `known_hitum()` for each attack, then calls `passive()` with the actual weapon; second-weapon passive only runs after a second hit.
- `nethack-c/upstream/src/uhitm.c:5865-6017`: passive `AD_ENCH` is in the block that can affect the hero even if the target just died, and it only runs for successful hits with an involved object.
- `nethack-c/upstream/src/uhitm.c:6127-6184`: `passive_obj()` suppresses cancelled disenchanters, calls `drain_item(obj, TRUE)`, and prints the carried known/armor “less effective” feedback after a successful drain.
- `nethack-c/upstream/src/zap.c:1382-1409`: `drain_item()` positive-`spe` eligibility, drain-defense/object-resistance checks, `COST_DRAIN`, and `spe--`.

## JS Changes

- Added a direct-melee passive-object wrapper that reuses `drainItem()` for uncancelled `AD_ENCH` hits and keeps `drainItem()` itself silent.
- Added carried-object feedback matching C’s `passive_obj()` gate: only inventory objects that are known or armor print `Your <object> seems/seem less effective.` after a successful drain.
- Wired the wrapper into the direct non-potion melee hit path per attack, including lethal hits after the kill message.
- Preserved miss, potion-bash, cancelled-monster, and nonpositive-`spe` no-drain behavior without consuming the `rn2(100)` resistance roll.
- Added a bare-handed fallback to worn gloves for `AD_ENCH`, matching C’s passive-object fallback when no weapon object is supplied.

## Tests

Added focused command-path coverage in `test/shop-billing-helpers.test.mjs`:

- Direct melee against a disenchanter drains an unpaid `+2` wielded dagger, creates a used-up dummy bill, and prints both billing and “seems less effective” feedback.
- A direct melee miss skips drain and keeps the live bill.
- A direct melee hit with a `+0` weapon skips drain and consumes no drain-resistance RNG.
- A direct melee hit against a cancelled disenchanter skips drain and consumes no drain-resistance RNG.

## Remaining Gaps

- Hero/polyself target passive-object handling for monster-thrown landings is still open.
- Production dart hit landing and launcher-arrow landing are still open.
- Broader direct passive-object erosion/burning/corrosion parity remains incomplete outside the covered `AD_ENCH` path.
- Worn-glove fallback is implemented but still needs a focused source-derived test if hidden coverage starts exercising unarmed disenchanter hits.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern='direct hero melee.*disenchanter|direct hero melee plus-zero' test/shop-billing-helpers.test.mjs`
