# 753 - Direct melee priest wakeup ghod_hitsu

## Implemented Slice

Direct hero melee nonlethal hits against a peaceful temple priest now model the C surviving-hit tail: after the hit message, the priest is woken and angered, temple retaliation is attempted unconditionally for the anger transition, and the `hmon()` wrapper can immediately perform a second priest-retaliation check on `!rn2(2)`.

The implemented helper covers the source-visible state and ordering for this narrow slice:

- the peaceful-priest snapshot is taken before damage, so the anger path still runs after the hit even though damage and messages have already been applied;
- sleeping/eating state and waiting strategy are cleared as part of the wakeup/anger transition;
- peacefulness is cleared, the target is marked hostile/angry, and visible humanoid priests emit the C-style anger message;
- co-aligned priests penalize alignment record by 5 and cross-aligned priests reward it by 2, using the priest alignment fallback instead of assuming shrine fixture data;
- if the priest is in a temple room, the anger transition attempts `ghod_hitsu()` immediately;
- the later `hmon()` wrapper `!rn2(2)` check can perform a second `ghod_hitsu()` attempt before town-watch anger and before passive/flee fallout;
- shrine validity, deity message selection, Wisdom exercise, and the recorded lightning origin/direction reuse the lethal priest helper from audit 752.

C anchors:

- Direct melee enters `hitum()` through the known-target hit path, records pre-hit state, calls `known_hitum()`, and reaches passive effects only after the `hmon()` wrapper returns: `nethack-c/upstream/src/uhitm.c:778`, `nethack-c/upstream/src/uhitm.c:786`, `nethack-c/upstream/src/uhitm.c:789`.
- `known_hitum()` calls `hmon(mon, weapon, HMON_MELEE, dieroll)` before the low-HP flee rolls: `nethack-c/upstream/src/uhitm.c:622`, `nethack-c/upstream/src/uhitm.c:625`, `nethack-c/upstream/src/uhitm.c:628`.
- `hmon()` snapshots guard anger, resolves `hmon_hitmon()`, then performs the priest wrapper `!rn2(2)` retaliation before town-watch anger: `nethack-c/upstream/src/uhitm.c:826`, `nethack-c/upstream/src/uhitm.c:828`, `nethack-c/upstream/src/uhitm.c:829`, `nethack-c/upstream/src/uhitm.c:831`.
- Nonlethal damage and the visible hit message happen before `wakeup(mon, TRUE)`: `nethack-c/upstream/src/uhitm.c:1845`, `nethack-c/upstream/src/uhitm.c:1870`, `nethack-c/upstream/src/uhitm.c:1923`.
- `wakeup()` clears sleeping state, cancels eating, calls `setmangry()`, and for a formerly peaceful priest in a temple calls `ghod_hitsu()` unconditionally: `nethack-c/upstream/src/mon.c:4335`, `nethack-c/upstream/src/mon.c:4338`, `nethack-c/upstream/src/mon.c:4349`, `nethack-c/upstream/src/mon.c:4355`, `nethack-c/upstream/src/mon.c:4356`.
- `setmangry()` clears wait strategy, clears peacefulness, adjusts priest alignment record by co-aligned/cross-aligned cases, and prints the visible anger message: `nethack-c/upstream/src/mon.c:4288`, `nethack-c/upstream/src/mon.c:4296`, `nethack-c/upstream/src/mon.c:4297`, `nethack-c/upstream/src/mon.c:4304`.
- `ghod_hitsu()` requires a valid temple shrine, selects one of three deity messages, fires lightning, and exercises Wisdom negatively: `nethack-c/upstream/src/priest.c:802`, `nethack-c/upstream/src/priest.c:804`, `nethack-c/upstream/src/priest.c:846`, `nethack-c/upstream/src/priest.c:850`, `nethack-c/upstream/src/priest.c:870`, `nethack-c/upstream/src/priest.c:873`.

JS changes:

- Added direct-melee helper logic for nonlethal priest wakeup/anger and the surviving-hit `hmon()` tail.
- Moved direct-melee town-watch survivor anger into the same post-hit, pre-passive/pre-flee tail so priest and guard side effects preserve C ordering.
- Kept shrine validation inside the shared `directMeleePriestRetaliation()` helper; nonlethal no-shrine tests assert anger still happens while divine retaliation does not.

## Tests Added

Focused regression coverage in `test/shop-billing-helpers.test.mjs` now asserts:

- a nonlethal direct melee hit against a peaceful temple priest leaves the priest alive, wakes and angers it, applies the co-aligned penalty, emits visible anger, and triggers the unconditional temple `ghod_hitsu()`;
- the same survivor path can trigger both the unconditional wakeup retaliation and the wrapper `!rn2(2)` second retaliation in C order;
- a formerly peaceful temple priest with a plain aligned altar but no shrine bit still becomes angry, but no divine retaliation or lightning record is produced.

## Deferred Gaps

- Full `buzz()` lightning physics remain shared ray work: reflection, collision, range RNG, shock resistance, flash blindness, inventory destruction, terrain, and monster interception are still outside this helper.
- `setmangry()`'s Elbereth scare/flee branch and peaceful-neighbor response messages are not implemented in this narrow direct-melee priest slice.
- The C room-edge fallback for non-lined-up shrine lightning origins remains deferred until room geometry and ray traversal are centralized.
- Ordinary non-priest peaceful survivor anger is covered by audit 754; sleeping wake messages, Elbereth hypocrisy, peaceful-neighbor response messages, and knockback interactions remain separate follow-ups.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "direct hero melee nonlethal peaceful temple priest wakes angry and triggers ghod_hitsu|direct hero melee nonlethal peaceful temple priest can trigger wakeup and wrapper ghod_hitsu|direct hero melee nonlethal peaceful temple priest requires shrine for ghod_hitsu|direct hero melee lethal temple priest can trigger ghod_hitsu tail|direct hero melee lethal temple priest respects ghod_hitsu wrapper roll|direct hero melee lethal temple priest requires shrine altar for ghod_hitsu tail" test/shop-billing-helpers.test.mjs` - 6 pass, 2698 skipped
- `git diff --check`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `node --test test/*.mjs` - 2866 pass
- `npm run score` - 44/44 passing
