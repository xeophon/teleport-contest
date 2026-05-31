# Direct chat generated nonverbal sounds

Date: 2026-05-31

## Summary

Added C-backed generated-monster sound inference for nonverbal `domonnoise()` rows whose JS generated monster records do not currently carry `msound`. Direct `#chat` now recovers C sound behavior for generated/partial monsters such as gargoyles, growling large felines, owlbears, bees, crocodiles, wumpus, Juiblex, and the dragon family without requiring fixture-local `msound` fields.

## Upstream source anchors

- `nethack-c/upstream/src/sounds.c:875`: `MS_GROWL` emits `snarls.` for peaceful monsters and `growls!` for hostile monsters.
- `nethack-c/upstream/src/sounds.c:879`: `MS_ROAR` emits `snarls.` for peaceful monsters and `roars!` for hostile monsters.
- `nethack-c/upstream/src/sounds.c:903`: `MS_BUZZ` emits `drones.` or `buzzes angrily.`
- `nethack-c/upstream/src/sounds.c:907`: `MS_GRUNT` emits `grunts.`
- `nethack-c/upstream/src/sounds.c:927`: `MS_BELLOW` emits `bellows!`
- `nethack-c/upstream/src/sounds.c:933`: `MS_CHIRP` emits `chirps.`
- `nethack-c/upstream/src/sounds.c:937`: `MS_WAIL` emits `wails mournfully.`
- `nethack-c/upstream/src/sounds.c:947`: `MS_GURGLE` emits `gurgles.`
- `nethack-c/upstream/src/sounds.c:951`: `MS_BURBLE` emits `burbles.`
- `nethack-c/upstream/include/monsters.h:100`: `killer bee` uses `MS_BUZZ`; `monsters.h:130` does the same for `queen bee`, and `monsters.h:1153`/`1161` cover `grid bug` and `xan`.
- `nethack-c/upstream/include/monsters.h:433`: `tiger` uses `MS_GROWL`; `monsters.h:441` covers `displacer beast`, `monsters.h:498` covers `bugbear`, and `monsters.h:2376`/`2383`/`2398`/`2406`/`2414` cover the apes and yeti family.
- `nethack-c/upstream/include/monsters.h:462`: `gargoyle` uses `MS_GRUNT`; adjacent rows cover `winged gargoyle`, and `monsters.h:1763`, `2056`, `2064`, `2072`, `2229`, `2237`, `2245`, `2254`, and `2262` cover ettins, ogres, and trolls.
- `nethack-c/upstream/include/monsters.h:2362`: `xorn` uses `MS_ROAR`; `monsters.h:2390` covers `owlbear`, and `monsters.h:1345` through `1556` cover active baby/adult dragons.
- `nethack-c/upstream/include/monsters.h:858`: `wumpus` uses `MS_BURBLE`; `monsters.h:1811` covers `jabberwock`.
- `nethack-c/upstream/include/monsters.h:866` and `874`: `titanothere` and `baluchitherium` use `MS_BELLOW`; `monsters.h:3311` covers `crocodile`.
- `nethack-c/upstream/include/monsters.h:3286`: `baby crocodile` uses `MS_CHIRP`.
- `nethack-c/upstream/include/monsters.h:2901`: `shade` uses `MS_WAIL`.
- `nethack-c/upstream/include/monsters.h:3059`: `Juiblex` uses `MS_GURGLE`; `monsters.h:3063` marks Juiblex as `M2_PNAME`.
- `nethack-c/upstream/include/monsters.h:3135`: `Demogorgon` uses `MS_GROWL`; `monsters.h:3137` marks Demogorgon as `M2_PNAME`.

## JS changes

- `js/cmd.js`
  - Added `TIPHAT_GENERATED_SOUND_BY_MONSTER_NAME` plus the active baby/adult dragon pattern.
  - Called the generated sound inference after explicit `msound` and existing shop/priest/orc/laugh cases, but before broader `mlet` fallbacks. This prevents generated `wumpus` and `crocodile` rows from falling through to quadruped/lizard defaults.
  - Added generated proper-name inference only for Juiblex and Demogorgon in this slice, matching the C `M2_PNAME` rows reached by the new nonverbal sound fallback. Broader proper-name cleanup remains separate.

## Tests

- Added `chat with visible generated nonverbal sound monsters uses C msound rows`, covering no-explicit-`msound` direct `#chat` canaries for `MS_GRUNT`, `MS_GROWL`, `MS_ROAR`, `MS_BUZZ`, `MS_BELLOW`, `MS_CHIRP`, `MS_BURBLE`, and `MS_GURGLE`.
- Kept the canary free of gameplay RNG; all covered sound rows are deterministic.
- Included Juiblex without fixture-local `pname` to exercise source-backed proper-name inference for this newly reached C row.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern="generated nonverbal sound|Yeenoghu|Orcus|Asmodeus" test/shop-billing-helpers.test.mjs` - 3 pass, 1494 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1497 pass
- `node --test test/*.mjs` - 1639 pass
- `npm run score` - 44/44 passing

## Remaining gaps

- Generated `MS_HUMANOID`, `MS_SOLDIER`, `MS_NURSE`, `MS_DJINNI`, `MS_SPELL`, and silent metadata remain separate.
- Broader `M2_PNAME`/`Monnam()` exactness remains separate; this slice only adds proper names needed by the new nonverbal generated sound rows.
- `monsterFromRndMeta()` still does not generate a general `msound` field; this slice keeps inference in the chat layer to avoid broad data-pipeline churn.
- Shared `domonnoise()`/`#chat` unification remains separate.
