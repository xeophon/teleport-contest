# 662 - Attached Ball Teleport One-Shot And Random

## C Source

- `nethack-c/upstream/src/dothrow.c:1823-1840` places a thrown attached iron ball and calls `drop_ball()`.
- `nethack-c/upstream/src/ball.c:891-958` relocates the hero, moves the chain, and calls `spoteffects(TRUE)` on the new hero square.
- `nethack-c/upstream/src/trap.c:2999-3043` applies the ordinary seen-trap escape prelude; hidden teleport traps and fixed-destination teleport traps do not take the `rn2(5)` escape branch.
- `nethack-c/upstream/src/trap.c:2069-2078` marks hero teleport traps seen before calling `tele_trap()`.
- `nethack-c/upstream/src/teleport.c:1508-1511` deletes one-shot teleport traps and calls `vault_tele()`.
- `nethack-c/upstream/src/teleport.c:772-783` tries a vault room square through `somexyspace()` and falls back to ordinary `tele()` if no valid vault square exists.
- `nethack-c/upstream/src/teleport.c:1531-1532` falls through to ordinary same-level `tele()` when no one-shot or fixed destination applies.
- `nethack-c/upstream/src/teleport.c:448-528` moves the hero and ball/chain during same-level teleport.

## Port Notes

- Added a vault teleport destination helper for movement teleport traps, so attached-ball fallback onto one-shot `TELEP_TRAP` deletes the trap and tries the C-style vault-biased destination before ordinary random teleport.
- Ordinary hidden teleport traps now have an exact-RNG canary showing the attached ball and chain follow the hero to the safe same-level destination.
- One-shot vault and ordinary random teleport canaries assert hidden traps do not consume the seen-trap `rn2(5)` escape roll.

## Tests

- `attached ball fallback relocation triggers one-shot vault teleporter on new hero square`
- `attached ball fallback relocation triggers ordinary random teleport trap on new hero square`
- Focused verification: `node --test --test-reporter=dot --test-name-pattern "attached ball fallback relocation triggers fixed teleport|attached ball fallback relocation triggers one-shot vault|attached ball fallback relocation triggers ordinary random teleport" test/shop-billing-helpers.test.mjs`

## Remaining Follow-Ups

- Blind ball/chain glyph ordering after attached-ball relocation remains open.
