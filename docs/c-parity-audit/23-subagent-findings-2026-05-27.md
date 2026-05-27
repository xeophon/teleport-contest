# C Parity Audit 23: Potion-of-Oil Lamp Refuel via #dip

## Scope

This slice covers the narrow `#dip` path where the hero dips a carried oil lamp or magic lamp into a carried potion of oil. It is not a generic potion-dipping port: water dipping, potion mixing, oiling weapons, unicorn horn/amethyst mixtures, acid/corrosion, and full explosion/damage effects remain outside this slice.

## C Source Notes

- `nethack-c/upstream/src/potion.c:2267-2376`: `dodip()` first selects the object to dip, optionally offers floor features, then prompts for a potion source with the "What do you want to dip <object> into?" getobj flow.
- `nethack-c/upstream/src/potion.c:2442-2686`: `potion_dip()` runs broad potion interactions before lamp refueling. Lit or cursed oil is consumed by generic oil handling before the lamp refuel block.
- `nethack-c/upstream/src/potion.c:2689-2722`: oil lamps and magic lamps dipped into oil refuel only when the source is a potion of oil. A lit target lamp explodes instead of refueling, empty magic lamps convert to oil lamps, full lamps (`age > 1000`) do not consume oil, successful fills print "You fill ... with oil.", call `check_unpaid(potion)`, add `(!odiluted ? 4 : 3) * potion->age / 2` fuel capped at `1500`, then `useup(potion)`.
- `nethack-c/upstream/src/shk.c:5688-5741`: `check_unpaid()` delegates to `check_unpaid_usage(..., FALSE)`; oil potions charge one fifth of current cost with the Yendorian Fuel Tax message.
- `nethack-c/upstream/src/invent.c:1200-1346` and `nethack-c/upstream/src/shk.c:1135-1266`: `useup()` decrements stacks or routes final unpaid objects through `obfree()` so a final consumed bottle remains payable as a used-up bill row, while partial stacks expose a partly used-up bill portion.

## JS Status

- `js/cmd.js` now recognizes oil/magic lamps as the narrow inventory-to-inventory `#dip` targets when a carried potion of oil exists, asks the second C-shaped source prompt, and leaves other `#dip` cases on the existing fountain path.
- Successful refuel preserves C ordering: fill message, Fuel Tax billing, lamp fuel mutation, one-potion consumption, and oil identification. Fuel gain uses the C formula and caps lamp age at `1500`.
- Full lamps spend the command turn, set `spe = 1`, and leave the oil potion plus live bill row untouched.
- Empty magic lamps convert to oil lamps before the fullness check and then refuel from age `0`.
- Final unpaid oil bottles become used-up bill rows; unpaid oil stacks keep the surviving bottle live while itemized payment exposes the consumed portion.

## Remaining Follow-Ups

- Later audits cover water, oiling weapons, acid/corrosion, poison coating, unicorn horn/amethyst mixtures, broad non-self carried potion menus, bounded polymorph dipping, potion-potion alchemy recipes/bad mixtures, and alchemy-explosion vapor effects. Remaining generic `potion_dip()` work is thrown/broken potion vapor delivery, non-`kn` `trycall()` prompt parity, water vapor gremlin/lycanthropy transformations, full `poly_obj()` fidelity, real `?*` menu rendering, self-potion/Klein-bottle handling, exact status-property mapping, and shared damage/discovery primitives.
- Exact C fire/explosion and damage side effects for lit oil or lit target lamps.
- `#altdip` reversed source-first command flow is covered for carried potion effects; broader command/menu infrastructure still needs real C-style menu rendering.
