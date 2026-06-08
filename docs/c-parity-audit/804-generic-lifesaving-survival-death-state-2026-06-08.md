# C Parity Audit 804: Generic Lifesaving Survival Death State

Closed the generic follow-up from audit 803. JS now clears immediate death metadata after any successful `lifeSavingMore` survival prompt is dismissed, and wizard/explore death-decline cleanup uses the same helper. Prompt-stage death causes remain visible while the split `You die... But wait...` message is active, but the abandoned death no longer leaves stale killer/bones metadata after normal play resumes.

## Source Anchors

- `nethack-c/upstream/include/hack.h:598`: C's immediate killer state stores `format` and `name`; `KILLED_BY_AN` is the reset value.
- `nethack-c/upstream/include/decl.h:1149`: `svk.killer` is the global immediate killer state.
- `nethack-c/upstream/src/end.c:1061` through `:1079`: `done()` normalizes the killer metadata, increments `u.umortality`, and forces HP to zero before survival handling.
- `nethack-c/upstream/src/end.c:1081` through `:1102`: amulet life saving prints all medallion messages, consumes the amulet, applies Constitution loss, calls `savelife()`, and logs the averted death while the killer metadata is still populated.
- `nethack-c/upstream/src/end.c:1104` through `:1117`: wizard/explore death decline also calls `savelife()` and sets `survive = TRUE`.
- `nethack-c/upstream/src/end.c:1119` through `:1124`: every successful `survive` return clears `svk.killer.name`, resets `svk.killer.format`, and returns before `really_done()`.

## JS Changes

- `js/cmd.js`
  - The generic `lifeSavingMore` dismissal path now calls `clearLifeSavedDeathState()` after prompt dismissal and before normal play resumes.
  - The stoning-specific branch still clears stoning status and unsafe wielded petrifying corpses, then shares the same immediate death-state reset.
  - Negative level-teleport life saving clears the abandoned fall death before entering the later escaped-game flow, leaving `beginEscapedGame()` to set the real escape state.
  - Wizard/explore death-decline cleanup now uses `clearLifeSavedDeathState()` instead of clearing only `_death_cause` and `_death_bones_body`.
- `test/shop-billing-helpers.test.mjs`
  - Added or updated canaries for falling-rock trap life saving, poisoned dart-trap life saving, delayed food choking life saving, several inventory/fire vapor old-form life-saving paths, adjacent holy-water vapor old-form life saving, and upward holy-water vapor old-form life saving.
  - These tests preserve prompt-stage death-cause assertions where they already existed and assert the death metadata is clear after dismissal.

## Tests

- `ordinary movement lethal falling rock trap uses life saving command mode`
- `hero poisoned dart trap deadly poison uses life saving`
- `satiated carried food ration choking life-saving resets hunger`
- `fire trap command inventory fire that destroys blessed water uses lifesaving for old-form death`
- `fire scroll tower explosion inventory vapor uses lifesaving for old-form death`
- `self-zapped wand of fire inventory vapor rehumanize old form death uses lifesaving`
- `directional wand of fire bounced ray hits hero and vapor lifesaves old-form death`
- `wielded blessed water potion bash vapor rehumanize old form death uses lifesaving`
- `adjacent hero-thrown blessed water potion vapor rehumanize old form death uses lifesaving`
- `upward hero-thrown blessed water vapor lycanthropy rehumanize old form death uses lifesaving`

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `git diff --check` - pass
- Focused `node --test --test-reporter=dot --test-name-pattern "life saving|lifesaving|life-saving|wizard or explore" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- `GENOCIDED` plus amulet remains broader than this slice: in C, amulet life saving alone does not survive genocide, but wizard/explore decline can still clear via the shared survive block.
- Other JS terminal gameover paths should continue preserving final death/escape metadata; this audit only covers successful survival returns.
