# 643 - Horizontal Throw Early-Hit Recoil Messages

## C Source

- `nethack-c/upstream/src/dothrow.c:1674-1682` runs ordinary horizontal `bhit()` with the air/levitation split range, then calls `hurtle(-u.dx, -u.dy, urange, TRUE)` before post-flight hit handling.
- `nethack-c/upstream/src/dothrow.c:1695-1698` calls `throwit_mon_hit(obj, mon)` only after recoil, and returns immediately if that helper consumes the hit.
- `nethack-c/upstream/src/dothrow.c:2152` rolls the direct-hit `rnd(20)` before special hit handling, then `dothrow.c:2256-2265` uses the guaranteed-hit/Dexterity check for eggs, cream pies, blinding venom, acid venom, and potions.
- `nethack-c/upstream/src/uhitm.c:1186-1256` covers egg `hmon()` fallout, `uhitm.c:1265-1318` covers cream-pie/blinding-venom fallout, and `uhitm.c:1319-1340` covers acid-venom fallout.
- `nethack-c/upstream/src/potion.c:1625-1677` covers `potionhit()` bottle breakage/chip setup, with potion effects continuing through `potion.c:1730-1896`.

## Port Notes

- JS already computed `ordinaryAirRecoilMessage` by moving the hero with `heroHorizontalThrowRecoil()` before the special direct-hit branches.
- The successful early returns for blinding/acid venom, cream pies, eggs, and potions now prepend that recoil message to their existing branch-specific message arrays before `setMessage()`.
- The helper mutates the existing arrays instead of replacing them, preserving attached flags such as `messages.more`, `messages.lifeSaving`, and `messages.fatal` for egg and potion command-mode handoff.
- The same helper is used for the breakable iron-bars early return, matching the C ordering where recoil occurs before the generic `!obj` return after `bhit()`.

## Tests

- `levitating hero-thrown ordinary egg direct hit prepends recoil message`
- `levitating hero-thrown cream pie direct hit prepends recoil message`
- `levitating hero-thrown blinding venom direct hit prepends recoil message`
- `levitating hero-thrown hallucination potion direct hit prepends recoil message`
- Focused verification: `node --test --test-name-pattern='levitating hero-thrown .* direct hit prepends recoil message' test/shop-billing-helpers.test.mjs`

## Remaining Follow-Ups

- Full `hurtle_step()` parity for collision, trap, pool/lava, room/shop, and punishment fallout is still outside this message-ordering slice.
- Crossbow/launcher ammo, multishot, Mjollnir, heavy iron ball, and full ball-and-chain range details remain outside this focused clear-floor slice.
