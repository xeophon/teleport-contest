# 725 - Bullwhip Force Attack

## C Source

- `nethack-c/upstream/src/apply.c:3245-3258` handles no-weapon bullwhip targets. Concealed mimics reveal through `stumble_onto_mimic(mtmp)` and suppress the ordinary `Snap!`.
- `nethack-c/upstream/src/apply.c:3255-3256` calls `force_attack(mtmp, FALSE)` for proficient bullwhip users and returns immediately when that attack consumes the turn.
- `nethack-c/upstream/src/apply.c:3260-3261` only runs the outer `wakeup(mtmp, TRUE)` when the force-attack path did not return.
- `nethack-c/upstream/src/uhitm.c:431-443` implements `force_attack()` by temporarily enabling force-fight, calling normal `do_attack()`, then restoring the prior force-fight state.
- `nethack-c/upstream/include/objects.h:390-392` gives bullwhips `1d2` small-target and `1d1` large-target melee damage.

## Port Notes

- Proficient no-weapon bullwhip targets now delegate to the existing JS melee path via a one-shot `_hero_melee_prefix_messages` prefix and `_force_fight_target`.
- The delegated path preserves the bullwhip prefix message and suppresses the later `Snap!` when melee consumes the turn.
- Hidden monsters revealed by bullwhip still skip same-turn disarm, but now enter the proficient force-attack path afterward.
- Disguised mimics still reveal first; proficient bullwhip users then force-attack the revealed mimic without a flick or `Snap!` message.
- Direct melee damage now includes the C bullwhip dice instead of falling through to the generic weapon `1d6` fallback.

## Tests

- `proficient wielded bullwhip force-attacks visible unarmed monster without snap`
- `wielded bullwhip reveals hidden armed monster without disarming it`
- `proficient wielded bullwhip force-attacks disguised mimic after reveal`
- Existing unproficient visible-monster and unproficient mimic bullwhip tests were rerun to keep `Snap!` behavior covered.

## Remaining Follow-Ups

- Tame/safe-pet `force_attack(mtmp, FALSE)` details remain broader than this slice, including stop/displace/flee behavior.
- Full `do_attack()` parity remains broader than the current JS melee path: confirmation overrides, leprechaun evasion, exact peaceful/priest/shop/guard consequences, polymorphed attacks, two-weapon details, and passive side effects still need combat-core work.
- Full `stumble_onto_mimic()` parity remains incomplete: sticky mimic grabs, alternate reveal text, light recalculation, and invisible revealed-mimic mapping are still future work.
