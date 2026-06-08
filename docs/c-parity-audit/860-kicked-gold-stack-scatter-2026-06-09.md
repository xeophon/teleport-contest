# Kicked Gold Stack Scatter

## C anchors

- `nethack-c/upstream/src/dokick.c:558` marks kicked coins with `isgold`.
- `nethack-c/upstream/src/dokick.c:573` computes kicked gold range from the full stack weight, unlike non-gold stacks which temporarily use a single item.
- `nethack-c/upstream/src/dokick.c:692` enters the multi-coin branch only after fragile and low-range checks.
- `nethack-c/upstream/src/dokick.c:696` scatters on `rn2(20) != 0`, with `Thwwpingg!`, `ROLL_FROM(flyingcoinmsg)`, then `scatter(x, y, rnd(3), VIS_EFFECTS | MAY_HIT, gk.kickedobj)`.
- `nethack-c/upstream/src/dokick.c:710` makes the rare `rn2(20) == 0 && quan > 300` branch thump in place.
- `nethack-c/upstream/src/dokick.c:717` lets rare `rn2(20) == 0 && quan <= 300` fall through to normal kicked-coin flight as the whole stack.
- `nethack-c/upstream/src/explode.c:760` partitions a scattered stack with repeated `rnd(quan - 1)` splits, extracting the whole original stack.
- `nethack-c/upstream/src/explode.c:821` assigns each scatter piece `rn2(N_DIRS)` and `rnd(max(1, blastforce - owt / 40))`.
- `nethack-c/upstream/src/explode.c:899` lands each survivor through `flooreffects(..., "land")`, then `place_object()` and `stackobj()`.

## JS parity

- `js/cmd.js` now lets gold stacks through the kicked floor-object support gate while leaving other non-fragile stacks gated.
- Kicked gold range now uses full-stack gold weight.
- Multi-coin kick messages use counted coin `doname()` wording, for example `You kick 7 gold pieces.`
- The `rn2(20)` scatter branch now emits C's coin messages, consumes RNG in C order, partitions the whole stack into random sub-stacks, and lands each piece through floor effects and stacking.
- The rare no-scatter branches are covered: `quan > 300` thumps in place, while `quan <= 300` falls through to normal whole-stack kicked-coin flight.

## Remaining follow-up

- Shop-origin gold scatter billing is still blocked by the existing costly-floor kicked-object gate. C's scatter path uses `scatter()` shop-origin accounting rather than `costly_gold()`, so that should be handled as a separate shop-ledger slice.

## Verification

- `node --test --test-name-pattern "command kick single gold piece|command kicked single gold piece|command kicked multi gold stack|command kicked small multi gold stack|command kicked large multi gold stack" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `npm run score`
