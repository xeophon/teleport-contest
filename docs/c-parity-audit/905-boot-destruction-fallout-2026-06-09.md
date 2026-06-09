# Boot Destruction Fallout

Date: 2026-06-09

## C anchors

- `nethack-c/upstream/src/do_wear.c:262` `Boots_off()` clears `W_ARMF` before applying boot-specific fallout.
- `nethack-c/upstream/src/read.c:1324` `seffect_destroy_armor()` routes cursed and blessed scroll-of-destroy-armor cases through `disintegrate_arm()` and ordinary blessed destruction through `destroy_arm()`.
- `nethack-c/upstream/src/do_wear.c:3241` `disintegrate_arm()` prints `Your boots disintegrate!` before removing destroyed boots.
- `nethack-c/upstream/src/do_wear.c:3249` `disintegrate_arm()` calls `wornarm_destroyed()` after the destruction message.
- `nethack-c/upstream/src/do_wear.c:3166` `wornarm_destroyed()` calls `Boots_off()` for worn boots.
- `nethack-c/upstream/src/do_wear.c:3170` notes the worn armor might already be destroyed by the takeoff side effect, so `useup()` happens only if the object is still in inventory.
- `nethack-c/upstream/src/do_wear.c:3278` `destroy_arm()` includes boots in the random worn-armor list and calls `erode_obj(..., EF_PAY | EF_DESTROY)`.
- `nethack-c/upstream/src/trap.c:319` destroying an eroded worn item calls `remove_worn_item()`, which dispatches to `Boots_off()` before deletion.

## JS changes

- Updated `destroyWornArmorItem()` to clear worn state first, run boot-off side effects for destroyed boots, and only then delete the boot if it survived the side effect.
- Routed `erodeDestroyArmor()` and `disintegrateArm()` through the shared destruction helper with their message arrays, preserving C message order: destruction text before boot terrain fallout.
- Preserved fatal lava `--More--` state when scroll-of-destroy-armor fallout enters `lavaDeathMore`.
- Kept generic fire inventory damage out of this slice because C `burnarmor()` erodes but does not destroy/remove worn boots.

## Tests

- `cursed destroy armor destroying water walking boots over pool triggers water fallout before useup`
- `cursed destroy armor destroying water walking boots over lava preserves fatal lava more`
- `cursed destroy armor destroying levitation boots over lava sinks after float down`

## Verification

- `node --check js/cmd.js`
- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "destroy armor destroying .*boots|water walking boots over lava preserves fatal|levitation boots over lava sinks" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "destroy armor|water walking boots over lava|levitation boots over lava|water walking boots falls into pool|levitation boots over pool|fumble boots does not" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/*.mjs`
- `git diff --check`
- `npm run score` (`44/44 passing`)

## Remaining gaps

- `lava_effects()` still needs its guarded worn-boot pre-pass: burst-into-flame message, `Boots_off()` while recursive lava fallout is suppressed, boot useup, then the lava fall/sink handling.
- Over-enchant armor evaporation was addressed in `docs/c-parity-audit/906-overenchant-armor-evaporation-fallout-2026-06-09.md`.
- Full `lava_effects()` parity still has unmodeled inventory destruction, lifesaving/explore rescue, fireproof item, and recursive in-use object details.
- Full `remove_worn_item()` parity for theft/seduction/non-scroll forced removal remains broader than this destruction-only slice.
