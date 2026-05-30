# C Parity Audit 241: Polyself Gray Antimagic

## Sources

- `nethack-c/upstream/include/objects.h:502`, `nethack-c/upstream/include/objects.h:530`, and `nethack-c/upstream/include/objclass.h:88`: gray dragon scale mail and gray dragon scales grant `ANTIMAGIC` through object property metadata.
- `nethack-c/upstream/src/worn.c:96-136` and `nethack-c/upstream/src/worn.c:168-184`: `setworn()` applies an object's `oc_oprop` to the worn slot's extrinsic mask and `setnotworn()` clears that worn-slot source.
- `nethack-c/upstream/include/youprop.h:55-57`: `Antimagic` is the union of intrinsic and extrinsic antimagic.
- `nethack-c/upstream/src/polyself.c:55-86`: `set_uasmon()` grants `ANTIMAGIC` from gray dragon and baby gray dragon form with `FROMFORM`.
- `nethack-c/upstream/src/polyself.c:637-660`: matching dragon merge keeps the armor object as embedded skin and does not call `setnotworn()`, so gray skin remains an active antimagic source.
- `nethack-c/upstream/src/do_wear.c:796-806` and `nethack-c/upstream/src/do_wear.c:939-957`: gray dragon armor has no special `Dragon_armor_gone()` side effect; `Armor_gone()` still clears worn armor generically before destruction or drop.
- `nethack-c/upstream/src/polyself.c:1162-1214`: successful polyself break/slip fallout calls the body-armor off path before destroying or dropping the armor.
- `nethack-c/upstream/src/muse.c:1609-1621`: monster-zapped wand of striking checks hero `Antimagic` and emits `Boing!` when resisted.
- `nethack-c/upstream/src/insight.c:1523-1524` and `nethack-c/upstream/src/attrib.c:905-965`: enlightenment reports `magic-protected`; wizard-mode source text uses creature-form wording for `FROMFORM`.

## JS Changes

- Added dragon armor property metadata to the existing dragon armor table and introduced a shared active antimagic lookup that recognizes gray dragon mail, gray dragon scales, and cloak of magic resistance across worn equipment and embedded polyself skin.
- Exported `heroHasAntimagic()` and reused it for monster wand-of-striking resistance, death attributes, and existing magic-resistance checks.
- Added gray dragon form antimagic detection so successful polyself into gray or baby gray dragon grants the same active antimagic state C sets with `FROMFORM`.
- Updated the attributes page to use the shared antimagic source and to report creature-form antimagic with C-shaped wording.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- Gray dragon polyself grants form antimagic.
- Matching gray dragon scales embed as skin and keep antimagic.
- No-hands polyself clears gray dragon scale mail antimagic as soon as worn state is cleared, before the deferred final drop.
- Small-form polyself drops gray dragon scales immediately and clears antimagic.

## Remaining Gaps

- Other dragon armor properties remain uneven across inventory protection and form-intrinsic helpers; white, green, orange, yellow, and black dragon slices should remain separate.
- Broad `set_uasmon()` property parity is still incomplete beyond the currently modeled form antimagic and earlier silver-form reflection work.
- Uncontrolled draconian random/class routing remains narrower than C and is unchanged by this property slice.

## Verification

- `node --check js/cmd.js`
- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "gray dragon polyself|gray dragon antimagic|gray dragon scales clears antimagic" test/shop-billing-helpers.test.mjs` (`4` matching tests passed)
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` (`1155/1155` tests passed)
- `node --test test/*.mjs` (`1252/1252` tests passed)
- `npm run score` (`44/44` replay sessions passed)
