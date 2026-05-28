# Subagent Findings 114 - Upward Venom Toss-Up

## Implemented Slice: Acid and Blinding Venom

Covered the upward hero-thrown non-potion `toss_up()` path for `ACID_VENOM` and `BLINDING_VENOM`. Venom now participates in the shared break-test path as a `Splash!` break kind instead of potion bottle shattering or evaporation. Blinding venom self-hits add the face-splatter message and blindness side effects only after the object breaks; ceiling breaks only splash and consume the thrown object.

C source:

- `nethack-c/upstream/src/dothrow.c:1588`: upward throws decide `hitsroof` with `rn2(5) && !Underwater` before `toss_up()`.
- `nethack-c/upstream/src/dothrow.c:1268`: roof-hit objects run `breaktest()` before ceiling break messaging.
- `nethack-c/upstream/src/dothrow.c:1269`: roof-hit breakage prints the object/ceiling hit line.
- `nethack-c/upstream/src/dothrow.c:1270`: roof-hit breakage calls `breakmsg()` before `breakobj()`.
- `nethack-c/upstream/src/dothrow.c:1284`: non-roof and non-broken roof-hit objects fall back on the hero's head.
- `nethack-c/upstream/src/dothrow.c:1291`: self-hit non-potions run `breaktest()` again.
- `nethack-c/upstream/src/dothrow.c:1295`: blinding-venom blindness is computed before object deletion.
- `nethack-c/upstream/src/dothrow.c:1300`: self-hit breakage calls `breakmsg()` before `breakobj()`.
- `nethack-c/upstream/src/dothrow.c:1318`: `BLINDING_VENOM` shares the cream-pie face-splatter message.
- `nethack-c/upstream/src/dothrow.c:2582`: `breaktest()` uses `obj_resists(obj, 1, 99)` before the explicit venom break cases.
- `nethack-c/upstream/src/dothrow.c:2648`: both acid and blinding venom print `Splash!`.
- `nethack-c/upstream/src/mondata.c:304`: `can_blnd()` allows already-blind defenders but blocks blinding venom through blindfold/towel, existing cream, or a visored helmet.

Subagent findings:

- The C audit confirmed the exact ordering: `rn2(5)`, `rn2(100)` for break resistance, and only then `rnd(25)` for eligible blinding-venom self-hits.
- The JS audit identified existing venom object creation from wishing, fallback naming through `pickupObjectName()`, and the missing upward throw branch.
- The test-design audit selected public seeds for self-hit, ceiling break, no-ceiling air level, acid-venom no-effect self-hit, and stack billing.

Covered JS behavior:

- `js/cmd.js`: venom objects are detected by `cls: 'venom'` or the acid/blinding venom otyp values.
- `js/cmd.js`: venom uses a shared `splash` break kind so projectile, floor-impact, magic-bag scatter, and remote muffled-break messages avoid shatter wording.
- `js/cmd.js`: upward venom handles ceiling break, self-hit break, no-ceiling wording, stack splitting, object removal, and broken-unit shop debt.
- `js/cmd.js`: blinding venom self-hit updates `ucreamed`, blind timeout, status suffix, and suppresses `It blinds you!` when the hero was already blind.
- `js/cmd.js`: acid venom self-hit only splashes; it does not apply potion-of-acid burn damage.

Regression coverage:

- `test/shop-billing-helpers.test.mjs`: blinding venom self-hit splashes, face-splatters, blinds, removes the object, and consumes `rn2(5)`, `rn2(100)`, `rnd(25)`.
- `test/shop-billing-helpers.test.mjs`: blinding venom ceiling break splashes and consumes the object without face or blindness effects.
- `test/shop-billing-helpers.test.mjs`: already-blind self-hit extends blindness without repeating `It blinds you!`.
- `test/shop-billing-helpers.test.mjs`: acid venom self-hit and no-ceiling air-level fallback only splash and leave hero HP unchanged.
- `test/shop-billing-helpers.test.mjs`: unpaid blinding venom stack throws split one unit, remove only the thrown splash, and charge one broken unit as shop debt.

Verification:

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "venom|cream pie" test/shop-billing-helpers.test.mjs`
- `npm run score` (`44/44 passing`)

## Remaining Upward Throw Gaps

- Lit oil self-hit and ceiling break still need `explode_oil()`/burning-oil fallout ordering, including blast terrain/object collateral and shop cleanup.
- Crackable glass armor remains separate because C gives glass armor a 90% nonbreak chance and routes breakage through `is_crackable()`/`erode_obj()` instead of deleting it.
- Broader glass/crystal object breakage remains separate until more object metadata is registry-backed instead of name-only.
- Pyrolisk eggs need the `breakobj()` explosion branch before they are safe to fold into egg handling.
- Touch-petrifying eggs/corpses need stone-resistance, stone-golem polymorph rescue, and helmet wording before they are safe to implement.
- Generic non-breakable upward impacts still need `dmgval()`, weight-derived damage, hard-helmet mitigation, `Maybe_Half_Phys()` mitigation, silver/blessed bonuses, harmless missiles, and survivor `hitfloor()` disposition.
