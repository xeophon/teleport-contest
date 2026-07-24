# Bones Level Loading

Date: 2026-07-24

## C Reference

- `nethack-c/upstream/src/bones.c:629` through `nethack-c/upstream/src/bones.c:756` is `getbones()`: `rn2(3)` find roll, wizard `Get bones?`/`Unlink bones?` prompts, `getlev(nhfp, 0, 0)` wholesale level load, post-load fixup (sanitize given names, `mongone()` defunct monsters, `resetobjs(..., TRUE)` on monster inventories/floor/buried chains, `fix_shop_damage()`), `sanitize_engravings()`, `u.uroleplay.numbones++`, and `delete_bonesfile()` — when the unlink fails, `getbones()` returns 0 and `mklev()` regenerates.
- `nethack-c/upstream/src/restore.c:1046` through `nethack-c/upstream/src/restore.c:1230` is `getlev()` for a ghost level (`ghostly == TRUE`): every restored object and monster gets a fresh `next_ident()` (`mkobj.c:521`, one `rnd(2)` each), then the placement loop resets `mpeaceful` for non-shopkeepers to `is_unicorn && sgn(ualign)==sgn(maligntyp) ? 1 : peace_minded(data)` and runs `set_malign()`, and calls `hide_monst()` unconditionally (short-circuiting the `rnd(10)` catch-up roll used for ordinary saved levels).
- `nethack-c/upstream/src/makemon.c` `peace_minded()` ends with `rn2(16 + record)` and `rn2(2 + abs(mal))` for co-aligned monsters; both public bones loads short-circuit before it, so the recorded traces show only `rnd(2) @ next_ident` bursts.
- `nethack-c/upstream/src/bones.c:50` through `nethack-c/upstream/src/bones.c:193` is `resetobjs()`: the restore branch reverts artifacts that already exist or are quest artifacts to ordinary objects (clearing `oartifact` and the name), otherwise marks the artifact existing (`artifact_exists(..., ONAME_BONES)`), and sanitizes remaining object names.
- `nethack-c/upstream/src/bones.c:541` through `nethack-c/upstream/src/bones.c:549` is the save-side monster loop: `mlstmv = 0`, and only `if (mtmp->mtame) mtmp->mtame = mtmp->mpeaceful = 0` — non-tame peaceful state passes through the bones file and is recomputed at load.
- `nethack-c/upstream/src/bones.c:197` through `nethack-c/upstream/src/bones.c:220` is `sanitize_name()`: control chars and DEL become `.`; with the default tty options, high-bit chars become `_`.
- `nethack-c/upstream/src/mon.c:3267` `mongone()` discards the monster and its inventory (special items such as the Amulet are dropped first).
- `nethack-c/upstream/include/monsters.h` `M2_PEACEFUL` (`always_peaceful()`): shopkeeper, guard, prisoner, Oracle, priest(ess), aligned/high cleric, watchman, watch captain, Charon, mail daemon, quest leaders/guardians.

## JS Parity Slice

- `js/save.js:102` `encodeBonesLevel()` already stored the whole level (terrain, monsters, objects) plus the dead hero's ghost (named, sleeping, at the death square), the named corpse/statue, and the hero's inventory dropped and cursed at the death square. The save-side monster loop now matches `savebones()`: only tame monsters lose `mtame`/`pet`/`mpeaceful` (`js/save.js:114`), so shopkeepers and other peaceful monsters keep their saved state for the load-side recompute.
- `js/mklev.js:8270` adds `fixupRestoredBonesLevel()`, the missing `getbones()`/`getlev()` post-load fixup:
  - Non-shopkeeper monsters get `mpeaceful` recomputed against the new hero (`is_unicorn` and co-aligned stays peaceful, otherwise the existing `peaceMinded()` port, including its C `rn2` branches), followed by `set_malign()`. Ghost/shade data literals are normalized to `alwaysHostile`, and JS data literals for C `M2_PEACEFUL` monsters that lack the flag (vault guard, prisoner, priest(ess), Charon, mail daemon) are normalized to `alwaysPeaceful`, so `peaceMinded()` short-circuits exactly where C does and burns no extra rolls.
  - Restored monsters that are genocided or extinct in the new game are removed (C's `DEFUNCT_MONSTER`/`mongone()`), along with their inventories.
  - `resetobjs()` restore branch: artifacts that already exist (`game._artifacts_exist`) or are quest artifacts revert to ordinary objects (artifact flag and name cleared); otherwise the artifact is recorded as existing. Recurses into container contents and monster inventories.
  - `sanitize_name()` is applied to monster given names, non-artifact object names, and engravings (`js/mklev.js:8229`).
- `js/mklev.js:8310` `getbones()` keeps the existing `rn2(3)` roll and wizard prompt shape untouched, and now runs the fixup after each successful restore. The normal (non-wizard) path now also unlinks the bones file after a successful load and falls back to generating a fresh level if the unlink fails, matching `delete_bonesfile()`; previously the file lingered, so a second death on the same level could not write fresh bones the way C does.
- Restore ordering note: the wizard path restores after the `Unlink bones?` answer (as before) because both prompt screens in the recorded sessions show the stale previous-level display; C's own `getlev()`-then-prompt order produces the same visible frames. In a wizard-mode load where a restored monster reaches `peace_minded()`'s RNG branch, JS groups those rolls one input step later than C (after the unlink answer rather than before the prompt); no public session reaches that branch.

## Tests

- `bones load rebuilds ghost, corpse, and dropped inventory, then unlinks`
- `bones encoding strips tameness and peacefulness only from tame monsters`
- `bones fixup resets non-shopkeeper peacefulness against the new hero`
- `bones fixup removes genocided and extinct monsters`
- `bones fixup reverts duplicate and quest artifacts, records new ones`
- `bones fixup sanitizes monster names, object names, and engravings`

Verification:

```sh
node --check js/save.js
node --check js/mklev.js
node --test test/bones-loading.test.mjs
node --test test/save-bones.test.mjs
node frozen/ps_test_runner.mjs sessions/seed5006-tourist-stress-disaster.session.json
node frozen/ps_test_runner.mjs sessions/seed0030-ten-diverse-deaths.session.json
bash frozen/score.sh
```

Result: new bones-loading tests passed; full unit suite passed (including `test/save-bones.test.mjs` and `test/shop-billing-helpers.test.mjs`); both bones-loading sessions passed with identical RNG traces (`seed5006` RNG 13923/13923, `seed0030` RNG 105529/105529); full public score stayed 44/44.

## Remaining Gaps

- `hide_monst()`/`restrap()` for hiders (mimics, snakes, eels) restored from bones is not run; C burns `rn2(3)` per hiding attempt and re-disguises mimics during ghost-level `getlev()`. Shapechanger `restore_cham()` is likewise not modeled.
- `fix_shop_damage()` (repairing shop squares damaged when the bones were written) and the `no_charge` rule for partly eaten food in shops are not modeled.
- Object age shifting for ghost levels (`otmp->age = svm.moves - svo.omoves + otmp->age`), the old-fruit chain (`loadfruitchn()`/`ghostfruit()`), and `billobjs` identity accounting are not modeled; corpse rot timing from bones may differ from C.
- `mongone()` special-item drops (Amulet, invocation tools) for defunct bones monsters are not modeled; defunct monsters simply vanish with their inventory.
- Save-side `remove_mon_from_bones()` (Wizard, Medusa, nemesis, quest leader, Vlad, misplaced Oracle removal) and `fixuporacle()` are not modeled; those monsters persist in bones they would have been removed from.
- `u.uroleplay.numbones` conduct counting and the `mazexy()` downstairs repair for bones levels missing a down stair are not modeled.
- The wizard-mode `peace_minded()` RNG grouping caveat described in the JS Parity Slice.
