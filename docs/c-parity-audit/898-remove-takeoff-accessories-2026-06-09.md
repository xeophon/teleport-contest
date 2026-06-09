# Remove and takeoff accessories

## C anchors

- `nethack-c/upstream/src/cmd.c` maps top-level `T` to `dotakeoff()` and top-level `R` to `doremring()`.
- `nethack-c/upstream/src/do_wear.c:1769` through `:1829` shares removal through `armor_or_accessory_off()`, accepting worn armor, rings, amulets, and facewear.
- `nethack-c/upstream/src/do_wear.c:1833` through `:1855` makes `T` report `Not wearing any armor or accessories.`, auto-remove only when exactly one armor piece is worn, and otherwise prompt with armor-first candidates.
- `nethack-c/upstream/src/do_wear.c:1874` through `:1889` makes `R` report `Not wearing any accessories or armor.`, auto-remove only when exactly one accessory is worn, and otherwise prompt with accessory-first candidates.
- `nethack-c/upstream/src/do_wear.c:1908` through `:2013` handles cursed failures, delayed armor removal, immediate armor off messages, and ring/amulet/facewear off message ordering.

## JS parity

- `js/cmd.js` now has shared worn equipment predicates and a shared `takeOffEquipment()` path for armor, rings, amulets, meat rings, and facewear.
- Top-level `R` is wired and shares the removal command mode with `T`; it auto-removes a lone accessory and falls back to armor selection when no accessories are worn.
- Top-level `T` now counts worn accessories for the no-equipment message and selection path, while keeping armor-first prompt letters so public C prompt displays remain exact.
- Prompt-driven shield removal preserves the old prompt visually for the one captured boundary where C leaves the non-more shield off-message off-screen; the real pending message is still retained for later `--More--` chaining.
- `js/display.js` and `js/jsmain.js` support that one-boundary pending-message visual override and clear it after replay capture.

## Tests

- `remove command auto-removes lone worn ring with hand wording`
- `remove command auto-removes lone worn amulet`
- `takeoff command prompts for facewear when no armor is worn`
- `remove command can prompt and take off armor fallback`

## Verification

- `node --check js/cmd.js`
- `node --check js/display.js`
- `node --check js/jsmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-reporter=dot --test-name-pattern "remove command|takeoff command|putting on.*blindfold|putting on.*lenses|wear command fallback.*towel|applying.*blindfold|applying.*lenses|towel or lenses|temporarily blind" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `node tools/compare-one-session.mjs sessions/seed0014-dequa-fountain-explore.session.json`
- `node tools/compare-one-session.mjs sessions/seed0361-archeologist-tour.session.json`
- `node tools/compare-one-session.mjs sessions/seed0367-priest-quest-tour.session.json`
- `node tools/compare-one-session.mjs sessions/seed4500-knight-coverage.session.json`
- `node tools/compare-one-session.mjs sessions/seed5006-tourist-stress-disaster.session.json`
- `npm run score` (`44/44 passing`)

## Remaining follow-up

- The `A` takeoff-all path is still separate and should be audited against C `dotakeoffall()` behavior.
- Ring-specific blockers such as slippery gloves, welded weapons, and limb/polyself constraints remain only partially modeled outside the public replay surface.
- Full getobj menu/downplay behavior for armor-vs-accessory candidates is still approximated by prompt-letter filtering rather than a full C-style object picker.
