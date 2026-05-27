# C Parity Audit 28: Magic-Bag Loss Owner Routing and Next Slices

## Scope

This slice covers cursed shop-floor magic-bag content loss when a vanished object is on another shopkeeper's live bill row. C routes that lost item through bill ownership before freeing it, so the debt belongs to the bill owner rather than always to the shopkeeper who owns the floor container's square.

Parallel source audits also identified bounded follow-up slices for acid `#dip`, source-first `#altdip`, poisoned weapon display ordering, and stone-to-flesh object transforms.

## C Source Notes

- `nethack-c/upstream/src/pickup.c:2536`: `boh_loss()` extracts lost cursed magic-bag contents.
- `nethack-c/upstream/src/pickup.c:2801`: `mbag_item_gone()` calls `stolen_value(item, u.ux, u.uy, shkp->mpeaceful, TRUE)` before `obfree()`.
- `nethack-c/upstream/src/pickup.c:3764`: `#tip` cursed magic-bag loss uses the same `mbag_item_gone()` path.
- `nethack-c/upstream/src/shk.c:1082`: `find_objowner()` finds an object's bill owner and prefers that owner over the supplied shopkeeper.
- `nethack-c/upstream/src/shk.c:3712`: `stolen_container()` removes matching bill rows with `sub_one_frombill()`.
- `nethack-c/upstream/src/shk.c:3753`: `stolen_value()` starts by resolving the owner through `find_objowner()`, so a live row on another shopkeeper owns the charge.
- `nethack-c/upstream/src/shk.c:1187`: `obfree()` searches all shopkeepers for unpaid object rows before preserving used-up state.

## JS Status

- `js/cmd.js:18703-18734` now builds per-shopkeeper vanished-content charges for floor-source cursed magic-bag losses. It prefers a live bill owner, removes that owner's bill row, recurses into nested contents, keeps source-shop valuation as the fallback for unbilled source stock, and preserves the C `OBJ_FREE` split where contained gold and unbilled nested contents inside an extracted container do not inflate debt.
- `js/cmd.js:18736-18747` now charges each owner separately while keeping C's `mbag_item_gone()` peaceful/robbed branch tied to the source shopkeeper's peaceful state.
- `test/shop-billing-helpers.test.mjs:10677-10771` covers top-level owner rows, `no_charge` owner rows, nested owner rows, and the angry-source robbed-value branch.

## Remaining Follow-Ups

- Magic-bag work is still local rather than a central C-shaped `obfree()`/`stolen_value()` subsystem; remaining source/target cases and debt naming should converge on shared ownership helpers.
- Acid `#dip` is now covered in audit 29 for carried corrodeable targets, grease, proof/no-effect, and unpaid stack use-up billing. Broader acid/material parity still belongs with the object registry and remaining potion matrix work.
- Source-first `#altdip` remains separate. C selects the source potion first through `potion.c:2374` and `iactions.c:159/371`, with the potion-of-oil exception at `iactions.c:368`; JS inventory actions currently cover only the `t` inventory action.
- Poisoned weapon display ordering remains separate. C `xname()` and `doname()` differ: raw names can say `poisoned arrow`, while known inventory display re-adds poison before enchantment so it reads like `poisoned +0 arrow`. JS currently has covered dip behavior but still needs display-order parity.
- Stone-to-flesh object transforms remain separate. C `zap.c:2076-2085` transforms rings into meat rings, wands into meat sticks, and gems/stones into meatballs; JS has meat-stick metadata but not the transformation pipeline.
