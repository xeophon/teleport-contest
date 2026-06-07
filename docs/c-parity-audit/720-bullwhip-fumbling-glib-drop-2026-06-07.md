# 720 - Bullwhip Fumbling/Glib Drop

## C Source

- `nethack-c/upstream/src/apply.c:2990-3003` computes fake bullwhip proficiency from role, Dexterity, and `Fumbling` before the branch sequence.
- `nethack-c/upstream/src/apply.c:3014-3019` handles horizontal water/lava wall splashes before the Fumbling/Glib drop gate.
- `nethack-c/upstream/src/apply.c:3020-3063` handles self/down use, steed mistakes, same-square splashes, and floor snaring before the drop gate.
- `nethack-c/upstream/src/apply.c:3065-3068` checks `(Fumbling || Glib) && !rn2(5)`, prints `The bullwhip slips out of your hand.`, and calls `dropx(obj)`.
- `nethack-c/upstream/src/apply.c:3070-3124` and `:3127-3261` show the pit and monster branches run only after that drop gate does not fire.
- `nethack-c/upstream/src/do.c:786-849` shows `dropx()` removes the object from inventory/wield state, applies ship/floor/shop side effects, places and stacks it on the hero square, and can emit side-effect output.

## Port Notes

- Wielded bullwhip use now checks the local C-style Fumbling/Glib predicate after horizontal terrain splashes and before pit, monster, and empty-target handling.
- A successful `rn2(5) == 0` drop emits `The bullwhip slips out of your hand.`, drops the bullwhip at the hero square through the existing carried-object drop helper, spends the turn, and returns without waking or attacking the target square's monster.
- Bullwhip fake proficiency and the visible-monster `gotit` gate now use the same local `heroIsFumbling()` helper as the drop gate, covering explicit fumbling state, fumble boots, and status suffixes.
- The new canaries use explicit core RNG queues for the `rn2(5)` hit and do not depend on replay maps, seed-derived branches, player names, hidden tests, or runtime shortcuts.

## Tests

- `fumbling wielded bullwhip can slip from hand before monster disarm`
- `glib wielded bullwhip can slip from hand before empty-target snap`
- `fumbling wielded bullwhip can slip from hand before pit escape`
- Existing audit 704, 716, 717, 718, and 719 bullwhip canaries were rerun with the focused bullwhip pattern.

## Remaining Follow-Ups

- Exact C `dropx()` side effects remain broader than this ordinary room-floor slice: ship sales, altar blessing knowledge, unpaid shop billing prompts, encumbrance messages, and object-specific floor effects should be audited separately if they become visible for bullwhip drops.
- Exact polyself body-part naming beyond ordinary `hand` remains deferred.
- Audit 721 covers the first ordinary pit branch after this drop gate: no-anchor snap and no-monster boulder slip/yank escape.
- Broader `use_whip()` follow-ups remain mimic reveal, invisible mapping, full pit escape with monster anchors, proficient `force_attack()`, floor snaring, dead-horse feedback, self/down steed mistakes, underwater/swallowed details, and exact wakeup visibility.
