# Recoil Monster Collision Reveal And Invisible Marker

## Source

- `nethack-c/upstream/src/dothrow.c:842` through `:882`: `hurtle_step()` stops recoil when `m_at(x, y)` finds a monster. It saves the old glyph, clears `mundetected`, prints either `You find ... by bumping into ...` or `You bump into ...`, calls `wakeup(mon, FALSE)`, maps an invisible marker if the monster still cannot be spotted, calls `setmangry(mon, FALSE)`, runs bodily petrification checks, wakes nearby monsters with `wake_nearto(x, y, 10)`, and returns `FALSE`.
- `nethack-c/upstream/src/mon.c:4333` through `:4347`: `wakeup(mon, FALSE)` clears sleep/eating and reveals non-monster mimic appearances via `seemimic()`.
- `nethack-c/upstream/src/mon.c:4287` and `:4365`: `setmangry()` and `wake_nearto()` clear wait strategy state, while `wake_nearto()` wakes nearby sleepers without angering them.

## JS Change

- `js/cmd.js`: recoil monster collision now distinguishes pre-collision monster glyphs from hidden/object/furniture/invisible markers, reveals object/furniture mimics through the existing projectile mimic-reveal helper, maps an `I` marker for monsters still unspotted after unhide, and preserves the `I` remembered glyph after `newsym()`.
- Ordinary visible-capable monster bumps keep the existing non-damaging `You bump into a ...` behavior and still stop recoil before moving the hero.

## Tests

- `levitating hero-thrown ordinary weapon recoil bumps monster without damage`
- `levitating hero-thrown ordinary weapon recoil reveals object mimic by bumping`
- `levitating hero-thrown ordinary weapon recoil maps unspotted invisible monster`
- `levitating hero-thrown ordinary weapon recoil wakes nearby sleeper from bump square`

Focused verification:

```sh
node --test --test-reporter=dot --test-name-pattern "levitating hero-thrown ordinary weapon recoil (bumps monster without damage|reveals object mimic by bumping|maps unspotted invisible monster|wakes nearby sleeper from bump square)" test/shop-billing-helpers.test.mjs
```

## Remaining Follow-Up

- Full `setmangry(FALSE)` parity is still broader than this slice: visible wake/anger/growl messages, alignment/priest/shopkeeper/quest-guardian side effects, and peaceful bystander response remain incomplete.
- Bodily petrification on recoil monster collision is covered by `882-recoil-monster-collision-petrification-2026-06-09.md`.
- Recoil `wake_nearto()` buried-zombie disturbance is covered by `883-recoil-wake-nearto-buried-zombies-2026-06-09.md`; visible wake messages remain broader display/senses work.
