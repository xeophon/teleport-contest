# Gray Stone Apply Use-Stone Prompt

## C Anchors

- `nethack-c/upstream/src/apply.c:4151` implements `apply_ok()`.
- `nethack-c/upstream/src/apply.c:4184` suggests unknown gray stones.
- `nethack-c/upstream/src/apply.c:4187` excludes selectable known non-touchstone gray stones when touchstone or the object's actual type is known.
- `nethack-c/upstream/src/apply.c:4394` dispatches flint, luckstone, loadstone, and touchstone through `use_stone()`.
- `nethack-c/upstream/src/apply.c:2658` implements `touchstone_ok()` for known touchstone rub targets.
- `nethack-c/upstream/src/apply.c:2680` implements `use_stone()` and prompts for the object to rub on the stone.

## JS Change

- Added gray-stone apply classification for luckstones, loadstones, touchstones, flint, and unknown gray-stone inventory.
- Unknown gray stones and touchstones are suggested by `#apply`; known non-touchstone gray stones stay out of the ordinary apply prompt while remaining selectable from `*`.
- Added a narrow `applyStoneObject` command mode that prompts for "rub on the stone", supports `?`/`*` menu behavior, cancels without time, and handles the self-rub no-time message.
- Known touchstones use a filtered rub-target prompt that suggests unknown gems and coins while downplaying already identified/non-gem junk.
- Deferred destructive cursed-touchstone and gem-identification effects; unsupported rubs currently consume a turn with C's blind/normal scritch or hallucination message shape.

## Tests

- `unknown gray stone is suggested by apply and opens stone target prompt`
- `known touchstone opens stone target prompt with downplayed self fallback`
- `known non-touchstone gray stone hides from apply prompt but star-selects stone handling`
- `known non-touchstone gray stone alone has no apply prompt`
- Focused command used during development: `node --test --test-name-pattern "unknown gray stone|known touchstone|known non-touchstone" test/shop-billing-helpers.test.mjs`

## Remaining Gaps

- Full touchstone effects remain open: cursed touchstone shattering, streak color output, gem identification, and object discovery updates.
- `#rub` should eventually share the same `use_stone()` target machinery.
- This is still a local apply-mode implementation; broader reusable `getobj()` callback primitives remain separate command work.
