# Monster anti-magic worn gear parity

## Scope

Monster anti-magic trap resistance now includes ordinary worn gear whose object property is `ANTIMAGIC`, matching C `resists_magm()`. This affects both trap pathing harmlessness and the anti-magic trap effect branch: resistant spellcasting monsters take implosion damage instead of spell-energy cooldown drain.

The slice is state-driven and does not rely on replay maps, hidden seeds, player names, move counts, or fixture-specific runtime branches.

## C reference

- `nethack-c/upstream/src/mondata.c:215` through `:242`: `resists_magm()` checks innate monster resistance, wielded defending artifacts, and then worn ordinary `ANTIMAGIC` objects in `W_ARMOR | W_ACCESSORY | W_WEP`; carried defending artifacts remain separate.
- `nethack-c/upstream/include/objects.h:502`: gray dragon scale mail has `ANTIMAGIC`.
- `nethack-c/upstream/include/objects.h:530`: gray dragon scales have `ANTIMAGIC`.
- `nethack-c/upstream/include/objects.h:644` through `:645`: cloak of magic resistance has `ANTIMAGIC`.
- `nethack-c/upstream/src/trap.c:1173` through `:1175`: anti-magic traps are harmless pathing candidates for `resists_magm()` monsters.
- `nethack-c/upstream/src/trap.c:2406` through `:2420`: non-resistant magical monsters get `d(2,6)` spell cooldown drain, while resistant monsters take `rnd(4)` implosion damage.

## JS change

- `js/allmain.js`
  - Adds a monster worn-item antimagic predicate for cloak of magic resistance, gray dragon scale mail, gray dragon scales, and explicit `ANTIMAGIC`/magic-resistance property fixtures.
  - Uses C's monster item slotmask shape: `W_ARMOR | W_ACCESSORY | W_WEP` when `owornmask` is present, so wrong-slot masks such as `W_SADDLE` do not confer resistance.
  - Wires that predicate into the shared `monsterResistsAntiMagicTrap()` helper used by pathing and trap effects.

## Tests

- `worn magic resistance cloak makes monster anti-magic pathing harmless like C`
- `unworn magic resistance cloak leaves monster anti-magic pathing hazardous like C`
- `wrong-slot magic resistance cloak leaves monster anti-magic pathing hazardous like C`
- `worn magic resistance cloak turns monster anti-magic drain into implosion damage`
- `wrong-slot magic resistance cloak leaves monster anti-magic drain intact like C`

## Verification

- `node --check js/allmain.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `git diff --check` - pass
- `node --test --test-reporter=dot --test-name-pattern "magic resistance cloak|anti-magic (pathing|trap)|magic resistant monster anti-magic|carried magic-defending artifact anti-magic|Magicbane|DFNS magic artifact|positive enchanted iron footwear" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `npm run score` - pass, 44/44 replay sessions

## Remaining nearby gaps

- Recoil monster collision anger still uses a reduced anger helper instead of the fuller C `setmangry(mon, FALSE)` path.
- Generic `wake_nearto()` visible wake messages remain under-modeled.
