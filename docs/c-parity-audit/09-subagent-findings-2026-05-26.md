# C Parity Audit 09: Sub-Agent Findings 2026-05-26

This note preserves the latest parallel source audits. These are implementation candidates only; they are derived from upstream C and current JS, not from private-test inference.

## Completed From This Round

- Object/wish no-match handling: C `makewish()` retries failed `readobjnam()` descriptions and calls `readobjnam(NULL, NULL)` after `MAXWISHTRY` failures (`nethack-c/upstream/src/zap.c:6313-6366`). JS now removes the arbitrary named-weapon fallback, keeps invalid descriptions out of wish conduct, retries the prompt, and randomizes on the fifth bad description.
- Carried fire-ignition shop billing: C `catch_lit()` charges carried unpaid ignitable objects in shops through `check_unpaid()`, prints the additional-cost message, and preserves the bill row with `bill_dummy_object()` before `begin_burn()` (`nethack-c/upstream/src/apply.c:1577-1620`). JS now charges unpaid carried lamps/light sources that catch fire in a shop, records the used-up bill row, and leaves off-shop ignition on the live bill row.
- Wish quantity and requested `spe`: C `readobjnam()` only applies wished counts to mergeable/multigen objects and constrains requested `spe` by class (`nethack-c/upstream/src/objnam.c:5037-5189`, `nethack-c/upstream/src/objnam.c:5255-5268`). JS now keeps non-mergeable wishes such as boots, wands, magic markers, and spellbooks at quantity one, allows covered mergeable/count-capped objects, and applies class-shaped `spe` limits for weapons, armor, weapon-tools, charged rings, wands, crystal balls, and non-`spe` objects.
- Floor fire ownership: C beam floor destruction calls `useupf()` only for hero-caused damage, while generic `fire_damage()`/`fire_damage_chain()` can call `catch_lit()` without adding floor-item shop billing (`nethack-c/upstream/src/zap.c:4598-4661`, `nethack-c/upstream/src/trap.c:4455-4565`). JS now keeps generic floor catch-light unbilled and routes monster red dragon breath through non-hero floor-fire ownership.
- Wand engraving usage fees: C `doengrave()` spends a wand charge before the text prompt, then calls `check_unpaid()` using the post-spend `spe` (`nethack-c/upstream/src/engrave.c:784-797`, `nethack-c/upstream/src/shk.c:5688-5742`). JS now has an engraving-specific wand spend path, bills unpaid use from the remaining charges, skips last-charge usage fees, and preserves cursed backfire wands as used-up bill rows.
- Wish charge suffix parsing: C `readobjnam_parse_charges()` strips the last parenthetical before object lookup, accepts `(lit)`, `(n)`, and `(r:n)`, preserves valid trailing text, strips invalid suffix tails, caps `spe`/recharge values, and only stores `recharged` on wands (`nethack-c/upstream/src/objnam.c:4177-4237`, `nethack-c/upstream/src/objnam.c:5290`). JS now uses one pre-lookup suffix parser for wands and tools, preserves `named` text after valid suffixes, treats signed suffixes as invalid stripping, ignores tool recharge counts, and displays known charges with the real recharge count.
- Floor-container itemized `#pay`: C `make_itemized_bill()` walks bill rows back to live objects, collapses contained objects under their outermost container, and `buy_container()` clears each contained bill row during payment (`nethack-c/upstream/src/shk.c:1542-1660`, `nethack-c/upstream/src/shk.c:2304-2410`). JS now groups ledger-backed unpaid contents inside shop-floor containers the same way as carried containers, pays them through the existing container payment row, clears every constituent ledger row, and leaves the contents inside the floor container.
- Partly-used contained-item `#pay`: C emits a used-up row for `bquan - quan`, keeps the live residual under the outermost container row, rejects buying the container row while the used-up portion is unpaid, and pays selected itemized rows in sorted bill order (`nethack-c/upstream/src/shk.c:1584-1640`, `nethack-c/upstream/src/shk.c:2119-2192`, `nethack-c/upstream/src/shk.c:2336-2450`). JS now keeps the same split for carried and floor containers, reports a blocked container payment when selected alone, and processes selected used-up rows before the container payment so both-selected and stepwise payments clear the live bill.

## Candidate Slices

1. Remaining floor-effect deletion ownership audit.
   - C refs: `nethack-c/upstream/src/trap.c:4455-4541`, `nethack-c/upstream/src/zap.c:4598-4661`, `nethack-c/upstream/src/invent.c:4763-4777`, `nethack-c/upstream/src/shk.c:3307-3710`.
   - JS refs: `js/cmd.js:7794`, `js/cmd.js:7811`, `js/cmd.js:8219`.
   - Audit conclusion: generic floor `fire_damage()` catch-light/destruction is not a place to add blanket floor-item billing. Future slices should audit each destructive floor-effect caller against its C ownership path before choosing `useupf()`-style billing, robbed-value debt, or no billing.

2. Projectile and drop shop landing parity.
   - C refs: `nethack-c/upstream/src/dothrow.c:1180`, `nethack-c/upstream/src/dothrow.c:1780`, `nethack-c/upstream/src/do.c:827`, `nethack-c/upstream/src/dokick.c:409`, `nethack-c/upstream/src/shk.c:3692-3927`.
   - JS refs: `js/cmd.js:14901-14945`, `js/cmd.js:42499`, `js/cmd.js:42743`.
   - Narrow slice: add a shared shop-object landing helper for unpaid same-shop return, off-shop stolen-value conversion, and paid landing sale handling before broad breakage/container-impact work.

3. Victual runtime after first-bite billing.
   - C refs: `nethack-c/upstream/src/eat.c:360`, `nethack-c/upstream/src/eat.c:519`, `nethack-c/upstream/src/eat.c:2020`, `nethack-c/upstream/src/eat.c:3049-3129`, `nethack-c/upstream/src/eat.c:3806`.
   - JS refs: `js/cmd.js:10611-10753`, `js/cmd.js:41878-42119`, `js/allmain.js:10812`.
   - Narrow slice: use the existing `oeaten` and first-bite billing helpers for ordinary non-special food so one bite happens at command start, later bites happen during occupation, and the object is removed only at finish.

4. Tin follow-up.
   - C refs: `nethack-c/upstream/src/eat.c:1389`, `nethack-c/upstream/src/eat.c:1514-1721`.
   - JS refs: `js/cmd.js:11992-12235`.
   - Narrow slice: handle metallivorous empty/meat/spinach tin nutrition and prompt bypass exactly, after ordinary victual runtime is stable.

5. Wish parser and object finalization.
   - C refs: `nethack-c/upstream/src/objnam.c:3978-3996`, `nethack-c/upstream/src/objnam.c:4177-4237`, `nethack-c/upstream/src/objnam.c:5037-5189`, `nethack-c/upstream/src/objnam.c:5255-5268`, `nethack-c/upstream/include/objclass.h:52`, `nethack-c/upstream/include/objclass.h:60`, `nethack-c/upstream/include/obj.h:49`, `nethack-c/upstream/src/zap.c:6360`.
   - JS refs: `js/cmd.js:9485`, `js/cmd.js:9504`, `js/cmd.js:19322`, `js/cmd.js:38258-38512`.
   - Narrow slice status: C-shaped quantity, requested-`spe`, and common charge suffix constraints are now in place for common object classes without replacing the whole parser. Remaining work is registry-backed `oc_merge`/`oc_charged` metadata, non-wishable substitutions, exact fuzzy matching/ranges, explicit non-object results, and artifact provenance.

6. Victual runtime after first-bite billing.
   - C refs: `nethack-c/upstream/src/eat.c:360`, `nethack-c/upstream/src/eat.c:519`, `nethack-c/upstream/src/eat.c:2022`, `nethack-c/upstream/src/eat.c:2968`, `nethack-c/upstream/src/eat.c:3026`, `nethack-c/upstream/src/eat.c:3056`, `nethack-c/upstream/src/eat.c:3806`.
   - JS refs: `js/cmd.js:10758`, `js/cmd.js:10777`, `js/cmd.js:10803`, `js/cmd.js:42046`, `js/cmd.js:42222`, `js/allmain.js:10814`.
   - Narrow slice: start with ordinary delayed food such as food rations, keeping the touched item active after the first bite, consuming nutrition/`oeaten` over occupation ticks, and removing the item only at finish.
