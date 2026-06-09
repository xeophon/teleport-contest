# Recoil Monster Collision Petrification

## Source

- `nethack-c/upstream/src/dothrow.c:842` through `:882`: `hurtle_step()` handles monster collision after finding `m_at(x, y)`. After the bump/find message, `wakeup(mon, FALSE)`, invisible marker mapping, and `setmangry(mon, FALSE)`, C runs two bodily petrification checks before the final `wake_nearto(x, y, 10)`.
- `nethack-c/upstream/src/dothrow.c:870` through `:875`: bumping a touch-petrifying monster calls `instapetrify("bumping into a <monster>")` when the hero is not wearing an undershirt, body armor, or cloak.
- `nethack-c/upstream/src/dothrow.c:877` through `:879`: if the hero's current form touch-petrifies, `minstapetrify(mon, TRUE)` is called unless the target monster is wearing an undershirt, body armor, or cloak.
- `nethack-c/upstream/src/trap.c:3844` through `:3854`: `instapetrify()` returns without death for stone resistance or stone-golem polyself rescue; otherwise it prints `You turn to stone...` and finishes a stoning death.
- `nethack-c/upstream/src/trap.c:3858` through `:3879`: `minstapetrify()` respects monster stoning resistance, handles stone-golem conversion, and credits player-caused petrification.

## JS Change

- `js/cmd.js`: recoil monster collision now returns structured `{ messages, trapResult }` data like obstacle recoil, so fatal and life-saving stoning can flow through the existing command-mode handoff.
- Hero-side bodily collision checks only shirt/body/cloak slots, then honors stone resistance, stone-golem polyself rescue, and life saving with stoning cleanup.
- Monster-side bodily collision checks the hero's current polyself form for touch petrification, skips targets wearing shirt/body/cloak, and reuses the existing monster stoning/statue path.
- Fatal hero stoning returns before the final nearby wake, matching C's ordinary fatal `instapetrify()` ordering. Nonfatal resistance, rescue, life-saving, and monster-side outcomes still reach the nearby wake path.

## Tests

- `levitating hero-thrown ordinary weapon recoil cockatrice collision petrifies hero`
- `levitating hero-thrown ordinary weapon recoil cockatrice collision uses life saving`
- `levitating hero-thrown ordinary weapon recoil cockatrice collision is blocked by body armor`
- `levitating hero-thrown ordinary weapon recoil cockatrice form petrifies unarmored monster`
- `levitating hero-thrown ordinary weapon recoil monster body armor blocks cockatrice-form touch`

Focused verification:

```sh
node --test --test-reporter=dot --test-name-pattern "levitating hero-thrown ordinary weapon recoil (cockatrice collision petrifies hero|cockatrice collision uses life saving|cockatrice collision is blocked by body armor|cockatrice form petrifies unarmored monster|monster body armor blocks cockatrice-form touch)" test/shop-billing-helpers.test.mjs
```

## Remaining Follow-Up

- Full `setmangry(FALSE)` parity remains broader than this slice: visible wake/anger/growl messages, alignment/priest/shopkeeper/quest-guardian side effects, and peaceful bystander response remain incomplete.
- `wake_nearto()` still lacks visible wake messages and buried-zombie disturbance behavior in this recoil path.
