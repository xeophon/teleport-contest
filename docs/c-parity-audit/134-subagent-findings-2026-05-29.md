# 134 - Ordinary thrown-egg monster hits

## Implemented Slice

Horizontal hero-thrown ordinary eggs now use the C `thitmonst()` egg delivery path instead of the generic noncombat miss path. A target roll consumes `rnd(20)`, then hits when hero Dexterity beats `rnd(25)`. Direct hits print the egg hit message, deal exactly 1 damage without the normal damage bonus, wake and anger non-pet targets, and consume splatted eggs through used-up shop billing.

Live non-stale ordinary eggs that hit touch-petrifying monsters now follow the C special case: the egg is no longer alive, its hatch timer is stopped, and the thrown egg becomes a floor rock on the monster square while the monster still takes the 1 point hit.

C anchors:

- `thitmonst()` rolls `rnd(20)` and treats eggs like cream pies/venom, with the direct-hit gate `ACURR(A_DEX) > rnd(25)`: `nethack-c/upstream/src/dothrow.c:2152`, `nethack-c/upstream/src/dothrow.c:2256`.
- `hmon_hitmon_misc_obj()` sets ordinary egg damage to 1, suppresses ordinary damage bonuses, prints the hit text, and splats/uses up ordinary eggs: `nethack-c/upstream/src/uhitm.c:1189`, `nethack-c/upstream/src/uhitm.c:1222`, `nethack-c/upstream/src/uhitm.c:1250`.
- Live eggs striking touch-petrifying monsters stop hatch timers, become `ROCK`/`GEM_CLASS` objects at the monster square, and still use the same 1 damage path: `nethack-c/upstream/src/uhitm.c:1231`, `nethack-c/upstream/include/obj.h:314`, `nethack-c/upstream/src/timeout.c:1009`.
- Splatted thrown eggs go through `useup_eggs()`/`obfree()` rather than floor breakage, so shop-owned thrown eggs become used-up bill rows: `nethack-c/upstream/src/uhitm.c:1178`, `nethack-c/upstream/src/shk.c:1187`.

JS changes:

- Added ordinary thrown-egg hit helpers for target petrification checks, egg hit article wording, live-egg rock conversion, and the 1-damage/wake/anger effect: `js/cmd.js:15376`, `js/cmd.js:15382`, `js/cmd.js:15388`, `js/cmd.js:15415`, `js/cmd.js:15423`.
- Added a horizontal `throw` branch for ordinary eggs before the generic noncombat miss branch. Hit rolls now use the C `rnd(20)`/`rnd(25)` ordering, miss rolls still fall through to normal projectile landing, and stack splits happen before direct hit use-up: `js/cmd.js:52446`.
- Imported and used `killEggHatchTimer()` so converted live eggs cannot keep hatching after becoming rocks: `js/cmd.js:28`, `js/cmd.js:15389`.

## Tests Added

Added focused throw coverage in `test/shop-billing-helpers.test.mjs`:

- direct ordinary egg hit wording, `Splat!`, 1 damage, wake/anger, inventory removal, no floor object, and RNG order: `test/shop-billing-helpers.test.mjs:18415`;
- unpaid ordinary egg from a stack splits the bill, leaves the survivor live, and preserves the thrown unit as a used-up bill row: `test/shop-billing-helpers.test.mjs:18442`;
- live ordinary egg hitting a cockatrice becomes a rock, clears hatch timer fields and species metadata, and still damages the target: `test/shop-billing-helpers.test.mjs:18477`.

## Deferred Gaps From This Agent Round

- Petrifying cockatrice/chickatrice egg direct hits and pyrolisk egg direct-hit explosions remain open. The implemented branch deliberately covers ordinary non-petrifying, non-pyrolisk eggs only.
- Thrown-gold stairs, ladders, and special stairs still need C-shaped `down_gate()`/`ship_object()` migration records, no-drop handling, and delivery modes.
- Burning-oil shop doors still need `SHOP_DOOR_COST` damage records, one post-explosion `pay_for_damage("burn away", FALSE)` pass, and delayed shopkeeper repair after `REPAIR_DELAY`.
- Deaf/mute/nonverbal shopkeeper payment feedback still needs C's nod/point/motion fallback wording for successful payment and partly-used rejection paths.
- Stone-to-flesh remaining lifecycle gaps include saved monster traits, historic/named statues, mimic reveal cleanup, carried/worn statue animation, `m_dowear()` after content transfer, directed doppelganger retargeting, and full `cant_revive()` handling.
- Generic direct object-hit/falling damage gaps remain open: upward ordinary corpse self-hit, `Maybe_Half_Phys()` mitigation, generic falling-object damage, monster-thrown non-acid physical halving, and broader `hmon()` object-hit effects.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "ordinary egg" test/shop-billing-helpers.test.mjs` - 6 pass, 884 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 890/890
- `npm run score` - 44/44
