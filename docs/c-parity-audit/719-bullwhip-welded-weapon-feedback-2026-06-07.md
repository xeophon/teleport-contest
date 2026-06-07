# 719 - Bullwhip Welded Weapon Feedback

## C Source

- `nethack-c/upstream/src/apply.c:3153-3167` computes `gotit = proficient && (!Fumbling || !rn2(10))`, prints the wrap message, then checks `mwelded(otmp)` only after `gotit` succeeds.
- `nethack-c/upstream/src/apply.c:3167-3173` prints `It is` or `They are` welded to `mhis(mtmp)` plus the target hand/body part, uses `!` only when `otmp->bknown` was previously false, calls `set_bknown(otmp, 1)`, and clears `gotit`.
- `nethack-c/upstream/src/apply.c:3174-3180` extracts and unwields only when `gotit` remains true, so welded weapons skip the `rn2(proficient + 1)` destination roll.
- `nethack-c/upstream/src/apply.c:3242-3261` prints `The bullwhip slips free.` after the welded branch and still wakes/angers the target.
- `nethack-c/upstream/src/wield.c:61-70` and `nethack-c/upstream/src/wield.c:1076-1083` define `mwelded(obj)` as a wielded monster weapon whose type/material can weld and is cursed.
- `nethack-c/upstream/include/you.h:321-324`, `nethack-c/upstream/src/mondata.c:1191-1207`, `nethack-c/upstream/include/obj.h:257-259`, and `nethack-c/upstream/src/polyself.c:1971-1979` provide the pronoun and bimanual body-part pluralization used in the message.

## Port Notes

- The visible armed-monster bullwhip path now checks for a welded monster weapon after a successful `gotit` wrap and before the destination roll.
- Welded handling emits the C-shaped three-message sequence, sets `weapon.bknown = true` after choosing punctuation from the old value, and appends `The bullwhip slips free.`
- The monster's weapon stays in `mon.minvent`, stays referenced by `mon.mw`, keeps its existing carrier/wielded flags, and does not set `weapon_check = NEED_WEAPON`.
- The welded branch does not consume the non-welded `rn2(proficient + 1)` pull-result RNG.
- The local welded predicate accepts explicit `weapon.welded` and cursed current monster weapons via `weapon.wielded` or `mon.mw === weapon`, matching the JS model's `MON_WEP()` equivalent while avoiding replay-map or seed hardcoding.

## Tests

- `wielded bullwhip treats cursed mon mw as welded and learns curse`
- `wielded bullwhip reports known two-handed welded monster weapon with period`
- Existing audit 704, 716, 717, and 718 bullwhip canaries were rerun with the focused bullwhip pattern.

## Remaining Follow-Ups

- Exact `mhis()` parity for every monster data case, hallucination pronoun RNG, and `their` remains broader than this visible ordinary-monster slice.
- Exact `mbodypart()` naming beyond ordinary hands and bimanual `hands` is still deferred.
- Full `will_weld()` material/type subtleties are represented by the current JS welded/cursed weapon model, not the complete C object-class matrix.
- Non-welded disarm side effects still need exact shop billing/no-charge, timers/light-source shutdown, artifact/object immunities, and petrifying corpse snatch handling.
- Broader `use_whip()` follow-ups remain mimic reveal, invisible mapping, full pit escape with monster anchors, proficient `force_attack()`, floor snaring, dead-horse feedback, and exact wakeup visibility. Audit 720 covers Fumbling/Glib drops before this welded branch, and audit 721 covers ordinary no-monster pit anchors.
