# C Parity Audit 284: Hallucinated Shop Currency

## Sources

- `nethack-c/upstream/src/invent.c:1518-1554`: `currency(amount)` chooses from a 21-entry fictional currency table under `Hallucination`; otherwise it uses `zorkmid`.
- `nethack-c/upstream/include/hack.h:1493`: `ROLL_FROM(currencies)` uses core `rn2(SIZE(currencies))`, not display RNG.
- `nethack-c/upstream/src/objnam.c:2836-3048`: `makeplural()` pluralizes the selected currency when `amount != 1L`; for the C currency table this is equivalent to appending `s`.
- `nethack-c/upstream/src/sounds.c:733-743` and `nethack-c/upstream/src/shk.c:5567-5577`: hallucinated GEICO sell speech and resident bill/debit/credit chatter all call `currency()`.

## JS Coverage

- `shopCurrency()` now rolls from the C 21-entry hallucinated currency table whenever the hero is hallucinating.
- The helper still returns ordinary `zorkmid`/`zorkmids` and consumes no RNG outside hallucination.
- Each `shopCurrency()` call rolls independently under hallucination, matching C `currency()` call behavior and avoiding per-message caching.
- Directed helmet sell chatter now inherits the shared behavior for hallucinated gecko GEICO speech, resident GEICO speech, resident bill totals, debit reminders, and credit reminders.

## Tests

Focused canaries in `test/shop-billing-helpers.test.mjs` cover:

- hallucinated actual and displayed gecko GEICO lines using core `rn2(21)` without display RNG,
- hallucinated resident GEICO after the resident `rn2(2)` split,
- hallucinated billed resident chatter preserving singular currency,
- hallucinated debit resident chatter preserving `rn2(2)`, randomized pronoun, then hallucinated currency ordering.

## Remaining Gaps

- C hallucinated `Shknam()` randomizes shopkeeper names in resident chatter; JS still keeps the shopkeeper display name stable.
- Silent/polymorphed actual shopkeeper handling is still incomplete in the directed helmet responder scan.
- Broader shared `domonnoise()` and `#chat` are still not unified with directed helmet tipping.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "hallucinating worn helmet tip (at actual gecko|routes displayed gecko|at town Izchak|at resident shopkeeper|at billed resident shopkeeper|at debit resident shopkeeper)" test/shop-billing-helpers.test.mjs` (`6/6` selected tests passed)
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` (`1284/1284` tests passed)
- `node --test test/*.mjs` (`1381/1381` tests passed)
- `npm run score` (`44/44` replay sessions passed)
