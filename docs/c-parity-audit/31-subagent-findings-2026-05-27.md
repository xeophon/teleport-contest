# C Parity Audit 31: Poisoned Weapon Display Ordering

## Scope

This slice brings poisoned weapon display closer to C `doname()` ordering for inventory rows and `#dip` prompts. Raw object names remain `xname()`-style so potion coating/removal messages still say `the darts` or `the poisoned darts`, while known display paths now place poison before erosion/enchantment, for example `poisoned +0 dart`.

## C Source Notes

- `nethack-c/upstream/src/objnam.c:685`: `xname()` builds raw poisonable weapon names with `poisoned ` inside the base name, such as `poisoned arrow`.
- `nethack-c/upstream/src/objnam.c:1247-1264`: `doname()` strips the leading `poisoned ` from the raw `xname()` result and records that state separately.
- `nethack-c/upstream/src/objnam.c:1418-1421`: weapon `doname()` re-adds `poisoned ` before erosion words and known enchantment, producing `poisoned +0 arrow` instead of `+0 poisoned arrow`.
- `nethack-c/upstream/src/invent.c:2922` and `nethack-c/upstream/src/invent.c:3322`: inventory menu display routes through `doname()`/inventory print helpers.
- `nethack-c/upstream/src/potion.c:2301` and `nethack-c/upstream/src/potion.c:2365`: `#dip` object prompts call `short_oname(obj, doname, ...)`, so target descriptions also use `doname()` ordering.
- `nethack-c/upstream/src/potion.c:2620-2631`: poison coating/removal effect messages use raw object naming, so those stay `xname()`-style.

## JS Status

- `js/cmd.js:7414-7455`: a display-only helper splits a leading `poisoned ` out of poisonable weapon raw names for `dipItemDescription()`, keeping the quantity first and placing poison before erosion/enchantment.
- `js/cmd.js:27725-27732`: identified inventory rows now reuse the display split so poisoned weapons show `poisoned +0 ...`.
- `js/cmd.js:27901-27912`: normal inventory rows now place poison before erosion/enchantment, including refreshed stacks such as `3 poisoned +0 darts`.
- `js/cmd.js:23316-23450`: `pickupObjectName()` remains raw-name-like for poison, and `js/cmd.js:11520-11666` keeps potion coating/removal messages on that xname-style path.
- `test/shop-billing-helpers.test.mjs:3654-3660`, `test/shop-billing-helpers.test.mjs:3678-3691`, and `test/shop-billing-helpers.test.mjs:3715-3721`: focused coverage verifies source-first coating inventory refresh, target-first prompt ordering, and unchanged xname-style coating messages.

## Parallel Follow-Up Audits

- Water BUC effects are now covered in audit 32 for blessed/cursed water source selection, BUC mutation, source consumption, visible glow/aura learning, and unpaid water devaluation billing. Neutral-water `water_damage()` is covered in audit 34, with shared primitives still open.
- Unicorn horn and amethyst neutralization is covered in audit 33 for the local `mixtype()` rows, split-one source stacks, `COST_NUTRLZ`, mutation, and no-effect fallbacks.
- Stone-to-flesh self-cast: C routes stone-to-flesh through the wand-like directional path; self-cast transforms only mineral/gemstone inventory objects into meat ring, meat stick, or meatball as appropriate, then repeatedly merges eligible food results. JS currently treats healing-category spells generically, so stone-to-flesh does not transform inventory yet.

## Remaining Follow-Ups

- Broad non-self carried potion `#dip` source/target menu parity, neutral-water damage, and horn/amethyst mixtures are covered in later audits. Potion-potion alchemy, real `?*` menu rendering, full `poly_obj()` fidelity, self-potion/Klein-bottle handling, and poison lifecycle outside dipping remain separate slices.
- Broader naming parity should eventually flow through a C-shaped `xname()`/`doname()` split instead of local display helpers.
- Stone-to-flesh object transforms remain a separate spell/object-registry slice.
