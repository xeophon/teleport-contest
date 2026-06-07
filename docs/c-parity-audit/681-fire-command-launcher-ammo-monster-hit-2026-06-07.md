# 681 - Fire Command Launcher Ammo Monster Hit

## C Source

- `nethack-c/upstream/src/dothrow.c:467-582` routes `f` through `dofire()`, fireassist selection, and then the same `throw_obj()` path used by direct throws.
- `nethack-c/upstream/src/dothrow.c:1477` passes thrown projectile monster contact to `thitmonst()`.
- `nethack-c/upstream/src/dothrow.c:2011-2228` computes thrown-object hit chance, applies matching-launcher ammo to-hit bonuses, wakes missed targets through `tmiss()`, runs `hmon()` on hits, exercises Dexterity, and applies hit-only missile mulch before passive object effects.
- `nethack-c/upstream/src/uhitm.c:1048-1061` treats thrown ammo/missiles as projectile damage and marks matching-launcher shots for weapon-skill training.
- `nethack-c/upstream/src/uhitm.c:1451-1464` gives fired ammo increase-damage bonuses but suppresses strength damage when ammo has a matching launcher.
- `nethack-c/upstream/src/uhitm.c:1484-1491` uses the launcher, not the ammo, for shot ammo weapon-skill damage.
- `nethack-c/upstream/src/weapon.c:1545-1571` defines C weapon skill to-hit bonuses for launcher enchantment skill adjustment.

## Port Notes

- `fireDirection` now scans for the first monster along the fired projectile path instead of always landing on the final floor square.
- Single fired bow/crossbow ammo now has a narrow `thitmonst()`-style impact path with:
  - C d20 hit roll before damage or floor landing rolls.
  - Matching launcher enchantment, erosion, explicit hit bonus, and weapon skill to-hit adjustment.
  - Ammo damage dice for arrows, elven/orcish/silver arrows, ya, and crossbow bolts, including the crossbow-bolt row `+1` damage.
  - Increase-damage and launcher weapon-skill damage, while suppressing strength damage for fired ammo.
  - Dexterity exercise and hit-only missile mulch on successful hits.
  - Miss wakeup and ordinary floor landing without hit-only mulch damage rolls.
- Surviving fired ammo monster hits pass `ohit` and `passiveTarget` into the existing projectile landing helper, and surviving missiles still run the ordinary hard-landing resistance roll before floor placement.
- Launcher multishot floor landings now interleave per-shot split ids and hard-landing resistance rolls in C order (`next_ident()` before that shot's `rn2(100)`), while the broader per-shot combat loop remains a follow-up.
- C's quiet single-shot `f` behavior is now covered for ordinary single shots: the JS command no longer prints its local `You shoot an arrow.` line unless the local multishot branch fires or a by-hand warning is required.

## Tests

- `f command arrow with matching bow uses C ammo range increment`
- `levitating f command arrow with matching bow uses C air split recoil`
- `f command arrow with matching bow hits monster through C projectile path`
- `f command arrow with matching bow miss wakes monster and lands without hit-only mulch`
- `f command arrow hit suppresses strength damage but keeps damage increase and bow skill`
- `f command slung flint multishot interleaves split ids and break tests`

## Remaining Follow-Ups

- Audits 701, 702, and 703 cover empty-quiver autoquiver ranking, the first wielded-polearm fallback slice, and the throw-and-return shortcut.
- Full `dofire()` fireassist parity still needs bullwhip fallback, alternate-polearm swap, reachable-polearm assist with quivered ammo, the exact queued swap/wield/retry command lifecycle, and broader explicit count handling.
- Full fired-projectile combat parity still needs C multishot calculation and per-shot looping, intervening monster handling beyond the first ordinary target, object mimic reveal, lethal cleanup/vampire-shifter revival, poisoned/silver/blessed launcher ammo variants, and broader passive-object fallout.
- The current fired combat helper is intentionally limited to single hero-fired launcher ammo; by-hand unmatched ammo monster hits and slung gem/rock variants still need separate source-backed slices.
