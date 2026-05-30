# C Parity Audit 208: Saved Corpse Monster Traits

## Sources

- `nethack-c/upstream/src/mkobj.c:2056-2169`: `mkcorpstat()` stores saved monster traits for corpses or statues whenever the caller passes `mtmp`, while `ptr` still controls visible corpse species.
- `nethack-c/upstream/src/mon.c:549-626` and `nethack-c/upstream/src/mon.c:898-903`: corpse creation passes `mtmp` for vampire/undead corpse-species overrides and for `KEEPTRAITS()` cases: shopkeepers, tame monsters, unique/reviver corpses, quest leaders, and seduction monsters.
- `nethack-c/upstream/src/zap.c:713-820`: `montraits()` restores saved traits with `NO_MINVENT | MM_NOWAIT | MM_NOCOUNTBIRTH | MM_NOTAIL | MM_NOMSG`, keeps the fresh monster ID, heals to full HP, clears unsafe status, and ignores stale saved inventory.
- `nethack-c/upstream/src/zap.c:884-1030`: `revive()` uses saved corpse traits when available and only applies corpse gender flags when no saved traits are present.
- `nethack-c/upstream/src/do.c:2299-2314`: `zombify_mon()` frees saved object-monster traits before replacing the corpse species with the zombie form.

## JS Changes

- `mkcorpstat(CORPSE, ...)` now stores sanitized saved monster traits in `oextra.omonst` when the caller provides a monster, matching the existing statue path.
- Runtime monster corpse creation now only passes a monster to `mkcorpstat()` for modeled `KEEPTRAITS()` cases: shopkeepers, tame/pet monsters, unique/nemesis/Rider monsters, quest leaders, seduction monsters, trolls/revivers, and visible corpse-species overrides.
- Corpse timer revival now prefers saved monster data over visible corpse species, restores saved traits with fresh ID/no inventory/full HP, clears hidden/mimic and unsafe status, and skips corpse-gender override when traits are restored.
- Corpse zombification now discards saved monster traits before switching the corpse to its zombie species.
- Book-of-the-Dead corpse revival uses the same saved-trait restoration path as timed/floor revival.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- `mkcorpstat()` stores saved traits for corpses and excludes stale inventory.
- Ordinary corpse creation does not save transient monster traits.
- Tame/troll corpse creation keeps saved traits.
- Corpse timer revival restores saved traits over visible corpse species.
- Corpse timer zombification discards saved traits.
- Floor Rider corpse pickup restores saved traits before billing/inventory routing.

## Remaining Gaps

- Full shopkeeper/priest/guard `mextra` restoration is not modeled yet.
- Exact C level-restoration RNG and `monhp_per_lvl()` growth remain approximated by deterministic full-heal restoration.
- Broader corpse storage contexts such as ice boxes, bones cleanup, and sacrifice/stethoscope side effects are still caller-led follow-ups.
- Statue-trap activation still only handles the first visible statue object at the square instead of C's loop over same-square statues when unique animation fails.

## Verification

- `node --check js/cmd.js`
- `node --check js/mklev.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "mkcorpstat stores saved monster traits|ordinary monster corpse creation|tame monster corpse creation|corpse timer revival prefers saved monster traits|corpse timer zombification discards saved monster traits|saved-trait Rider" test/shop-billing-helpers.test.mjs`
- `node --test test/shop-billing-helpers.test.mjs` (`1079/1079`)
- `node --test test/*.mjs` (`1176/1176`)
- `npm run score` (`44/44`, including `seed0030-ten-diverse-deaths.session.json` at `RNG 105529/105529`, `Screen 1953/1953`)
