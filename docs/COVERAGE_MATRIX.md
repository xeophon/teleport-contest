# JS Port Coverage Matrix (audit, 2026-07-26)

Scope: `js/*.js` (~137k lines; 44 files) vs NetHack 5.0 `src/*.c` (~150 files, ~270k lines).
Note: `nethack-c/upstream/src` is not checked into the working tree (only `patches/` + build
scripts), so C sizes are rough upstream line counts. The port is *slice-based*, not file-based:
a single subsystem's code is distributed across `cmd.js` (80k), `allmain.js` (17k),
`mklev.js` (25k); C function names are often renamed, so absence of a C identifier is evidence,
not proof. 940+ parity-audit docs confirm the "narrow parity slice" working style.

## PORTED (functional; see js file)

| Subsystem (C file) | JS home |
|---|---|
| Game loop, newgame, hero state (allmain/hack) | `allmain.js` (moveloop turnovers, processMonsterTurns ~5.7k lines), `gstate.js` |
| Command dispatch, extended commands, prompts (cmd/getpos/pager) | `cmd.js` (menus, travel, getpos, #pray, #turn, #jump, wizard debug cmds) |
| RNG (rnd.c, isaac64.c, hacklib) | `rng.js`, `isaac64.js` (frozen), `hacklib.js` |
| Dungeon topology + branches (dungeon.c) | `dungeon.js` — all branches incl. Quest, Sokoban, Ludios, Vlad's, Gehennom, Elemental Planes |
| Level generation (mklev/mkmap/mkroom/sp_lev/mkmaze/extralev) | `mklev.js` — rooms, shops, mazes (bespoke mazewalk), Castle, Medusa, Oracle, Valley, Sanctum, Juiblex/Asmodeus/Baalzebub/Orcus, Wizard tower + fake wiz, Vlad's, Sokoban, Ludios/Knox, Astral incl. Rider spots, elemental planes |
| Save / restore / bones round-trip (save/restore/bones/files) | `save.js`, `storage.js` (frozen), `jsmain.js`; tests: `save-bones`, `bones-loading` |
| Display/vision/status (display.c, vision.c, botl) | `display.js`, `vision.js`, `game_display.js`, `terminal.js` (frozen) |
| Shops & billing (shk.c) | `cmd.js`/`mklev.js` — deepest coverage area (~750 audit docs); billing, robbery debt, shk healing/revenge slices |
| Offerings/sacrifice/gods basics (pray.c) | `offer.js` (575 lines) + `cmd.js`: altars, co-aligned rewards, artifact bestowal, alignment conversion, unicorn rule, Amulet offering, high altars |
| Prayer flow (pray.c dopray) | `cmd.js` prayConfirm → gods pleased/displeased/boons/thunder; #turn undead (role-gated), GODS_BY_ROLE pantheons |
| Spells (player) (spell.c) | `spell.js` (1.2k) + `cmd.js` — ~35/60 spells including the wand-duplicate group. Missing: darkness, create horde, charm undead, poison blast, a few more |
| Zaps/rays/self-zaps (zap.c) | `spell.js`, `cmd.js` — bhit/buzz/zapyourself equivalents, bounce, terrain hooks; partial breadth (see below) |
| Polyself (polyself.c) | `cmd.js` (~390 refs): becomeMonster, polymorph control, armor fallout matrix, rehumanize cases |
| Digging/terrain (dig.c, trap floor effects) | `dig.js` (775), traps broadly in `cmd.js` |
| Ice/water/lava basics (pooleffects spread) | `ice.js` (1k), `monster_liquid.js`, `fountain.js`, `mkmaze`-style movebubbles in `mklev.js` |
| Pets/food basics (dog/dogmove slices) | `allmain.js` (dogFood, gelatinous cube inventory eating, egg timers, figurines, tribute) |
| Quest scaffolding (quest.c/questpgr.c) | `cmd.js` quest text tables (~6 roles), nemesis/leader chat, portal hints, Amulet/questart tracking |
| Endgame skeleton (end.c/pray final) | `offer.js` offerAmulet(realAmuletOfYendor), Astral + Riders placed, disclose prompt ("possessions identified?") |
| Endgame fixed specials | Astral altar/Rider coords are static (C consumes rng) — flagged in `mklev.js:14145` |

## PARTIAL (works, big chunks missing)

| Subsystem (C, ~lines) | What's missing in JS |
|---|---|
| **monst.c / mondata.c data (~5.6k)** | `monster_data.js` has only the rndmonst spawn-pool tuples (~292 entries: name/glyph/level/speed/geno flags). No full attack chains, resistances/conveys-codes, sizes, MR per monster. AD_* attack-type codes never appear in JS; ~5–15 monsters have bespoke `attacks:` data (ape, crocodile, seduce/steal slices). **Foundation gap for combat correctness.** |
| **mhitu.c (~3.3k) monster→hero melee** | Exists slice-by-slice inside `cmd.js`/`allmain.js` (bespoke messages/rolls, e.g. soldier ant sting, parry, sticky). No generic attack-chain resolver; many passive/gaze/touch/engulf interaction details hardcoded per case. |
| **mhitm.c (~3.1k) monster-vs-monster** | Essentially absent as a system: no mattackm, no "X kills Y" messages, ring-of-conflict state tracked only as flags on hero. Symbols grep: all zero. |
| **mcastu.c (~1.9k) monster spellcasting** | Flags exist (`monsterCastsWizardSpells`, 'spellcaster'), Wizard harassment/summons exist; full cast table (psi bolt, drain, summon nasties targeting, touch-of-death sequencing, cleric healing/cure) not present as a system. |
| **muse.c (~2.6k) monsters using items** | Monster potion throws, projectiles with hit rules ported; defensive/offensive misc-item AI (wands of striking/death/teleportation, scrolls, poly traps) partial. |
| **polyself.c (~2.2k)** | Broad drop/armor/rehumanize coverage; form-specific abilities (breath weapons while poly'd, spit venom, #monst actions, gaze-use) thin. |
| **steed.c (~0.35k) + riding** | `#ride` exists (rideDirection), saddles/W_SADDLE in data; bucking, mount_savecanmove, jousting, kicking steeds, steed hit rules partial. No `can_ride`/landing-spot layer. |
| **were.c (~0.5k) lycanthropy** | Probe zero for were_change/counter_were; were-transformation/summon cycle not found (only string refs). |
| **steal.c (~0.9k)** | `adtyp: 'steal'/'seduce'` wired for a few monsters; nymph item-theft chains, foocubus seduction attribute game, monkey pickpocket partial. |
| **wizard.c (~0.6k)** | Wizard reappearance + covetous amulet chase partially ('tactics' 2 hits); clonewiz/Double Trouble, *interference, res* absent. |
| **endgame depth (end.c ~2.2k, rip/topten)** | `js/end.js` (done()/really_done() tables, formatkiller-article attribution, score arithmetic), `js/rip.js` (text tombstone, C centering math), `js/topten.js` (record list, topten/outentry flow) ported and wired into cmd.js death/#quit flows — see `docs/c-parity-audit/948-endgame-rip-topten-2026-07-30.md`. Ascension present but Riders/Astral dynamics static. |
| **trap.c (~5.9k)** | Many traps bespoke-ported (dart, bear, pits, rolling boulder, statue...); disarm/untrap breadth, trapdoors/teleport chains, magic trap effects, fire-trap damage queues partial; region-based effects (stinking cloud) minimal. |
| **region.c (~1.9k)** | `region.js` is 59 lines — stinking clouds, levitation regions on planes are bespoke hacks, expiring regions/gas damage not systematic. |
| **priest.c (~0.7k)** | Temples/priests placed; temple movement, shrine text, priest gifting/donation-absolution partial. |
| **engrave.c (~5.6k)** | Engraving storage + Elbereth melee-protection logic exist; scaring checks vs monster flags (SANITY of "won't step on Elbereth"), degradation, reading/writing breadth partial. |
| **options/dog.c scheduler/misc** | Options subset; dog follow-apport (fetch drop), pet starvation/growth timers partial (`monsterGrowUp` exists). |

## MISSING / not started (measured: name probes ~zero)

| C file (~lines) | Evidence |
|---|---|
| Monster AI data-driven core: full `mon.c` regrow/limbo/misc (~4.3k of unported detail) | meatmetal/msummon named fns absent; monsters use spawn-pool data only |
| `end.c` pretty-death stack: introspective disclose, rip.c, topten.c | ported as `js/end.js` + `js/rip.js` + `js/topten.js` (audit 948); remaining: disclosure `+` letters, escape/ascension valuable listing, hero-grave creation text, tt_oname/tt_doppel wiring, prscore CLI |
| `mcastu.c` full table, `muse.c` full AI, `mhitm.c` — see PARTIAL: systems unstarted, only hero-visible slices exist |
| `weapon.c` skill training depth (~2.8k): #enhance exists superficially (`_enhanced_<skill>` flags), no practice/advancement math parity |
| `dothrow.c`/`mthrowu.c` monster projectile AI depth (~2.6k+1.1k): bespoke per-throw slices; no generic launcher AI |
| Music/instrument effects (music.c, ~0.7k): instruments exist as objects/names; earthquake drum/frost horn effects partial |
| write.c scroll writing (~0.4k), mkname mplayer names (mplayer.c ~0.35k): mplayer flags exist, naming/minv not systematized |

## Biggest missing chunks, ranked by risk to gameplay parity

1. **Monster attack/resistance data (monst.c/mondata/mon.c core)** — every combat number, resistance, corpse-intrinsic depends on this; currently hand-rolled per slice.
2. **mhitm.c monster-vs-monster combat** — pets eating the dungeon, Elbereth-free pet play, ring of conflict: effectively absent.
3. **mcastu.c / muse.c monster magic & item AI** — mid/late-game difficulty drivers (liches, priests, wand-wielding orcs) barely modeled.
4. **mhitu.c generic matrix** — works for covered slices; any un-audited monster attack (gaze, touch, engulf detail, split/festilences) silently wrong.
5. **were.c + steal.c + full polyself abilities** — lycanthrope cycles, nymph/foocubus/monkey economies.
6. **end.c/rip/topten** — game-over UX; plays OK (death prompt exists) but disclosure/score mismatch upstream.
7. **trap.c disarms + region.c clouds** — interaction breadth for #untrap, stinking cloud, booby traps.
