# 705 - Fire Command Alternate-Polearm Fallback

## C Source

- `nethack-c/upstream/src/dothrow.c:510-525` handles empty-quiver `#fire` with `autoquiver` off: primary polearm, primary bullwhip, then fireassist alternate polearm before the no-ammo/manual fire path.
- `nethack-c/upstream/src/dothrow.c:518-520` accepts an alternate polearm unless it is both cursed and BUC-known, so unknown-cursed alternate polearms still qualify.
- `nethack-c/upstream/src/dothrow.c:523-525` queues `doswapweapon` followed by `dofire` and returns `ECMD_OK` without initial time or `You have no ammunition readied.` feedback.
- `nethack-c/upstream/src/wield.c:461-500` implements `doswapweapon()`: old secondary becomes primary, old primary becomes secondary, and both inventory lines are printed on success.
- `nethack-c/upstream/src/apply.c:3426-3480` shows the queued retry enters `use_pole(uwep, TRUE)`, which autoselects a target and prints `Don't know what to hit.` for the no-target self-square fallback.

## Port Notes

- Empty-quiver `f` with `autoquiver` off now checks a fireassist-enabled alternate polearm after the primary polearm and bullwhip branches.
- Known-cursed alternate polearms are skipped and fall through to the existing manual fire prompt; unknown-cursed alternate polearms still take the branch.
- The alternate polearm is swapped into the primary weapon slot, the old primary becomes the alternate weapon, and the existing autohit polearm fallback is retried after the swap messages.
- Quivered ammo and successful autoquiver continue to beat the alternate-polearm fallback.

## Tests

- `f command empty quiver swaps alternate polearm and retries before ammo prompt`
- `f command empty quiver swapped alternate polearm no-target retry does not prompt`
- `f command nofireassist alternate polearm does not swap before fire prompt`
- `f command unknown cursed alternate polearm still swaps before ammo prompt`
- `f command known cursed alternate polearm does not swap before fire prompt`
- `f command autoquiver beats alternate polearm fallback`
- `f command quivered ammo beats alternate polearm fallback`
- Existing fallback canaries rerun:
  - `f command empty quiver with wielded polearm autohits before ammo prompt`
  - `f command empty quiver with wielded bullwhip applies it before ammo prompt`

## Remaining Follow-Ups

- The JS command queue is still modeled with local message-continuation state here; full C FIFO command-queue parity for fireassist swap/wield/retry remains broader work.
- Audit 706 covers the reachable wielded-polearm priority with quivered/readied ammo.
- Full applied-polearm `use_pole()` parity remains broader than this fallback slice.
