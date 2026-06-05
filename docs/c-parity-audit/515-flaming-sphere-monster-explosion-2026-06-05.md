# C Parity Audit 515: Flaming Sphere Monster Explosion

Live hostile flaming spheres now carry C-shaped `AT_EXPL`/`AD_FIRE` attack metadata and detonate from the normal monster-turn adjacent attack path. The implementation preserves the two-roll C shape (`explmu()` attack damage roll, then `mon_explodes()` explosion damage roll), removes the exploding monster before hero injury, routes the hero through shared fire-explosion inventory damage, and keeps old-form water-vapor death/life-saving metadata intact.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. Canary seeds only set deterministic fixture RNG.

## Source Anchors

- `nethack-c/upstream/include/monsters.h:350`: flaming sphere monster definition.
- `nethack-c/upstream/include/monsters.h:352`: flaming sphere uses `ATTK(AT_EXPL, AD_FIRE, 4, 6)`.
- `nethack-c/upstream/src/mhitu.c:65`: `hitmsg()` maps `AT_EXPL` to explosion wording.
- `nethack-c/upstream/src/mhitu.c:839`: adjacent hostile `AT_EXPL` attacks call `explmu()`.
- `nethack-c/upstream/src/mhitu.c:1591`: `explmu()` handles monster explosions in the hero's face.
- `nethack-c/upstream/src/mhitu.c:1602`: `explmu()` rolls `d(damn, damd)` before message/explosion dispatch.
- `nethack-c/upstream/src/mhitu.c:1606`: stale-target explosions use the "thin air" message.
- `nethack-c/upstream/src/mhitu.c:1617`: fire explosions dispatch to `mon_explodes()`.
- `nethack-c/upstream/src/explode.c:1019`: `mon_explodes()` builds monster explosion state.
- `nethack-c/upstream/src/explode.c:1043`: monster is killed/removed before `explode()`.
- `nethack-c/upstream/src/explode.c:1046`: `explode()` receives the monster attack dice for the real blast.
- `nethack-c/upstream/src/explode.c:590`: hero injury is processed after other explosion effects.
- `nethack-c/upstream/src/explode.c:601`: caught-in-explosion wording is emitted for monster-induced explosions.
- `nethack-c/upstream/src/explode.c:608`: invulnerability zeroes hero explosion HP damage but does not stop the explosion.
- `nethack-c/upstream/src/explode.c:614`: fire explosions route through armor/item fire damage before HP loss.

## JS Changes

- `js/mklev.js`
  - Adds flaming sphere attack metadata from the C monster row: 4d6 `expl`/`fire`.
- `js/allmain.js`
  - Intercepts `aatyp: 'expl'`/`adtyp: 'fire'` before ordinary melee to-hit.
  - Consumes the C-shaped first 4d6 roll and second 4d6 explosion roll without `rnd(20)`.
  - Removes the exploding monster, records the vanquish, and applies hero blast effects based on real blast distance rather than only the remembered target.
  - Lets invulnerable heroes reach the explosion branch instead of triggering ordinary "pulls back" attack blocking.
- `js/cmd.js`
  - Exports the shared fire-explosion inventory/life-saving helpers for monster-turn use.
  - Keeps invulnerable explosion victims unharmed by the base blast while preserving fire inventory side effects.

## Tests

- `hostile flaming sphere adjacent attack explodes without to-hit roll`
  - Asserts two aggregate `d(4,6)` calls, no `rnd(20)`, monster removal, and hero HP damage from the second roll.
- `hostile flaming sphere false-target explosion still catches adjacent hero`
  - Uses an unseen stale adjacent target to assert "thin air" wording while the real adjacent hero still takes blast damage.
- `invulnerable hero does not prevent flaming sphere explosion`
  - Asserts the monster explodes and is removed, the hero is caught and unharmed, and ordinary invulnerable attack-pullback text is absent.
- `monster flaming sphere explosion inventory vapor uses lifesaving for old-form death`
  - Drives a live monster turn into blessed-water fire-vapor rehumanization, unhealthy old-form death, and amulet life saving.

## Follow-Ups

- Add shocking sphere `AT_EXPL`/`AD_ELEC` after reusable electric explosion inventory damage exists.
- Gas spore `AT_BOOM`/`AD_PHYS` is death-triggered rather than adjacent-attack-triggered and should remain a separate lifecycle slice.
- Full 3x3 `explode()` effects for floor objects and nearby monsters remain broader work. This slice covers the live exploder removal and hero caught/damage/life-saving path.

## Verification

- `node --check js/allmain.js`
- `node --check js/cmd.js`
- `node --check js/mklev.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "flaming sphere" test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot`
- `npm run score` (`44/44 passing`)
