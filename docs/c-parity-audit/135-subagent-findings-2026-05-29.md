# 135 - Shopkeeper payment speech and fresh follow-up audits

## Implemented Slice

Shopkeeper payment messages now honor the C distinction between verbal shopkeeper speech and nonverbal feedback. Successful itemized payment still uses the quoted thank-you when the hero can hear and the shopkeeper can speak, but deaf heroes and mute/silent/animal-sound shopkeepers now get the nod fallback. Angry shopkeepers no longer thank the hero after bill payment.

Partly-used bill blockers now use C-shaped wording. Loose intact portions say `this one` or `these` instead of inventing a container phrase, angry shopkeepers say `Pay` instead of `Please pay`, and nonverbal paths use the shopkeeper pointing out the bill or motioning to it when limbless. Charged-use debit still applies silently when the shopkeeper cannot speak to the hero.

C anchors:

- `muteshk(shkp)` treats helpless or animal-sound shopkeepers as unable to speak: `nethack-c/upstream/src/shk.c:58`, `nethack-c/upstream/include/monflag.h:29`.
- `dopay()` thank-you output is verbal only when the hero is not deaf and the shopkeeper is not mute, otherwise it uses the nod fallback; angry shopkeepers are excluded: `nethack-c/upstream/src/shk.c:2010`.
- `pay_billed_items()` rejects intact portions of partly-used stacks until the used-up portion is paid: `nethack-c/upstream/src/shk.c:2277`.
- `reject_purchase()` selects `Pay` for angry shopkeepers, `Please pay` for peaceful speech, `this one`/`these` for loose stacks, contained `one(s) in <container>` wording for container payment, and nonverbal point/motion fallbacks: `nethack-c/upstream/src/shk.c:2413`.
- `check_unpaid_usage()` still debits the hero but suppresses the spoken fee when the hero is deaf or the shopkeeper is mute: `nethack-c/upstream/src/shk.c:5682`.

JS changes:

- Added a local shopkeeper speech helper that combines hero deafness, C's `MS_ANIMAL` threshold, silent/mute/helpless flags, and no-limbs fallback detection: `js/cmd.js:20968`.
- `checkUnpaidUsage()` now pushes fee messages only when the shopkeeper can speak to the hero: `js/cmd.js:30009`.
- `blockedShopPaymentMessage()` now has C-shaped verbal, angry, loose/contained, and nonverbal branches and is threaded through payment blockers with the relevant shopkeeper: `js/cmd.js:31028`.
- `shopPaymentThankYouMessage()` now suppresses angry thanks and emits nod feedback for deaf/mute cases: `js/cmd.js:31405`.

## Tests Added

Added focused shop payment coverage in `test/shop-billing-helpers.test.mjs`:

- mute shopkeeper charged-use debit applies without a spoken usage-fee message: `test/shop-billing-helpers.test.mjs:2213`;
- deaf hero and mute shopkeeper bill payments queue the nod thank-you fallback, while angry shopkeepers queue no thank-you: `test/shop-billing-helpers.test.mjs:24082`;
- loose partly-used stack blockers use `this one`/`these`, angry `Pay`, deaf/nonverbal `points out`, and limbless `motions to` wording: `test/shop-billing-helpers.test.mjs:25060`.

## Deferred Gaps From This Agent Round

- Horizontal cockatrice/chickatrice eggs still need the C `hmon()` petrification branch, including hit RNG, `obfree()` used-up billing, resistance/stone-golem handling, and no floor `Splat!`.
- Horizontal pyrolisk eggs still need direct-hit explosion delivery with `d(3,6)` fireball damage and no floor break message.
- Thrown gold still only ships through seen holes/trapdoors; stairs, ladders, and branch stairs need `down_gate()`/`ship_object()` migration records, no-drop handling, and reciprocal arrival placement.
- Burning-oil shop doors still need `SHOP_DOOR_COST` damage records, one deferred `pay_for_damage("burn away", FALSE)` pass after blast effects, and delayed shopkeeper repair via `REPAIR_DELAY`.
- Stone-to-flesh still lacks directed doppelganger/cant-revive retargeting, named and historic statue side effects, mimic reveal cleanup, carried statue animation, and immediate `m_dowear()` after statue content transfer.
- Upward ordinary corpses and broader falling objects still need the generic `toss_up()` damage path, `Maybe_Half_Phys()` mitigation, hard-helmet caps/messages, and landing-before-damage ordering.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test test/shop-billing-helpers.test.mjs` - 899/899
- `npm run score` - 44/44
