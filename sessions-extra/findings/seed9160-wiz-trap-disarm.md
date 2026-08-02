# seed9160-wiz-trap-disarm — findings

## What the session covers

Wizard-mode trap probing + the #untrap flow on dlvl1:

1. `#levelchange 15` (new HP base so arrow traps can't kill), `#wizmap`.
2. `^T` controlled teleport (tip-window dismiss) to beside a falling rock trap;
   `#untrap h` → "You cannot disable that trap." (non-disarmable trap branch).
3. Step onto an anti-magic field (known-trap [yn] prompt) → Pw drain: d(2,6)
   + rnd(half) + drain_en rolls.
4. `^T` beside an arrow trap; `#wizkill` cursor-cycle slay of a wandering newt.
5. Three deliberate step-ons of the arrow trap ([yn] y): incl. the
   dotrap escape path (rn2(5) @ trap.c:3038 → "You escape an arrow trap.")
   and a "Things that are here:" multi-object listing (--More--).
6. 16 `#untrap .` attempts standing on the trap: repeated untrap_prob
   (rn2(3)) failures → rnl(5) "Whoops..." → dotrap FAILEDUNTRAP re-trigger
   (escape roll, arrow to-hit/hit/miss, damage), one "difficult to disarm"
   (rnl(5)==0) variant, success at attempt 8 ("You disarm the trap." +
   50−rnl(50) arrow pile), then post-trap "You know of no traps there.".

Recorded with seed 9160. 287 steps, ends T:20, HP:82(87); recorder exits cleanly.

## Final JS score

→ **PASS — RNG 3350/3350, Screen 287/287 (cursors 287/287)** (worktree
slice/fix9160).

## Final diagnosis (wave 5 continuation)

The guessed gap above was wrong in an interesting way: the failed-untrap
machinery (rnl(5) Whoops gate + dotrap FAILEDUNTRAP re-fire) was already
ported; the whole divergence was tty message/window **phase** alignment in
sessions where a seen trap and ≥2 objects share the hero's square.

1.  **Step-on phasing.** In C, \`spoteffects()\` runs pickup before dotrap for
    non-pit traps (hack.c:3370-3395: \`(void) pickup(1)\` then dotrap), and
    \`pickup(1)\` with pickup off lands in \`check_here(FALSE)\` →
    \`look_here()\` which first plines \`There is an arrow trap here.\`
    (invent.c:4170-4178) and then displays the \`Things that are here:\`
    menu window.  tty's display of that menu window with an unread topline
    forces \`--More--\` first (win/tty/wintty.c:1922-1925), so the recorded
    keystroke consumption is THREE keys after the \`y\`: more-dismiss, tip
    window obstructs input until space/esc/CR/LF (getline.c:230
    \`xwaitforspace\` rings the bell for other keys — that's why the first
    \`#untrap\n\` at steps 127-133 never reached the game and the \`.\` at
    step 135 was a plain rest), and only then dotrap's escape roll
    (trap.c:3035) fires at the dismissal key.  JS showed the object list
    immediately and ran dotrap at its dismissal, one key early.
    Fixed by queueing the object-list window behind the trap pline's
    \`--More--\` (\`_queued_overlay_after_more\`).

2.  **\`#untrap\` non-disarmable branch.** The JS direction handler only
    knew bear/web/landmine/squeaky/dart/arrow/box/door; a falling-rock
    trap at the targeted square fell through to \`You know of no traps
    there.\`  Added untrap()'s switch default (trap.c:5962-5978):
    pit-under-hero ("already on the edge of the pit"), pit without a
    trapped monster ("Try filling the pit instead."), otherwise "You cannot
    disable this/that trap." — no time consumed.

3.  **\`#levelchange\` final-level intrinsic message.** A wizard landing
    exactly on level 15 gets adjabil's "You feel sensitive!" printed
    *after* the level-15 welcome (exper.c:357,363 pluslvl), which via
    update_topl (topl.c:251) becomes welcome+--More--, then the intrinsic
    alone.  JS deferred the intrinsic to a never-executed next level, so
    the final welcome lacked its --More-- and the following space became an
    "Unknown command".

4.  **Floor missile identity.** \`mktrap_victim\` (mklev.c:1813-1830) creates
    \`mksobj(ARROW)\` piles; JS mksobj_init never tagged missiles with
    kind/plural, so the "Things that are here" window rendered \`9 349\`
    (otyp fallback) instead of \`9 arrows\`.  mksobj now assigns C's
    objects-table names for arrow/dart/crossbow bolt/elven/orcish arrow,
    matching mongets().

5.  **\`#wizkill\` loop prompt combining.** After each kill wiz_kill()
    immediately re-plines its prompt (\`Next monster:\`, wizcmds.c:257-258),
    which combines with the kill line ("You kill the newt!  Next
    monster:", no --More--) when it fits (topl.c:251).  JS interposed a
    --More-- and a separate prompt step.

6.  **Controlled-teleport confirm.** getpos '.' lands with no message when
    \`!verbose\` (teleport.c:544-546 gates "You materialize ..."), so the
    tty topline retains the last autodescribe text ("dark part of a room"
    / "floor of a room"); JS blanks the topline at command end unless told
    to keep it.

With those, the original "divergence" simply evaporated: the earlier
\`#untrap\` swallows, the rest \`.\`, and the 15 real disarm attempts align
key-for-key, and the whole session is bit-exact (3350/3350, 287/287).
