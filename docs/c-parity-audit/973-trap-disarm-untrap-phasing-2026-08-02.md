# Audit 973 — seed9160-wiz-trap-disarm (2026-08-02)

## Scope

Wizard-mode trap probing on dlvl1 with the #untrap flow: `#levelchange 15`,
`#wizmap`, controlled `^T` teleports, a known-trap confirm step-on
("[yn]"), arrow-trap disarm attempts including the failed-untrap trap
re-fire, `#wizkill` cursor-cycle slaying, and the post-disarm
"You know of no traps there." path.  Session now passes completely:
RNG 3350/3350, screens 287/287, cursors 287/287.

## Verification method

`frozen/ps_test_runner.mjs` (official scorer) on the recorded session,
plus local step-diff tooling (sessions-extra/show-screen.mjs +
rng-diff.mjs, and per-step frame dumpers) against
`runSegment()` output.  No fixture content was used in runtime code.

## Divergences found and fixes

All C references below are to nethack-c/upstream (NetHack 5.0.0) and the
recorder patches in nethack-c/patches (nomux frame capture keys per
nhgetch boundary, rng logged per key).

### 1. Step-onto-seen-trap-with-objects phasing (the big one)

- C: spoteffects() calls pickup(1) BEFORE dotrap for non-pit traps
  (hack.c:3370-3395).  pickup(1) with `!autopickup` and multi/paralysis
  free falls into check_here(FALSE) (pickup.c:716-734) → look_here()
  (invent.c:4104), which
  - plines "There is an arrow trap here." when a seen trap is on the
    spot (invent.c:4170-4178), then
  - opens the "Things that are here:" menu window; tty interposes
    `--More--` because the topline is still occupied
    (win/tty/wintty.c:1922-1925, NHW_MENU branch).
- C consumes: `y` (confirm) → more dismiss → tip-window dismiss
  (getline.c:230 xwaitforspace: only space/ESC/CR/LF pass; other keys
  just bell, which is why keystrokes "#untrap" typed while the tip
  window was up vanished) → *then* dotrap fires the escape roll
  (trap.c:3035) and the turn's monster moves.
- JS surfaced the window immediately and ran the trap effect at its
  dismiss, one key early.
- Fix (js/cmd.js, movement arrival multi-object branch): when the
  stepped-on trap is seen, first `setMessage(<trap here>, more=true)`
  and queue the object-list overlay via `_queued_overlay_after_more`
  (existing mechanism); the trap itself stays deferred to the window
  dismissal as before.  Deferred context/turn timing preserved so the
  T-advance + escape roll land on the dismissal key exactly.

### 2. `#untrap` default branch for non-disarmable traps

untrap()'s ttmp switch (trap.c:5952-5978) ends in pits ("already on the
edge" / "Try filling the pit instead."/ help_monster_out) and a default
"You cannot disable that trap." with no time cost.  JS only handled the
disarmable set.  Fix adds the default branch (falling-rock trap target
in this session).

### 3. `#levelchange` trailing intrinsic at the final level

#levelchange loops pluslvl(FALSE) (wizcmds.c:478-481); pluslvl prints
"You feel more experienced.", rolls HP/Pw, prints "Welcome to experience
level N." (exper.c:315,349-357) and adjabil() prints the intrinsic
(exper.c:363, attrib.c wiz_abil 15 "sensitive").  update_topl
(win/tty/topl.c:251) can't fit the intrinsic next to the combined
welcome line, so C issues one more `--More--` and then shows the
intrinsic alone.  JS ended the loop at the welcome message with no
more and never printed the intrinsic, desyncing the following space key.
Fix: at the final target level, stash the intrinsic as the (already
existing) pending message so it displays on the next keystroke without
a further more.

### 4. Missile object identity from raw mksobj

mktrap_victim() (mklev.c:1829) `mksobj(ARROW)`'s pile arrived in JS with
no kind/plural, so floor listings rendered "9 349" (otyp as name).
Fix (js/mklev.js mksobj_init missile branch): assign cls/kind/plural/
appearance exactly as mongets() (mklev.js:6457-6478) does — ground-truth
behavior comes from C's objects.h identity table which mksobj always
has (mkobj.c).

### 5. `#wizkill` success-loop prompt combining

wiz_kill() re-plines "Next monster:" immediately after each kill
(wizcmds.c:257-258); update_topl combines when it fits: "You kill the
newt!  Next monster:"  JS used a forced more + separate prompt frame.
Fix combines when `len+3 < CO-8`, else keeps the old two-step path.

### 6. Controlled-teleport confirm topline retention

getpos '.' in wizard ^T lands via tele(); with !verbose nothing new is
printed (teleport.c:544-546 gates "You materialize ..."), so the tty
keeps the previous topline ("dark part of a room", "floor of a room").
JS's end-of-command clears pending messages unless marked kept; the
confirm path now sets `_keep_pending_message`.

## Test coverage added

test/trap-disarm-untrap.test.mjs (4 tests): mksobj missile identity,
#untrap onto falling-rock default branch (message + no turn), #untrap on
a hero-square arrow trap exercises try_disarm and consumes a turn, and
#levelchange-to-15 shows the trailing intrinsic after the welcome more.
Full `node --test` suite: 3647 passing.

## Verification results

- `node --input-type=module -e "await import('./js/jsmain.js')"` loads OK
- `node --test test/` — 3647/3647 pass (includes the 4 new tests)
- `bash frozen/score.sh` — 44/44 publics passing
- Extras: seed9160 PASSES (3350/3350, 287/287).  All previously-passing
  extras unchanged.  seed9012-castle-tune still FAILs (its pre-existing
  divergence at steps 71-74 — getpos cursor cell autodescribe of the
  castle moat/drawbridge — predates this work; its matched-count shifted
  13473→13366 from the wizkill combine phasing now matching elsewhere;
  no pass-status regression).

## Still unported / not exercised in this slice

- untrap pits with a monster present: C calls help_monster_out()
  (trap.c:5966-5974); JS emits the generic default instead.
- reward_untrap() gratitude/alignment rolls after freeing monsters
  (trap.c:5560-5585) — partially present via existing web/bear flows,
  not re-audited here.
- move_into_trap() door-diagonal reach nuance (bad_rock test_move
  duplicate in try_disarm, trap.c:5495-5505) exists only as the JS
  tight-diagonal block helper; ball/chain variants unverified.
- Trap-triggered later in this session family ([yn] step-ons onto
  arrow traps) were already ported and remain green.
