# 661 - Magic Trap Remove Curse Unpunish

## C Source

- `nethack-c/upstream/src/trap.c:4317-4445` routes non-explosion magic-trap fate 20 through a pseudo `SPE_REMOVE_CURSE` spellbook and temporarily clears confusion before calling `seffects()`.
- `nethack-c/upstream/src/read.c:2194-2227` exercises Wisdom for magical scroll/spell effects before routing `SPE_REMOVE_CURSE` to the remove-curse handler.
- `nethack-c/upstream/src/read.c:1489-1620` handles remove curse effects: unblessed, non-confused remove curse targets active cursed inventory such as loadstones, and unpunishes when the hero is punished.
- `nethack-c/upstream/src/read.c:3066-3095` removes the chain object and detaches the ball during `unpunish()`.

## Port Notes

- Added a pseudo remove-curse spell helper for magic-trap fate 20 so the branch exercises Wisdom, applies the remove-curse feeling, uncurses selected active inventory, and unpunishes without scroll reading or scroll-identification side effects.
- Split the magic-trap fate table into `magicTrapFateResult()` so production `magicTrapResult()` can be tested with queued exact RNG values instead of hard-coding a replay map or seed.
- Fate 20 uses the unblessed, non-confused effect shape matching the C pseudo spellbook path.

## Tests

- `magic trap fate 20 uncurses active inventory and unpunishes hero`
- `magic trap fate 20 clears confusion only for remove curse effect`
- Focused verification: `node --test --test-reporter=dot --test-name-pattern "magic trap fate 20|attached ball fallback relocation triggers magic trap" test/shop-billing-helpers.test.mjs`

## Remaining Follow-Ups

- One-shot vault teleport trap fallback and ordinary random teleport-trap fallback still need narrower canaries beyond the fixed-destination branch.
- Blind ball/chain glyph ordering after attached-ball relocation remains open.
