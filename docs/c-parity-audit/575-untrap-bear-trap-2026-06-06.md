# C Parity Audit 575: Seen Bear-Trap Untrap

Seen `BEAR_TRAP` targets now have a C-shaped `#untrap` path. Successful empty-trap disarming creates a single floor `beartrap` object with iron material, 200 weight, 60 base shop cost, and non-merging stack metadata. Ranger auto-success skips the final odds roll when the adjusted chance is three or less. User-made bear traps converted inside a shop run the existing dropped-object sale valuation as an automatic sale, matching C `sellobj()` rather than opening a prompt.

The slice also covers same-square trap/container prompting, trapped-monster extraction rewards, ordinary boulder and reach blockers, blocked failed movement including fixed ball-and-chain state, fatal failed movement, and the difficult-disarm failure message. Because C uses the same `disarm_holdingtrap()` success path for webs and bear traps, the shared monster-extraction reward helper is now used by webs too. No replay maps, private seeds, player names, move-count branches, or fixture-specific runtime branches are used. The canaries use deterministic unit-test RNG to pin the live C call order, including `mksobj()`'s ident roll for converted objects.

## Source Anchors

- `nethack-c/upstream/src/trap.c:5288` through `:5328`: `untrap_prob()` starts from chance 3, applies hero-status penalties, improves user-made traps, and gives Rangers automatic success when the adjusted chance is at most 3.
- `nethack-c/upstream/src/trap.c:5341` through `:5356`: `cnv_trap_obj(BEARTRAP, ...)` creates a `BEARTRAP` object through `mksobj()`, forces quantity 1, recomputes weight, places the object, calls `sellobj()` for user-made traps, stacks where allowed, and deletes the trap.
- `nethack-c/upstream/src/trap.c:5571` through `:5575`: successful empty bear-trap disarming prints the disarm message and converts the trap into a floor object.
- `nethack-c/upstream/src/trap.c:5711` through `:5722`: trapped monsters are extracted from bear traps without deleting the trap; failed attempts can print `Whoops...` and damage the trapped monster with `rnd(4)`.
- `nethack-c/upstream/include/objects.h:970`: `BEARTRAP` is an iron tool with weight 200 and base cost 60.
- `nethack-c/upstream/src/invent.c:4377` through `:4385`: `stackobj()` refuses to merge objects whose object class has `oc_merge` false, so beartraps remain separate floor objects.

## JS Changes

- `js/cmd.js`
  - Adds seen `BEAR_TRAP` dispatch to the directional `#untrap` handler.
  - Adds C-shaped bear-trap odds, reach wording, blocked-square checks, failure handling, monster extraction rewards, trap-to-object conversion, and automatic user-made shop sale.
  - Shares the same-square holding-trap/container prompt between webs and bear traps.
  - Preserves fatal and life-saving command modes when a failed adjacent disarm moves the hero into the trap and triggers lethal bear-trap damage.
  - Adds local `beartrap` weight and shop-cost metadata so converted objects value like C objects in this path.
  - Reuses the web reach blocker with trap-specific wording, preserving the existing web behavior.

## Tests

- `#untrap disarms a seen bear trap into a floor beartrap`
  - Pins successful empty-trap conversion, generated object metadata, non-movement, trap deletion, and `rn2(3)` plus `rnd(2)` order.
- `#untrap bear trap conversion does not merge with existing beartraps`
  - Pins C `oc_merge=0` behavior by keeping converted and existing beartraps as separate floor objects.
- `#untrap Ranger auto-disarms a seen bear trap without a final odds roll`
  - Pins the Ranger auto-success branch and confirms only the object ident roll is consumed.
- `#untrap user-made bear trap in shop auto-sells after conversion`
  - Pins automatic shop compensation without leaving a sale prompt pending.
- `#untrap bear trap failure can leave the hero in place`
  - Pins the difficult-disarm failure branch and spent-turn behavior.
- `#untrap failed adjacent bear trap disarm respects blocked movement`
  - Pins the C `move_into_trap()` blocker follow-up instead of moving the hero through an obstructed square.
- `#untrap failed adjacent bear trap disarm respects fixed ball and chain`
  - Pins the same follow-up for fixed ball-and-chain state where C `drag_ball()` would block movement.
- `#untrap fatal failed adjacent bear trap disarm preserves death more`
  - Pins lethal failed-disarm trap damage leaving `deathDieMore` armed and `context.move` clear.
- `#untrap adjacent bear trap is blocked by a boulder for ordinary heroes`
  - Pins the adjacent boulder blocker before RNG.
- `#untrap extracts a trapped monster from a seen bear trap`
  - Pins trapped-monster extraction, gratitude, lawful alignment reward, and leaving the trap in place.
- `#untrap current-square bear trap and box can skip trap for box prompt`
  - Pins same-square trap/container prompt routing and the `n` path into the box prompt without consuming RNG.
- `#untrap extracts a trapped monster from a seen web`
  - Updates the existing web extraction canary to the same C `reward_untrap()` side effects used by bear traps.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=spec --test-name-pattern "#untrap .*bear trap|#untrap .*web" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot --test-name-pattern "#untrap .*bear trap|#untrap .*web|already-trapped monster bear trap|hero bear trap" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `npm run score` - pass, 44/44 public sessions
- `git diff --check` - pass
- `git diff --cached --check` - pass
