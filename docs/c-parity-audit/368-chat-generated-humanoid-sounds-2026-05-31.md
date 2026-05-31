# Direct chat generated humanoid sounds

Date: 2026-05-31

## Summary

Added C-backed generated-monster sound inference for the exact generated `MS_HUMANOID` monsters whose JS generated monster records do not currently carry `msound`. Direct `#chat` now recovers the C humanoid path for hobbits, dwarves, centaurs, quantum mechanics, genetic engineers, and generated elves without adding broad humanoid-shape inference.

## Upstream source anchors

- `nethack-c/upstream/src/sounds.c:1025`: `MS_HUMANOID` handles hostile humanoids as `threatens you.` and otherwise continues into peaceful humanoid branches.
- `nethack-c/upstream/src/sounds.c:1038`: confused or stunned peaceful humanoids use the C `Huh?`/`What?`/`Eh?` RNG branch.
- `nethack-c/upstream/src/sounds.c:1054`: peaceful elves, dwarves, and centaurs use their specific interest rows before the generic dungeon-exploration fallback.
- `nethack-c/upstream/src/sounds.c:1082`: hobbits use the One Ring row unless injured enough for the complaint branch.
- `nethack-c/upstream/include/monsters.h:477`: `hobbit` uses `MS_HUMANOID`.
- `nethack-c/upstream/include/monsters.h:485`, `:502`, and `:511`: `dwarf`, dwarf leader aliases, and dwarf ruler aliases use `MS_HUMANOID`.
- `nethack-c/upstream/include/monsters.h:1301`, `:1308`, and `:1316`: all generated centaurs use `MS_HUMANOID`.
- `nethack-c/upstream/include/monsters.h:2127` and `:2136`: `quantum mechanic` and `genetic engineer` use `MS_HUMANOID`.
- `nethack-c/upstream/include/monsters.h:2646`, `:2654`, `:2662`, `:2670`, and `:2679`: generated elf rows and their C aliases use `MS_HUMANOID`.
- `js/monster_data.js:44`, `:45`, `:47`, `:48`, `:129`, `:130`, `:131`, `:203`, `:204`, and `:253` through `:257`: local generated monster metadata has the corresponding names but no explicit `msound` field.

## JS changes

- `js/cmd.js`
  - Extended `TIPHAT_GENERATED_SOUND_BY_MONSTER_NAME` with exact source-backed generated `MS_HUMANOID` names and aliases.
  - Included C `NAMS()` display aliases such as `dwarf lord`, `dwarf king`, `elf-lord`, and `Elvenking` in addition to local neutral generated names.
  - Kept `human`, plain `elf`, role monsters, quest variants, and other `G_NOGEN` or non-generated rows out of the inference map.
  - Avoided a generic `tipHatMonsterHumanoid(mon)` fallback because the local shape predicate is broader than C `msound` metadata.

## Tests

- Added `chat with visible generated humanoid sound monsters uses C msound rows`.
- Covered no-explicit-`msound` direct `#chat` canaries for:
  - hostile quantum mechanic threats,
  - hobbit One Ring chat,
  - dwarf leader and dwarf king mining rows,
  - forest centaur hunting rows,
  - Green-elf and Elvenking orc-cursing rows,
  - peaceful genetic engineer dungeon-exploration fallback,
  - seed-stable confused genetic engineer `What?` branch.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern="generated humanoid sound|generated special sound|generated nonverbal sound|visible generated-sound" test/shop-billing-helpers.test.mjs` - 6 pass, 1493 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1499 pass
- `node --test test/*.mjs` - 1641 pass
- `npm run score` - 44/44 passing

## Remaining gaps

- Generated silent metadata remains separate and affects target selection as well as response routing.
- `monsterFromRndMeta()` still does not generate a general `msound` field; chat-layer inference remains a narrow bridge until the monster metadata pipeline is broadened.
- Shared `domonnoise()`/`#chat` unification remains separate.
