# 133 - Stone-to-flesh failed animation fallback and trap statues

## Implemented Slice

Stone-to-flesh now handles the C failed-animation fallback for the currently supported carried figurine, floor figurine, and floor statue paths. When `makemon()` or spell statue animation cannot place a monster, ordinary corpse-leaving corpstats become corpses; unique or no-corpse targets keep the original figurine/statue unchanged. Floor failures drop statue contents to the floor before replacing the statue with a corpse, and carried unpaid figurines preserve the pre-replacement bill as a used-up row.

Downward stone-to-flesh also now animates ordinary statue traps through the spell `animate_statue()` path instead of skipping them. This path does not call normal statue-trap activation, so the trap record remains present, the monster is not forced hostile by the trap path, and the normal spell animation wording/billing/content ordering applies.

C anchors:

- `stone_to_flesh_obj()` gates mineral/gemstone material and object resistance before statue/figurine handling: `nethack-c/upstream/src/zap.c:2002`, `nethack-c/upstream/src/zap.c:2006`.
- Statues call `animate_statue(..., ANIMATE_SPELL, ...)`; figurines call `makemon(..., NO_MINVENT|MM_NOMSG)`: `nethack-c/upstream/src/zap.c:2017`, `nethack-c/upstream/src/zap.c:2027`, `nethack-c/upstream/src/zap.c:2029`, `nethack-c/upstream/src/zap.c:2033`.
- Failed animation preserves `G_NOCORPSE | G_UNIQ`; otherwise it drops contents and polymorphs the object into a corpse: `nethack-c/upstream/src/zap.c:2058`, `nethack-c/upstream/src/zap.c:2064`, `nethack-c/upstream/src/zap.c:2069`.
- `poly_obj()` preserves corpstat species for corpse/statue/figurine swaps and `set_corpsenm()` starts corpse timers: `nethack-c/upstream/src/zap.c:1702`, `nethack-c/upstream/src/zap.c:1734`, `nethack-c/upstream/src/mkobj.c:1349`, `nethack-c/upstream/src/mkobj.c:1389`.
- `ANIMATE_SPELL` adds `MM_ADJACENTOK`, uses spell animation messages, charges costly squares, transfers contents, and deletes the statue; normal statue-trap activation deletes the trap separately and is not used for spell animation: `nethack-c/upstream/src/trap.c:787`, `nethack-c/upstream/src/trap.c:810`, `nethack-c/upstream/src/trap.c:822`, `nethack-c/upstream/src/trap.c:861`, `nethack-c/upstream/src/trap.c:880`, `nethack-c/upstream/src/trap.c:890`, `nethack-c/upstream/src/trap.c:923`.

JS changes:

- Added failure sentinels and fallback helpers for corpse creation, no-corpse/unique preservation, floor content dropping, carried inventory replacement, and floor replacement: `js/cmd.js:12604`, `js/cmd.js:12617`, `js/cmd.js:12649`, `js/cmd.js:12660`.
- Carried and floor figurine/statue animation functions now return the failure sentinel when `makemon()` fails, allowing callers to apply C fallback behavior instead of silently leaving ordinary objects unchanged: `js/cmd.js:12677`, `js/cmd.js:12728`, `js/cmd.js:12754`.
- Inventory and floor stone-to-flesh callers now consume those fallback results, including used-up billing for unpaid carried figurines and shop anger/used-up preservation for floor polymorph-style corpse fallback: `js/cmd.js:12860`, `js/cmd.js:12906`, `js/cmd.js:12921`.
- Removed the stone-to-flesh statue-trap rejection so spell animation handles trap statues without calling `activateStatueTrap()`: `js/cmd.js:12739`.

## Tests Added

Added focused stone-to-flesh coverage in `test/shop-billing-helpers.test.mjs`:

- failed carried ordinary figurine animation becomes a corpse with the same inventory letter and a corpse timeout: `test/shop-billing-helpers.test.mjs:4179`;
- failed unpaid carried figurine animation preserves the original bill as a used-up row while the inventory item becomes a corpse: `test/shop-billing-helpers.test.mjs:4206`;
- failed no-corpse carried figurine animation leaves the original figurine and timer untouched: `test/shop-billing-helpers.test.mjs:4234`;
- failed floor statue animation becomes a corpse and drops contents to the floor: `test/shop-billing-helpers.test.mjs:4939`;
- failed shop-floor statue animation drops contents before the statue corpse fallback and keeps the dropped content bill live: `test/shop-billing-helpers.test.mjs:4969`;
- downward stone-to-flesh animates an ordinary statue trap without disarming the trap or using normal trap wording: `test/shop-billing-helpers.test.mjs:4999`.

## Deferred Gaps From This Agent Round

- Saved monster traits, historic/named statues, mimic visibility, worn statue cleanup, `m_dowear()`, directed doppelganger retargeting, and full `cant_revive()` handling remain open.
- Horizontal ordinary egg hits on monsters still need the direct `thitmonst()`/`hmon()` egg path, including `Splat!`, live-egg petrifier conversion, and used-up billing.
- Burning-oil shop-door terrain damage still needs door damage records, one `pay_for_damage("burn away", FALSE)` pass, and delayed shop-door repair.
- Thrown-gold stairs/ladders/special-stairs migration still needs C-shaped migration records and delivery modes.
- Deaf or mute shopkeeper payment feedback still needs nonverbal success and partly-used rejection messages.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "stone to flesh" test/shop-billing-helpers.test.mjs` - 61 pass, 826 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 887/887
- `npm run score` - 44/44
