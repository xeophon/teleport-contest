# C Parity Audit 338: Polyself Water-Walking Lava Fallout

## Sources

- `nethack-c/upstream/src/polyself.c:1273-1284`: boot-incompatible polyself forms call `Boots_off()` before `dropp(otmp)`.
- `nethack-c/upstream/src/do_wear.c:280-290`: removing water-walking boots on lava, without levitation, flight, ceiling clinging, cancelled donning, or lava recursion, makes the boots known and calls `spoteffects(TRUE)`.
- `nethack-c/upstream/src/trap.c:6794-6811`: `lava_effects()` consumes `d(6,6)` before deciding whether fire resistance or water walking allows survival.
- `nethack-c/upstream/src/trap.c:6871-6880`: without fire resistance and without remaining water walking, the hero falls into molten lava.
- `nethack-c/upstream/src/trap.c:6931-6935`: fatal lava fallout reports burning to a crisp.
- `nethack-c/upstream/src/trap.c:6964-6980`: fire-resistant survivors without water walking become trapped in lava, get the slight-burn message, and lose one HP if above one.

## JS Changes

- Added the water-walking boot lava branch to polyself boot fallout, reusing the existing `Boots_off()`-before-drop ordering.
- Ordinary non-fire-resistant lava now learns the boots, consumes the C `d(6,6)` damage roll, removes the boots before they can be dropped, records molten-lava death, and routes through the local lava death prompt.
- Fire-resistant lava survival now learns the boots, consumes `d(6,6)`, assigns a lava trap, reports slight burning, and lets the normal post-`Boots_off()` drop path burn ordinary flammable boots on lava.

## Tests

- `successful centaur polyself losing water walking boots over lava burns before drop` covers ordinary fatal lava, no floor boot drop, identity learning, death cause, and the lava death prompt.
- `successful centaur polyself losing water walking boots over lava with fire resistance sinks` covers the survival branch with lava trapping, one HP damage, no fatal message, and no surviving ordinary boot object.

## Remaining Gaps

- Full `lava_effects()` inventory destruction, lifesaving/explore-mode rescue, fireproof boot survival details, and repeated trapped-lava turns remain broader terrain work.
- Levitation-boot loss over lava still needs a separate `float_down()`-backed slice.
