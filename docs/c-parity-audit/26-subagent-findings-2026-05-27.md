# C Parity Audit 26: Poisonable Weapon Potion Dipping

## Scope

This slice covers the potion-of-sickness and healing-family branches for carried poisonable weapon `#dip`. It intentionally stays short of the full `potion_dip()` matrix: generic source menus for every potion/target, alchemy, unicorn horn/amethyst mixtures, combat poison wear-off, and exact poisoned inventory name ordering remain separate work. The bounded acid corrosion branch is covered in audit 29, and source-first inventory action `#altdip` for implemented effects is covered in audit 30.

## C Source Notes

- `nethack-c/upstream/src/potion.c:2267-2376`: normal `#dip` chooses the object first, offers local fountain/sink/pool features before inventory potion sources, then prompts `What do you want to dip <object> into?`.
- `nethack-c/upstream/src/potion.c:2442-2455`: `potion_dip()` receives the already-selected object and potion.
- `nethack-c/upstream/src/potion.c:2615-2634`: `POT_SICKNESS` coats an unpoisoned `is_poisonable()` object, while `POT_HEALING`, `POT_EXTRA_HEALING`, and `POT_FULL_HEALING` remove coating only from poisoned objects that are not `permapoisoned()`.
- `nethack-c/upstream/src/potion.c:2768-2791`: unmatched potion/object pairs fall through to `Interesting...` and still spend the turn without consuming the potion.
- `nethack-c/upstream/src/potion.c:2408-2412`, `nethack-c/upstream/src/invent.c:1321-1332`, `nethack-c/upstream/src/shk.c:1206-1233`: successful sickness/healing coating changes call `poof(potion)`, which calls `useup(potion)`; unpaid preservation therefore comes from ordinary `useup()`/`obfree()` handling, not `check_unpaid()`.
- `nethack-c/upstream/include/obj.h:260-268`, `nethack-c/upstream/include/skills.h:43-48`, `nethack-c/upstream/include/objects.h:140-168`: `is_poisonable()` covers projectile/ammo weapon rows from shuriken through bows by negative skill ordering; arrows, ya, crossbow bolts, darts, and shuriken qualify, while boomerangs fall outside the range.
- `nethack-c/upstream/include/artilist.h:123-126`, `nethack-c/upstream/src/artifact.c:2835-2840`: Grimtooth is the current permanent-poison artifact, so healing-family potions do not strip its coating.

## JS Status

- `js/cmd.js:10473-10484` now identifies sickness and healing-family potion sources.
- `js/cmd.js:11488-11623` adds poisonable/permanent-poison weapon checks, combines implemented oil/sickness/healing potion source selection, consumes successful dip potions through the existing inventory use-up helper, and implements the C sickness/healing success and `Interesting...` no-consume branches.
- `js/cmd.js:23300-23318` prefixes displayed weapon names with `poisoned` for the modeled poisonable weapon kinds.
- `js/cmd.js:44189-44322` reuses the existing declined-fountain source prompt after `n`, now listing implemented oil/sickness/healing potion sources for the selected target while preserving the existing command mode.
- `test/shop-billing-helpers.test.mjs:3478-3613` covers sickness coating, healing/extra healing/full healing stripping, already-poisoned sickness no-consume behavior, unpaid sickness stack residual billing without usage debit, and Grimtooth permanent-poison no-strip behavior.

## Remaining Follow-Ups

- Implement the full C `drink_ok` source menu and broader `potion_dip()` matrix instead of offering only locally implemented potion sources.
- Add alchemy and unicorn horn/amethyst behavior; acid corrosion is covered in audit 29, and source-first `#altdip` for implemented effects is covered in audit 30.
- Move poisoned weapon naming toward C `doname()` ordering, such as `poisoned +0 arrow` rather than the current modeled `+0 poisoned darts` inventory line shape.
- Port poison combat application/wear-off and trap/projectile poison lifecycle outside the narrow dip branch.
