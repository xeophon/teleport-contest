# Subagent Findings 120 - Upward Touch-Petrifying Corpse Toss-Up

## Implemented Slice: Hero-Thrown Cockatrice/Chickatrice Corpse Upward Impact

Covered upward hero-thrown touch-petrifying corpses. Cockatrice and chickatrice corpses now run the C bare-hand pre-toss stoning check before inventory removal or `toss_up()` RNG, then use the C-shaped upward fall-back path for gloved, resistant, rescued, or helmeted cases.

C source:

- `nethack-c/upstream/src/dothrow.c:139`: ungloved heroes throwing a touch-petrifying corpse without `Stone_resistance` print the bare-hands message and call `instapetrify()` before `freeinv()`/`throwit()`.
- `nethack-c/upstream/src/trap.c:3844`: `instapetrify()` still returns without death for `Stone_resistance` or stone-golem polyself rescue.
- `nethack-c/upstream/src/dothrow.c:1588`: upward throws call `toss_up(obj, rn2(5) && !Underwater)`.
- `nethack-c/upstream/src/dothrow.c:1260`: `toss_up()` marks `EGG` and `CORPSE` petrifiers via `touch_petrifies()`.
- `nethack-c/upstream/include/mondata.h:200`: `touch_petrifies()` is limited to cockatrice and chickatrice.
- `nethack-c/upstream/src/dothrow.c:1268`: a ceiling hit calls `breaktest()` before choosing the ordinary fall-back wording, even though corpses do not break.
- `nethack-c/upstream/src/dothrow.c:1291`: the self-hit branch performs another `breaktest()`.
- `nethack-c/upstream/src/dothrow.c:1349`: nonbreaking corpse impact computes falling-object damage before the petrification check.
- `nethack-c/upstream/src/dothrow.c:1382`: any worn helmet blocks intact corpse self-petrification; hard helmets can print the hard-helmet message.
- `nethack-c/upstream/src/dothrow.c:1401`: unhelmeted, non-resistant heroes petrify by `elementary physics`.
- `nethack-c/upstream/src/dothrow.c:1410`: fatal corpse self-hit drops the corpse with `dropy()` instead of the full `hitfloor()` path.
- `nethack-c/upstream/src/dothrow.c:1420`: nonfatal falling corpses route through `hitfloor(obj, TRUE)` and then `losehp()`.

Subagent findings:

- Corpse handling is the next compact upward slice, but ordinary corpse/generic falling-object damage should remain separate.
- The bare-hand corpse throw check happens before the object is split/removed from inventory and before the `rn2(5)` toss-up roll.
- Gloves only bypass the pre-toss hand-contact check; they do not prevent head-impact petrification.
- Stone resistance and stone-golem rescue apply both to bare-hand contact and to the head-impact petrification branch.
- Corpse ceiling hits and self-hits consume C-style break-test object-resistance rolls even though the corpse survives.
- Medusa remains outside the touch-petrifying boundary.

Covered JS behavior:

- `js/cmd.js`: added cockatrice/chickatrice corpse weights for falling-object damage.
- `js/cmd.js`: added a corpse-only upward throw branch before generic direction handling.
- `js/cmd.js`: ungloved bare-hand upward throws now print the C bare-hands message, petrify before toss-up RNG, leave the corpse in inventory, and use death cause `petrified by throwing a cockatrice corpse bare-handed`.
- `js/cmd.js`: gloved unhelmeted upward corpse self-hits can petrify by `elementary physics` and drop the corpse at the hero square.
- `js/cmd.js`: worn helmets block corpse self-hit petrification; hard helmets print the hard-helmet message when nonlethal, apply reduced falling damage, and land the corpse through the existing projectile/shop landing helper.

Regression coverage:

- `test/shop-billing-helpers.test.mjs`: bare-handed upward cockatrice corpse throws petrify before toss-up wording or `rn2(5)`.
- `test/shop-billing-helpers.test.mjs`: gloved unhelmeted upward cockatrice corpse throws reach `toss_up()`, fall back, petrify by elementary physics, and drop the corpse.
- `test/shop-billing-helpers.test.mjs`: gloved hard-helmet upward cockatrice corpse throws hit the ceiling, print the hard-helmet message, deal 1 HP, and land the corpse.

Verification:

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "cockatrice corpse" test/shop-billing-helpers.test.mjs`
- `node --test test/shop-billing-helpers.test.mjs`
- `npm run score` (`44/44 passing`)

## Remaining Upward Throw Gaps

- Ordinary corpses and other generic damaging upward impacts still need full `dmgval()`, artifact hits, `Maybe_Half_Phys()` mitigation, silver/blessed bonuses, and broader falling-object effects.
- Broader glass/crystal object breakage remains separate until object material metadata is less name-driven.
