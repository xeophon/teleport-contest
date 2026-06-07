# 658 - Hero Anti-Magic Trap Movement

## C Source

- `nethack-c/upstream/src/trap.c:1061-1087` excludes `ANTI_MAGIC` from floor-trigger handling, so flying and levitation do not skip anti-magic fields.
- `nethack-c/upstream/src/trap.c:3035-3043` excludes `ANTI_MAGIC` from the generic seen-trap escape branch.
- `nethack-c/upstream/src/trap.c:2323-2392` handles hero anti-magic effects: mark the trap seen, let positively enchanted iron footwear absorb one enchantment and return, otherwise apply antimagic HP damage when applicable, then drain current and maximum power.
- `nethack-c/upstream/src/trap.c:5202-5215` is the `drain_en()` tail that clamps power and prints either the energy-drain or momentary-lethargy message.
- `nethack-c/upstream/src/ball.c:891-958` and `nethack-c/upstream/src/hack.c:3375-3395` route attached-ball fallback relocation through `spoteffects(TRUE)`, which picks up before non-pit traps and then calls `dotrap()`.

## Port Notes

- Promoted hero anti-magic handling to a result-returning helper shared by sit, ordinary movement, object-list deferred movement, and attached-ball fallback relocation.
- Ordinary hero movement now triggers anti-magic fields directly instead of falling through as if no trap fired.
- Anti-magic fields now stay active through levitation/flying and through seen traps, matching the C gates.
- Positively enchanted iron shoes and kicking boots now absorb anti-magic before HP or power drain by losing one enchantment.
- Object-list and dismount-object-list deferred trap handling now preserve anti-magic fields after pile display dismissal.
- Attached-ball fallback relocation now triggers anti-magic on the relocated hero square behind the thrown ball.

## Tests

- `known anti-magic field always drains energy without escape roll`
- `levitating hero still triggers hidden anti-magic field`
- `enchanted iron shoes absorb anti-magic field before energy drain`
- `magic-resistant hero anti-magic field damages hp before energy drain`
- `object list anti-magic field waits until more is dismissed`
- `attached ball fallback relocation triggers anti-magic field on new hero square`
- Focused verification: `node --test --test-reporter=dot --test-name-pattern "anti-magic field|anti-magic trap|attached ball fallback relocation triggers anti-magic" test/shop-billing-helpers.test.mjs`

## Remaining Follow-Ups

- Hero anti-magic HP damage still needs narrower canaries for half physical/spell damage, Magicbane, carried magic-defending artifacts, pass-wall quartering, and fatal/life-saving ordering.
- Same-level teleport and magic attached-ball fallback traps are covered by audit 659; statue traps are covered by audit 660.
- Blind ball/chain glyph ordering after attached-ball relocation remains open.
