# Audit 942 - Sokoban Post-Quaff Turn Charge, eatfood Occupation Re-arm: seed9005-wizard-sokoban to Full PASS

Date: 2026-07-24. Scope: the two residual divergences audit 936 left open in
`seed9005-wizard-sokoban` (the step-95 post-quaff `mcalcmove` desync and the
step-13 bright-blue boulder cell), plus the end-of-replay stall that remained
after them. The session is now a full PASS.

Sessions exercised:
- `sessions-extra/seed9005-wizard-sokoban.session.json`
- `sessions-extra/seed9005-arrive-sokoban.session.json`

## (a) step-95 post-quaff desync: fruit-juice --More-- and the uncharged turn

Recording: step 94 `q` ("What do you want to drink? [fgh or ?*]"), step 95
`f`. In C the quaff rolls **nothing**: `peffect`'s fruit-juice branch
(`potion.c:843-862`) prints "This tastes like slime mold juice." and returns;
because the potion type is already name-known, `dopotion`
(`potion.c:617-641`) runs no `trycall` getlin (that prompt only fires for
`dknown && !oc_name_known`, `potion.c:631-637`), so there is no forced
--More-- and `dopotion` returns `ECMD_TIME` - the turn is charged at once and
the end-of-turn block follows immediately: 38x `rn2(12) @
mcalcmove(mon.c:1164)` (the `m_moving` speed-rounding roll,
`mon.c:1153-1167`, one per living monster). The next recorded key (space,
step 96) is read as a fresh command: "Unknown command ' '.".

The old JS fruit-juice branch forced `setMessage(..., true)` (a --More-- even
with no trycall pending) and never set `game.context.move = 1`. With the
quaff turn uncharged, the `#wizwish` flow typed at steps 97-106 ran **before**
the deferred end-of-turn monster phase, so the wish's rolls landed ahead of
the `mcalcmove` block: `rn2(381)` (wish namedesc bound,
`wishedBaseObjectFromName`), `rnd(2)` (`next_ident`), `rn2(6)` (`mksobj_init`
food quantity), `rn2(100)` (`godsNoticeWish` ublesscnt). That is exactly the
assigned signature: first mismatch @rng[8199] step 95, C `rn2(12)=5` vs JS
`rn2(381)=311`.

Fix (already in 199a768, `js/cmd.js:65995-65999`): the flavor message gets a
--More-- only when `game._command_mode === 'callPotionAfterMore'` (the
trycall getlin forces it, win/tty/getline.c:53), and the branch now sets
`game.context.move = 1` when no trycall is pending. Verified by single-hunk
revert in a HEAD worktree: restoring the old two lines reproduces the
rn2(381)+rnd(2)+rn2(6)+rn2(100) desync at step 95; the HEAD form matches C.

## (b) step-13 (35,17) bright-blue boulder cell: already resolved

936(b) ported `premap_detect` (`detect.c:2134-2147`): sokoban variants are
"premapped", so every boulder is `map_object()`ed at level load and stays
drawn; the four `make_sokobanN_level` boulder loops mark `boulder.seen =
true` (`js/mklev.js:18250`, `18505`, `18596`, `18679`). 936's "Remaining
issues" still listed the step-13 cell as unexplained, but at HEAD
`tools/compare-one-session.mjs ... 13` reports `diff null` - the premapped
fix closed it; the bullet was stale, no further change needed.

## (c) end-of-replay stall at step 120: eatfood occupation re-arm

Residual at clean HEAD (199a768), verified in a `git worktree`: RNG stops at
8279/8470, screens 120/122, cursors 121/122 - the JS simply emits no further
rolls after step ~120 (`rng-diff` totals C=8470 JS=8279; the unmatched C
tail is all `rn2(12) @ mcalcmove`). The wizard starts eating near the end of
the recording. C's moveloop charges a full turn automatically on every
iteration while an occupation is armed - `svc.context.move = 1` immediately
before `(*go.occupation)()` (`allmain.c:484-510`) - so `eatfood` needs no
fresh input to keep time passing. The JS moveloop auto-charged the
force-lock, pick-lock, and pick-dig occupations (`_pending_time_passed`
arming in `moveloop_core`) but not eating, so the replay stalled waiting for
input the recording does not contain.

Fix: one hunk in `moveloop_core` (`js/allmain.js`, next to the existing
occupation re-arms):

    if (g._eating_turns_remaining > 0 && !g._message_more)
        g._pending_time_passed = Math.max(g._pending_time_passed || 0, 1);

Verified in isolation at the worktree: HEAD + only this hunk takes the
session from 8279/8470 + 120/122 to full PASS (8470/8470, 122/122).
Note: at time of writing this hunk is **uncommitted in-flight work** in the
shared tree (the concurrent travel/eatfood agent's `js/allmain.js` edits,
which also gate `exerchk` on travel and keep non-interrupting travel
messages, `attrib.c:598-603`). The session's PASS depends on it; if that
work is reverted rather than landed, the step-120 stall returns.

## Verification

- `node frozen/ps_test_runner.mjs sessions-extra/seed9005-wizard-sokoban.session.json`:
  **PASS** (RNG 8470/8470, Screen 122/122, cursors 122/122).
- `node sessions-extra/rng-diff.mjs sessions-extra/seed9005-wizard-sokoban.session.json`:
  **no positional mismatch in first 8470 calls (C=8470 JS=8470)**.
- `node tools/compare-one-session.mjs ... 13` and `... 95`: both `diff null`.
- `node frozen/ps_test_runner.mjs sessions-extra/seed9005-arrive-sokoban.session.json`:
  **PASS** (RNG 5558/5558, Screen 19/19) - no residual from the arrive side.
- Public `bash frozen/score.sh`: **44/44**.

## Remaining issues / follow-ups

- None for these two sessions. `seed9005-wizard-sokoban` joins
  `seed9005-arrive-sokoban` as a full pass; both are good regression
  candidates for `sessions/` once the in-flight eatfood hunk lands.
- Watch the uncommitted `js/allmain.js` travel/eatfood work: it is load-bearing
  for this session's PASS (see (c)).
