# Over-Enchant Armor Evaporation Fallout

Date: 2026-06-09

## C anchors

- `nethack-c/upstream/src/read.c:1121` `seffect_enchant_armor()` selects a worn armor target with `some_armor(&gy.youmonst)`.
- `nethack-c/upstream/src/read.c:1178` computes `s = scursed ? -otmp->spe : otmp->spe`.
- `nethack-c/upstream/src/read.c:1179` evaporates over-enchanted armor when `s` is over the normal/special threshold and `rn2(s)` succeeds.
- `nethack-c/upstream/src/read.c:1181` prints the violent glow/vibration evaporation message.
- `nethack-c/upstream/src/read.c:1187` calls `remove_worn_item(otmp, FALSE)` before final deletion.
- `nethack-c/upstream/src/read.c:1188` then calls `useup(otmp)`, preserving used-up shop billing for destroyed merchandise.
- `nethack-c/upstream/src/steal.c:247` through `nethack-c/upstream/src/steal.c:260` dispatch `remove_worn_item()` to slot-specific off handlers.
- `nethack-c/upstream/src/do_wear.c:280` through `nethack-c/upstream/src/do_wear.c:290` make water-walking boots trigger pool/lava `spoteffects(TRUE)` during `Boots_off()`.
- `nethack-c/upstream/src/do_wear.c:662` through `nethack-c/upstream/src/do_wear.c:675` handle gauntlets-of-power known/stat/encumbrance fallout during `Gloves_off()`.

## JS changes

- Routed `enchantArmorScrollEffect()` over-enchant evaporation through `destroyWornArmorItem()` instead of manually adjusting AC and removing the item.
- Kept C message ordering by creating the evaporation message first, then passing the same message array into the worn-armor destruction helper for boot terrain fallout.
- Changed `destroyWornArmorItem()` final removal to `useUpInventoryItem()` so evaporated/destroyed billed armor leaves a used-up bill row like C `useup()`.
- Reused glove-off side effects for destroyed gloves so gauntlets of power restore strength and record discovery on forced destruction.
- Preserved `lavaDeathMore` after scroll-of-enchant-armor boot fallout so fatal lava continues to the death attributes prompt after `--More--`.

## Tests

- `uncursed enchant armor evaporating unpaid worn armor preserves a used-up bill`
- `uncursed enchant armor evaporating gauntlets of power restores strength before useup`
- `uncursed enchant armor evaporating water walking boots over pool triggers water fallout before useup`
- `uncursed enchant armor evaporating water walking boots over lava preserves fatal lava more`

## Verification

- `node --test --test-name-pattern "uncursed enchant armor evaporating" test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "uncursed enchant armor evaporating|destroy armor destroying|blessed destroy armor|confused uncursed destroy armor" test/shop-billing-helpers.test.mjs`
- `node --test test/shop-billing-helpers.test.mjs` (`3091/3091 passing`)
- `git diff --check`

## Remaining gaps

- `lava_effects()` still needs its guarded worn-boot pre-pass: burst-into-flame message, `Boots_off()` while recursive lava fallout is suppressed, boot useup, then the lava fall/sink handling.
- Full `remove_worn_item()` parity for theft/seduction/non-scroll forced removal remains broader than this scroll-destruction slice.
