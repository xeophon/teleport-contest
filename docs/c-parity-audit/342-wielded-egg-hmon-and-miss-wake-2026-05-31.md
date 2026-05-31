# C Parity Audit 342: Wielded Egg Hits and Throw Miss Wakeups

## Sources

- `nethack-c/upstream/src/dothrow.c:1951-1965`: `tmiss()` reports a thrown-object miss and, when `maybe_wakeup` is true, calls `wakeup(mon, TRUE)` on a `!rn2(3)` roll.
- `nethack-c/upstream/src/dothrow.c:2256-2260`: eggs, cream pies, blinding venom, and acid venom share the direct `hmon()` hit gate; if the dexterity gate fails, they fall through to the miss path.
- `nethack-c/upstream/src/uhitm.c:817` and `nethack-c/upstream/include/hack.h:554`: `hmon()` covers both melee and thrown object-hit modes.
- `nethack-c/upstream/src/uhitm.c:1186-1250`: `case EGG` uses nominal 1 damage, forces custom egg hit text, marks wielded eggs as unweaponed, consumes ordinary eggs with `Splat!`, and preserves the specialized petrifying, live-touch-petrifier, and pyrolisk branches.
- `nethack-c/upstream/src/uhitm.c:1923` and `nethack-c/upstream/src/mon.c:4331-4359`: surviving `hmon()` targets and attacked miss-wake targets run through `wakeup(mon, TRUE)`, clearing sleep/eating state and making non-tame peaceful targets angry.

## JS Changes

- Added a shared miss-wake helper for hero-thrown special and noncombat object misses. It preserves the C `rn2(3)` shape, clears sleep/eating/wait strategy, and routes anger through the local object-hit anger helper.
- Applied that helper to missed direct blinding venom, acid venom, cream pie, egg, potion, and generic noncombat object throws.
- Generalized the wielded potion stack-bash splitter into a consumed wielded-object helper, while keeping melee egg stacks on the C `useupall()` path.
- Added wielded egg melee bashes that route through an egg `hmon()` helper, consume ordinary/petrifying/pyrolisk egg stacks as a whole, transform live eggs hitting touch-petrifying monsters into carried rocks, and avoid ordinary weapon conduct for the egg bash.

## Tests

- `hero-thrown cream pie miss can wake and anger target through tmiss` covers the missed direct-special-object route, miss feedback, `rnd(20)`, failed `rnd(25)`, `rn2(3)`, sleep/eating/wait cleanup, and non-tame peaceful anger.
- `wielded egg bash routes through egg hmon path` covers melee ordinary egg feedback, `Splat!`, nominal damage, inventory use-up, and no weapon-conduct chronicle.
- `wielded egg stack bash consumes the whole stack as used-up eggs` covers whole-stack use-up, used-up bill tracking, total stack price preservation, and no immediate debit.
- `wielded live egg bash against cockatrice transforms in inventory` covers the non-thrown live-egg touch-petrifier branch, timer cleanup, carried rock conversion, no floor rock placement, nominal damage, and no weapon conduct.

## Remaining Gaps

- The miss-wake helper does not yet model the full `wakeup(TRUE)` surface such as mimic reveal, growl, priest retaliation, or shopkeeper pursuit.
- Broader melee `hmon()` side effects such as Elbereth/alignment penalties, guard/priest reactions, pet abuse/fleeing, and passive fallout remain combat-core work.
- Direct thrown egg shop accounting is left unchanged pending a broader source audit of the C `obfree()` monster-hit path versus current JS used-up bill behavior.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern "wielded egg|cream pie miss can wake|wielded potion stack bash|wielded confusion potion bash|hero-thrown blinding venom direct hit|hero-thrown ordinary egg hits visible monster|hero-thrown cream pie direct hit|hero-thrown acid venom direct hit" test/shop-billing-helpers.test.mjs` - 19 pass, 1411 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1430 pass
- `node --test test/*.mjs` - 1569 pass
- `npm run score` - 44/44 passing
