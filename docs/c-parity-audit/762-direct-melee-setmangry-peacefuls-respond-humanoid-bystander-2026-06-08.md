# 762 - Direct melee setmangry peacefuls respond humanoid bystander

## Implemented Slice

Ordinary direct hero melee survivor hits now run a bounded C `peacefuls_respond()` subset after `setmangry(mon, TRUE)` angers a peaceful non-tame target.

This extends the direct-melee survivor wakeup and `setmangry()` work from audits 754-761. After the primary target's hit text and anger text, nearby peaceful ordinary humanoid bystanders can notice the attack, clear their wait strategy, become hostile, and apply the extra peaceful-bystander alignment penalty.

Covered behavior:

- response runs only after a peaceful non-tame target is angered by ordinary direct melee;
- the primary target's hit and anger feedback stay before bystander feedback;
- bystanders must be alive, still peaceful, not the primary target, not mindless, not sleeping, able to see, visible in hero line of sight, and able to see the hero;
- ordinary humanoid bystanders become hostile and angry, clear `STRAT_WAITMASK`, and apply another `adjalign(-1)`;
- sleeping and blind bystanders do not respond;
- town watch remains outside this ordinary-humanoid response subset and is covered by audit 764, while shopkeeper, priest, and current quest-leader shrug/gasp exceptions are covered by audit 763;
- the fixture uses a deaf hero and high-level bystander to avoid optional `maybe_gasp()` and `monflee()` wording while preserving the code path's C-shaped rolls.

This remains local to ordinary direct melee survivor hits. It does not extend bullwhip apply force-attacks, wielded potion bash, wielded egg bash, projectile hits, two-weapon deferred queues, swallowed/jousting/artifact melee, monster-moving `setmangry()` calls, or the full nonhumanoid same-species response branch.

C anchors:

- Survivor damage and hit feedback precede `wakeup(mon, TRUE)`: `nethack-c/upstream/src/uhitm.c:1845`, `nethack-c/upstream/src/uhitm.c:1870`, `nethack-c/upstream/src/uhitm.c:1923`, `nethack-c/upstream/src/uhitm.c:1926`.
- `setmangry(TRUE)` clears the attacked target's wait mask, returns for already-hostile or tame targets, then angers peaceful non-tame targets and applies `adjalign(-1)` for non-priests: `nethack-c/upstream/src/mon.c:4287`, `nethack-c/upstream/src/mon.c:4289`, `nethack-c/upstream/src/mon.c:4294`, `nethack-c/upstream/src/mon.c:4296`, `nethack-c/upstream/src/mon.c:4303`.
- The attacked target's visible humanoid anger message precedes `peacefuls_respond()` when the hero is not in a monster-moving context: `nethack-c/upstream/src/mon.c:4304`, `nethack-c/upstream/src/mon.c:4306`, `nethack-c/upstream/src/mon.c:4315`, `nethack-c/upstream/src/mon.c:4316`, `nethack-c/upstream/src/mon.c:4317`.
- `peacefuls_respond()` skips dead monsters and the primary target, then requires a non-mindless peaceful observer that the hero could see, is not sleeping, can see, and can see the hero: `nethack-c/upstream/src/mon.c:4163`, `nethack-c/upstream/src/mon.c:4168`, `nethack-c/upstream/src/mon.c:4169`, `nethack-c/upstream/src/mon.c:4171`, `nethack-c/upstream/src/mon.c:4174`, `nethack-c/upstream/src/mon.c:4175`, `nethack-c/upstream/src/mon.c:4176`.
- The humanoid branch handles watch, optional gasp, shopkeeper/priest/quest-leader exceptions, flee, then ordinary non-tame anger, wait-mask cleanup, `adjalign(-1)`, and the visible anger message: `nethack-c/upstream/src/mon.c:4181`, `nethack-c/upstream/src/mon.c:4182`, `nethack-c/upstream/src/mon.c:4187`, `nethack-c/upstream/src/mon.c:4205`, `nethack-c/upstream/src/mon.c:4213`, `nethack-c/upstream/src/mon.c:4217`, `nethack-c/upstream/src/mon.c:4231`, `nethack-c/upstream/src/mon.c:4232`, `nethack-c/upstream/src/mon.c:4233`, `nethack-c/upstream/src/mon.c:4234`, `nethack-c/upstream/src/mon.c:4236`.
- `maybe_gasp()` is limited to humanoid speech sounds and uses the `"Gasp!"`, `"Uh-oh."`, `"Oh my!"`, `"What?"`, and `"Why?"` table: `nethack-c/upstream/src/sounds.c:544`, `nethack-c/upstream/src/sounds.c:548`, `nethack-c/upstream/src/sounds.c:568`, `nethack-c/upstream/src/sounds.c:580`.

## Tests Added

Focused direct-melee coverage in `test/shop-billing-helpers.test.mjs` now asserts:

- a visible peaceful gnome bystander responds after the primary goblin target is angered, becomes hostile, clears wait strategy, and applies a second alignment penalty;
- a sleeping peaceful humanoid bystander does not respond;
- a blind peaceful humanoid bystander does not respond;
- an existing sleeping-growl/wake-nearby canary now asserts that a peaceful Oracle woken before target anger responds afterward as a visible humanoid bystander.

The focused command keeps adjacent direct-melee target anger and Elbereth blind-fade canaries from audits 754 and 761.

## Deferred Gaps

- Full `peacefuls_respond()` remains broader: current quest-leader anger for role-guardian targets, tame bystander handling beyond preserving peacefulness, nonhumanoid same-species growl/flee behavior, and ordinary/tame optional gasp/flee wording all need separate coverage. Shopkeeper/priest/non-guardian current quest-leader shrug behavior is covered by audit 763, and town-watch bystander arrest is covered by audit 764.
- The local `m_canseeu()` approximation covers invisibility and line of sight but does not yet model every telepathy, monster sense, underwater, or special perception condition.
- Exact `monflee()` timers, existing-fleeing wording, and all `flags.verbose` branches remain outside this high-level deaf fixture.
- Monster-moving `setmangry()` callers and special direct-attack helpers remain separate from this ordinary hero-melee hook.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "direct hero melee (surviving peaceful non-priest wakes angry|peaceful humanoid bystander responds|sleeping peaceful humanoid bystander|blind peaceful humanoid bystander|quest leader bystander|sleeping growl wakes nearby sleepers before anger|surviving peaceful target on Elbereth|blind hostile target on Elbereth)" test/shop-billing-helpers.test.mjs` - 8 pass, 2720 skipped
- `git diff --check`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - full file pass
- `node --test --test-reporter=dot test/*.mjs` - full suite pass
- `npm run score` - 44/44 passing
