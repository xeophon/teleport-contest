# C Parity Audit 232: Polyself Weapon Release

## Sources

- `nethack-c/upstream/src/polyself.c:1248-1251`: glove fallout calls `drop_weapon(0)` before dropping the gloves.
- `nethack-c/upstream/src/polyself.c:1304-1355`: `drop_weapon(alone)` uses `canletgo()` to choose between dropping and merely releasing wielded weapons, with standalone wording of `drop` versus `release`.
- `nethack-c/upstream/src/do.c:663-710`: `canletgo()` refuses welded wielded weapons and learns their curse state, but suppresses its own message when called with an empty word.
- `nethack-c/upstream/src/wield.c:61-66`: cursed weapons and weapon-tools weld to the hero's hand.
- `nethack-c/upstream/src/weapon.c:86-142`: `weapon_descr()` supplies short standalone nouns for involuntary weapon release/drop messages.

## JS Changes

- Added a released-item path to polyself equipment fallout so a forced no-hands form can clear wielded state without removing the object from inventory.
- Routed cursed wielded weapons through release instead of floor dropping, including the glove branch that already says `You drop your gloves and weapon!`.
- Routed wielded loadstones through the same path: uncursed loadstones drop and become cursed as they leave inventory, while cursed loadstones are released in inventory and become BUC-known.
- Updated standalone no-hands weapon wording from generic `drop your weapon` to C-like `drop/release your <weapon noun>`.
- Preserved the existing deferred wielded-tool More path; this slice does not broaden tool timing.
- Queued released items across the existing overload More path so delayed polyself fallout can clear wielded state without losing inventory ownership.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- No-hands polyself with an uncursed wielded dagger says `drop your dagger`, removes it from inventory, and drops an unwielded floor object.
- No-hands polyself with a cursed wielded dagger says `release your dagger`, keeps it in inventory, clears wielded state, learns the curse, and creates no floor dagger.
- Glove fallout with a cursed wielded dagger keeps the existing glove-and-weapon message, drops only the gloves, and releases the dagger in inventory.
- No-hands polyself with an uncursed wielded loadstone says `drop your stone`, removes it from inventory, and leaves a cursed floor loadstone.
- No-hands polyself with a cursed wielded loadstone says `release your stone`, keeps it in inventory, clears wielded state, learns the curse, and creates no floor loadstone.
- Existing whirly sliparm coverage now expects the C-like dagger noun in the standalone weapon message.

## Remaining Gaps

- Two-weapon noun/plural logic and secondary-weapon release are still absent.
- Wielded weapon-tools and other non-weapon wielded objects still use the legacy deferred tool path.
- C `canletgo()` cases for leashes, worn saddles, and in-use objects are not modeled here.
- The JS noun helper only covers the weapon descriptions exercised by current parity tests; a generated object/skill table should eventually replace it.
- Water-walking and levitation boot terrain side effects from `Boots_off()` remain separate polyself fallout gaps. The next slice should add water-walking fallout in `addPolyselfBootsOffSideEffects()`.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "wielded dagger|wielded loadstone|drops worn gloves|whirly polyself drops no-hands gear|deferred unpaid wielded tool" test/shop-billing-helpers.test.mjs` (`8` matching tests passed)
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` (`1126/1126` tests passed)
- `node --test test/*.mjs` (`1223/1223` tests passed)
- `npm run score` (`44/44` passing)
