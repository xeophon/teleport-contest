# C Parity Audit 290: Tiphat Death Rider Speech

## Sources

- `nethack-c/upstream/include/monflag.h:50`: `MS_RIDER` is the Rider sound.
- `nethack-c/upstream/include/monsters.h:3144-3173`: Death, Pestilence, and Famine are humanoid Riders using `MS_RIDER`.
- `nethack-c/upstream/src/sounds.c:1193-1219`: Death-specific Rider order is carried novel notice, `rn2(3)` plus `Death_quote()`, `rn2(10)` Sandman, then the War fallback.
- `nethack-c/upstream/src/sounds.c:1222-1239`: Sandman is a normal `pline_msg`, while Death verbal messages are uppercased and emitted unquoted.
- `nethack-c/upstream/src/invent.c:1575-1584`: `u_have_novel()` scans only top-level inventory.
- `nethack-c/upstream/src/files.c:3430-3470` and `nethack-c/upstream/src/files.c:3648-3652`: `Death_quote()` reads the Death Quotes tribute section through C's non-repeating passage chooser.
- `nethack-c/upstream/src/do_name.c:1588-1623`: novel titles use the Terry Pratchett title table and consume `rn2(41)` even when a stored title index is reused.
- `nethack-c/upstream/dat/tribute:9825-9940`: Death Quotes contains 31 one-line passages.

## JS Changes

- Added source-derived tribute data for the 41 novel titles and 31 Death quotes.
- Randomly generated novel spellbooks now store `novelidx` and `novelTitle`, preserving the existing `rn2(41)` consumption while retaining the selected title without feeding the generic object-name path.
- `tipHatMonsterSound()` now infers Death as `rider` alongside Pestilence and Famine.
- Added Death-specific Rider handling for invisible directed helmet tipping:
  - top-level carried novel notice with `Deathnotice` tracking,
  - exact `rn2(3)` quote gate,
  - C-shaped quote passage state with the 30-passage sampling cap,
  - exact `rn2(10)` Sandman branch,
  - uppercase unquoted Death verbal output.
- Preserved visible humanoid `#tip` precedence, so visible Death still uses the rude humanoid response before Rider speech.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- `worn helmet tip infers invisible Death Rider fallback as uppercase unquoted speech`
- `worn helmet tip makes invisible Death read Sandman on the C no-quote branch`
- `worn helmet tip makes invisible Death notice a carried novel before RNG speech gates`
- `worn helmet tip makes invisible Death use source-backed quote passages`

These tests cover inference without explicit `MS_RIDER`, quote and no-quote RNG call shapes, top-level novel priority, `Deathnotice`, Sandman `pline_msg` formatting, and all-caps unquoted Death speech.

## Remaining Gaps

- This remains local to directed helmet tipping rather than a shared `domonnoise()`/`#chat` implementation.
- Full novel reading/pager tribute support is still broader than this slice.
- Priests, quest speakers, peaceful non-tame bribe, and broader seduction remain separate sound gaps.

## Verification

- `node --check js/cmd.js`
- `node --check js/mklev.js`
- `node --check js/tribute.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern='Death|Rider|Oracle|mumble' test/shop-billing-helpers.test.mjs` (`15` matching tests passed)
- `node --test test/shop-billing-helpers.test.mjs` (`1301/1301` tests passed)
- `node --test test/*.test.mjs` (`1398/1398` tests passed)
- `npm run score` (`44/44` replay sessions passed)
