# C-parity audit 977 — seed9127-wiz-muse-items completion: the u.uhp == -1 status-paint gate (2026-08-02, wave-5 final)

Scope: finish sessions-extra/seed9127-wiz-muse-items.session.json (monster
item use + salamander attack anatomy; wizard "Die? n" revival cycles).

Base at takeover (post integrator merge): RNG 2862/2862, Screens 139/143,
cursors 143/143 — the only remaining diffs: 4 screens (steps 132-135, the
4th revival cycle) where C's tty shows the *pre-blow* HP:12(12) on the
"The salamander hits!--More--" / "You die...--More--" frames while every
earlier death cycle shows HP:0(12).

Final: **PASS — RNG 2862/2862, Screens 143/143, cursors 143/143.**

## Final diagnosis

Instrumenting the (bit-exact) JS battle showed all five salamander deaths
route through the same code path with structurally identical tty wait
sequences; they differ only in where u.uhp lands after the fatal blow
(hpBefore / damage / hpAfter):

| death (turn) | hpBefore / damage | u.uhp after | C status row during die--More-- frames |
|---|---|---|---|
| T:6 | 4 / 4 | 0 | HP:0 |
| T:7 | 7 / 22 | -15 | HP:0 |
| T:8 (a) | 2 / 13 | -11 | HP:0 |
| T:8 (b) | 3 / 6 | -3 | HP:0 |
| T:9 (cycle 4) | 12 / 13 | **-1** | **HP:12 (pre-blow, stale)** |

C mechanism, fully sourced:

1. mdamageu sets `disp.botl = TRUE`, subtracts, and since u.uhp < 1 calls
   done_in_by (mhitu.c:1909/1919/1925).  u.uhp keeps its raw post-blow
   value (-1 here: 8d(2,8)+4(dmgval spear rnd(6), weapon.c:246)
   +1 for the wielded spear's enchantment, `tmp += otmp->spe;`
   weapon.c:298).
2. done_in_by prints You("die...") (end.c:185/195) → vpline calls
   flush_screen(cursor=1) *before* putmesg (pline.c:274) →
   `if (disp.botl || disp.botlx) bot();` (display.c:2236) → bot().
3. bot() (botl.c:253) begins with the dosave() sentinel gate
   `if (u.uhp != -1 && gy.youmonst.data && ...)` (botl.c:257-261): with
   u.uhp == -1 it **skips the status paint entirely** — but the
   `disp.botl = disp.botlx = disp.time_botl = FALSE;` at botl.c:266 still
   executes.  So this single flush consumes the dirty flag without painting.
   Negative hp other than -1 paints fine (botl clamps display to 0,
   botl.c:1037-1042), which is why all other cycles show HP:0 immediately.
4. done() forces `disp.botlx = TRUE; bot();` at end.c:1044-1047 — again a
   no-op paint while u.uhp == -1, flags cleared.  Only then does done()
   clamp `u.uhp = u.mh = 0; disp.botl = TRUE;` (end.c:1068-1077).  The next
   status flush — on the path to the wizard "Die?" prompt — therefore paints
   HP:0, exactly matching the recorded "Die? [yn] (n)" frame.

Net effect: **a blow landing hp at exactly -1 freezes the status row at its
pre-blow value through the --More-- frames**; any other lethal residue
displays 0 immediately.

## What changed (js/allmain.js only, +16 lines)

- salamander-chain fatal slot aftermath (js/allmain.js ~line 5650, the
  phase-91 chain handler): when `hpBefore - chain.damage === -1`, set
  `game._death_status_hp_before_zero = hpBefore` before clamping
  `game.u.uhp = 0`.  The existing renderStatus() hold logic
  (js/game_display.js:156-162, added in an earlier wave for the same -1
  phenomenon in two other blow paths) then keeps the pre-blow HP on the
  status row across the hits-More/die-More frames; the existing
  deathDieMore dismissal clears the hold ahead of the "Die?" prompt
  (js/cmd.js:66469-66474), yielding HP:0 there, matching C.
- No RNG, message, cursor or structural engine changes.

## Verification

- `node --input-type=module -e "await import('./js/jsmain.js')"` — loads OK.
- target: 1/1 PASS (RNG 2862/2862, Screens 143/143, cursors 143/143).
- `bash frozen/score.sh` — **49/49 passing** (all publics green).
- sessions-extra sweep: all 11 previously passing extras still pass
  (9001, 9002, 9003, 9004-arrive, 9004-fountain, 9005-arrive,
  9005-sokoban, 9006-arrive, 9007-arrive, 9009, 9011); 9127 now passes.
  The still-failing extras (9006-shops, 9007-sacrifice, 9008-polyself,
  9012-arrive, 9012-tune, 9105, 9150, 9161, 9162, 9163) are pre-existing
  failures owned by other slices — unchanged by this edit (the hold only
  arms inside the salamander chain's own fatal branch).

## Related prior art

Earlier waves already encoded the same -1 hold rule in two other fatal-blow
paths (js/allmain.js:6611/6916, deferred-damage `holdStatusHp`) without the
full C explanation; this audit supplies the mechanism (botl.c:259) and
closes the last gap for 9127.  Doc 964 holds the wave-5 midpoint record.

## Unported in this subsystem (unchanged from 964)

- Deep muse.c branches not exercised: MUSE_SCR_EARTH boulder loop, camera
  flash, defensive/misc item fallback cascade, monster teleport-item reads.
- tty two-message line-concatenation of more than two plines (combined hits*
  frames here go through the two-at-a-time path).
- Non-wizard real-death flow past "Do you want your possessions identified?"
  disclosure chain.
