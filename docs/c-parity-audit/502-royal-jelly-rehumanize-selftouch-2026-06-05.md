# C Parity Audit 502: Royal Jelly Rehumanize Self-Touch

Cursed royal jelly can damage a polymorphed hero enough to force `rehumanize()`. If the lost monster form was petrification-resistant and the restored hero is not, C immediately retouches equipment after the form change. A bare-handed hero wielding a cockatrice corpse therefore dies from self-touching that corpse, with stoning wording and no extra generic `You die...` appended to the final death message.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The canary uses the existing live eating flow, delayed one-bite royal-jelly post-effect path, and a normal inventory wielded-corpse object.

## Source Anchors

- `nethack-c/upstream/src/eat.c:2529` through `:2542`: royal jelly post-effects run after the rotten-food bite; cursed jelly weakens strength, applies HP damage, and calls `rehumanize()` when active polyself HP is exhausted.
- `nethack-c/upstream/src/polyself.c:1395` through `:1416`: `rehumanize()` prints the return-to-human-form line, aborts only if the old form is not healthy enough, then retouches equipment and calls `selftouch()` when petrification resistance was lost without gloves.
- `nethack-c/upstream/src/polyself.c:33`: the retouch reason prefix is `No longer petrify-resistant, you`.
- `nethack-c/upstream/src/trap.c:3888` through `:3891`: `selftouch()` detects a wielded petrifying corpse and prints the corpse-touch message.
- `nethack-c/upstream/src/trap.c:3844` through `:3850`: `instapetrify()` sets the stoning death and prints `You turn to stone...`.
- `nethack-c/upstream/src/topten.c:96`: petrification death causes are recorded with the `petrified by` prefix.

## JS Changes

- `js/cmd.js`
  - Snapshots whether polyself stoning resistance is being lost before clearing `_polyself_form`.
  - After successful rehumanization, checks for no gloves plus a wielded or alternate petrifying corpse and appends the C-shaped self-touch stoning messages.
  - Sets the death cause to `petrified by a cockatrice corpse`, marks the bones body as a statue, and preserves the royal-jelly use-up ordering by leaving the eaten jelly in inventory on this fatal post-effect path.
  - Carries structured fatal metadata through both immediate and delayed royal-jelly finishers so petrification suppresses the generic `You die...` line and can clear pending stoning if lifesaving intervenes.

## Tests

- `cursed royal jelly rehumanize selftouches wielded cockatrice corpse`
  - Builds a stone-golem polyself at 1 HP, wields a cockatrice corpse, then eats cursed royal jelly through the command path.
  - Pins message order: rotten food, weak strength, return to human form, self-touch reason, and `You turn to stone...`.
  - Asserts no generic `You die...`, death-more command mode, zero move cost, statue bones body, cleared polyself state, preserved corpse wielding, and retained royal jelly on fatal post-effect.

## Scope Notes

- This slice only wires the royal-jelly finishers to the new rehumanize self-touch metadata. Other `rehumanizeAfterPolyselfDeath()` callers, including potion-vapor lycanthropy and shared upward-object falling damage, still need their broader fatal/lifesaving message pipelines audited before expanding the same stoning metadata there.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot --test-name-pattern "royal jelly changes a killer bee egg|carried royal jelly uses|cursed royal jelly rehumanizes|rehumanize selftouches" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot` - pass
- `npm run score` - pass, 44/44 public sessions
- `git diff --check` - pass
