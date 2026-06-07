# 728 - Fire Autoquiver Ready Direction

## C Source

- `nethack-c/upstream/src/dothrow.c:529-540` calls `autoquiver()`, assigns `obj = uquiver`, then prints `prinv("You ready:", obj, 0L)` with the quiver suffix suppressed.
- `nethack-c/upstream/src/dothrow.c:557-585` runs fireassist after the autoquiver ready message: a matching wielded launcher falls through to `throw_obj()`, alternate/carried launchers queue weapon lifecycle and retry, and the final return uses `throw_obj()` unless manual quiver fill already spent time.
- `nethack-c/upstream/src/dothrow.c:85-101` asks for direction inside `throw_obj()` after the ready message has been acknowledged; direction cancellation returns `ECMD_CANCEL` with no time spent.
- `nethack-c/upstream/src/cmd.c:3978-4022` enters `getdirInp` for the later direction prompt and records the actual direction key separately from the command key.
- `nethack-c/upstream/src/wield.c:658-662` is the related manual `doquiver_core("fire")` ready-message path, but remains a broader follow-up.

## Port Notes

- Autoquiver `You ready:` now stores pending fire identity in `_fire_pending_item_letter` and `_fire_pending_launcher_letter` instead of activating `fireDirection` immediately.
- The More continuation activates `_fire_item_letter` and `_fire_launcher_letter` only when it displays `In what direction?`.
- Already-wielded launcher autoquiver paths now go directly from the ready More prompt to the direction prompt without an extra launcher wield line or time.
- No-launcher autoquiver paths also wait until the ready More prompt is dismissed before exposing the direction prompt.
- This closes the autoquiver ready-message timing follow-up from audit 727. The inline JS mutation of queued fireassist equipment is still separate from C's actual `doswapweapon`/`dowield` command queue model.

## Tests

- `f command autoquiver beats alternate polearm fallback`
- `f command autoquiver still beats wielded bullwhip fallback`
- `f command autoquiver prefers current launcher ammo over earlier missile`
- `f command autoquiver prefers missile over alternate launcher ammo`

## Remaining Follow-Ups

- Model fireassist launcher lifecycle as true queued `doswapweapon`/`dowield`/`dofire` command objects instead of inline equipment mutation.
- Broaden manual `doquiver_core("fire")` parity: prompt filtering, count handling, no-inventory feedback, and abort/time return distinctions.
- Align fire-direction cancellation and invalid-direction help with `getdir()` once the larger direction input surface is audited.
