// Generated from NetHack quest Lua by tools/generate-quest-levels.mjs.
// Copyright (c) 1989 by Jean-Christophe Collet
// Copyright (c) 1991 by M. Stephenson
// Copyright (c) 1991, 1993 by M. Stephenson, P. Winner
// NetHack may be freely redistributed. See nethack-c/upstream/dat/license.
// Preserve declaration order: geometry and population share the live RNG.
export const QUEST_LEVELS = {
  "Caveman": {
    "x-goal": {
      "source": "Cav-goal.lua",
      "operations": [
        [
          "level_init",
          {
            "style": "solidfill",
            "fg": " "
          }
        ],
        [
          "level_flags",
          "mazelevel"
        ],
        [
          "map",
          "                                                                            \n                          .....................                             \n                         .......................                            \n                        .........................                           \n                       ...........................                          \n                      .............................                         \n                     ...............................                        \n                    .................................                       \n                   ...................................                      \n                  .....................................                     \n                 .......................................                    \n                  .....................................                     \n                   ...................................                      \n                    .................................                       \n                     ...............................                        \n                      .............................                         \n                       ...........................                          \n                        .........................                           \n                         .......................                            \n                                                                            "
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              0,
              0,
              75,
              19
            ]
          },
          "lit"
        ],
        [
          "stair",
          "up"
        ],
        [
          "non_diggable",
          {
            "selection": "area",
            "args": [
              0,
              0,
              75,
              19
            ]
          }
        ],
        [
          "object",
          {
            "id": "mace",
            "x": 23,
            "y": 10,
            "buc": "blessed",
            "spe": 0,
            "name": "The Sceptre of Might"
          }
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "monster",
          {
            "id": "Chromatic Dragon",
            "x": 23,
            "y": 10,
            "asleep": 1
          }
        ],
        [
          "monster",
          "shrieker",
          26,
          13
        ],
        [
          "monster",
          "shrieker",
          25,
          8
        ],
        [
          "monster",
          "shrieker",
          45,
          11
        ],
        [
          "wallify"
        ]
      ]
    }
  },
  "Healer": {
    "x-goal": {
      "source": "Hea-goal.lua",
      "operations": [
        [
          "level_init",
          {
            "style": "solidfill",
            "fg": "P"
          }
        ],
        [
          "level_flags",
          "mazelevel"
        ],
        [
          "level_init",
          {
            "style": "mines",
            "fg": ".",
            "bg": "P",
            "smoothed": false,
            "joined": true,
            "lit": 1,
            "walled": false
          }
        ],
        [
          "map",
          ".P....................................PP.\nPP.......PPPPPPP....PPPPPPP....PPPP...PP.\n...PPPPPPP....PPPPPPP.....PPPPPP..PPP...P\n...PP..............................PPP...\n..PP..............................PP.....\n..PP..............................PPP....\n..PPP..............................PP....\n.PPP..............................PPPP...\n...PP............................PPP...PP\n..PPPP...PPPPP..PPPP...PPPPP.....PP...PP.\nP....PPPPP...PPPP..PPPPP...PPPPPPP...PP..\nPPP..................................PPP."
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              0,
              0,
              40,
              11
            ]
          },
          "lit"
        ],
        [
          "stair",
          "up",
          39,
          10
        ],
        [
          "non_diggable",
          {
            "selection": "area",
            "args": [
              0,
              0,
              40,
              11
            ]
          }
        ],
        [
          "object",
          {
            "id": "quarterstaff",
            "x": 20,
            "y": 6,
            "buc": "blessed",
            "spe": 0,
            "name": "The Staff of Aesculapius"
          }
        ],
        [
          "object",
          "wand of lightning",
          20,
          6
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "monster",
          {
            "id": "Cyclops",
            "x": 20,
            "y": 6,
            "peaceful": 0
          }
        ],
        [
          "monster",
          "rabid rat"
        ],
        [
          "monster",
          "rabid rat"
        ],
        [
          "monster",
          "rabid rat"
        ],
        [
          "monster",
          {
            "class": "r",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "r",
            "peaceful": 0
          }
        ],
        [
          "monster",
          "giant eel"
        ],
        [
          "monster",
          "giant eel"
        ],
        [
          "monster",
          "giant eel"
        ],
        [
          "monster",
          "giant eel"
        ],
        [
          "monster",
          "giant eel"
        ],
        [
          "monster",
          "giant eel"
        ],
        [
          "monster",
          "electric eel"
        ],
        [
          "monster",
          "electric eel"
        ],
        [
          "monster",
          "shark"
        ],
        [
          "monster",
          "shark"
        ],
        [
          "monster",
          {
            "class": ";",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "D",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "D",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "D",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "D",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "D",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "S",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "S",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "S",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "S",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "S",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "S",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "S",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "S",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "S",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "S",
            "peaceful": 0
          }
        ]
      ]
    }
  },
  "Ranger": {
    "x-goal": {
      "source": "Ran-goal.lua",
      "operations": [
        [
          "level_init",
          {
            "style": "solidfill",
            "fg": " "
          }
        ],
        [
          "level_flags",
          "mazelevel"
        ],
        [
          "map",
          "                                                                            \n  ...                                                                  ...  \n .......................................................................... \n  ...                                +                                 ...  \n   .     ............     .......    .                   .......        .   \n   .  .............................  .       ........   .........S..    .   \n   .   ............    .  ......     .       .      .    .......   ..   .   \n   .     .........     .   ....      +       . ...  .               ..  .   \n   .        S          .         .........   .S.    .S...............   .   \n   .  ...   .     ...  .         .........          .                   .   \n   . ........    .....S.+.......+....\\....+........+.                   .   \n   .  ...         ...    S       .........           ..      .....      .   \n   .                    ..       .........            ..      ......    .   \n   .      .......     ...            +       ....    ....    .......... .   \n   . ..............  ..              .      ......  ..  .............   .   \n   .     .............               .     ..........          ......   .   \n  ...                                +                                 ...  \n .......................................................................... \n  ...                                                                  ...  \n                                                                            "
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              0,
              0,
              75,
              19
            ]
          },
          "lit"
        ],
        [
          "stair",
          "up",
          19,
          10
        ],
        [
          "non_diggable",
          {
            "selection": "area",
            "args": [
              0,
              0,
              75,
              19
            ]
          }
        ],
        [
          "object",
          {
            "id": "bow",
            "x": 37,
            "y": 10,
            "buc": "blessed",
            "spe": 0,
            "name": "The Longbow of Diana"
          }
        ],
        [
          "object",
          "chest",
          37,
          10
        ],
        [
          "object",
          {
            "coord": [
              36,
              9
            ]
          }
        ],
        [
          "object",
          {
            "coord": [
              36,
              10
            ]
          }
        ],
        [
          "object",
          {
            "coord": [
              36,
              11
            ]
          }
        ],
        [
          "object",
          {
            "coord": [
              37,
              9
            ]
          }
        ],
        [
          "object",
          {
            "coord": [
              37,
              11
            ]
          }
        ],
        [
          "object",
          {
            "coord": [
              38,
              9
            ]
          }
        ],
        [
          "object",
          {
            "coord": [
              38,
              10
            ]
          }
        ],
        [
          "object",
          {
            "coord": [
              38,
              11
            ]
          }
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "door",
          "locked",
          12,
          8
        ],
        [
          "door",
          "closed",
          22,
          10
        ],
        [
          "door",
          "locked",
          24,
          10
        ],
        [
          "door",
          "closed",
          25,
          11
        ],
        [
          "door",
          "closed",
          32,
          10
        ],
        [
          "door",
          "closed",
          37,
          3
        ],
        [
          "door",
          "closed",
          37,
          7
        ],
        [
          "door",
          "closed",
          37,
          13
        ],
        [
          "door",
          "closed",
          37,
          16
        ],
        [
          "door",
          "closed",
          42,
          10
        ],
        [
          "door",
          "locked",
          46,
          8
        ],
        [
          "door",
          "closed",
          51,
          10
        ],
        [
          "door",
          "locked",
          53,
          8
        ],
        [
          "door",
          "closed",
          65,
          5
        ],
        [
          "monster",
          {
            "id": "Scorpius",
            "x": 37,
            "y": 10,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "forest centaur",
            "x": 36,
            "y": 9,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "forest centaur",
            "x": 36,
            "y": 10,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "forest centaur",
            "x": 36,
            "y": 11,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "forest centaur",
            "x": 37,
            "y": 9,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "forest centaur",
            "x": 37,
            "y": 11,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "forest centaur",
            "x": 38,
            "y": 9,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "mountain centaur",
            "x": 38,
            "y": 10,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "mountain centaur",
            "x": 38,
            "y": 11,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "mountain centaur",
            "x": 2,
            "y": 2,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "mountain centaur",
            "x": 71,
            "y": 2,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "mountain centaur",
            "x": 2,
            "y": 16,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "mountain centaur",
            "x": 71,
            "y": 16,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "forest centaur",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "forest centaur",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "mountain centaur",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "mountain centaur",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "C",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "C",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "scorpion",
            "x": 3,
            "y": 2,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "scorpion",
            "x": 72,
            "y": 2,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "scorpion",
            "x": 3,
            "y": 17,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "scorpion",
            "x": 72,
            "y": 17,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "scorpion",
            "x": 41,
            "y": 10,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "scorpion",
            "x": 33,
            "y": 9,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "scorpion",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "scorpion",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "s",
            "peaceful": 0
          }
        ],
        [
          "wallify"
        ]
      ]
    }
  },
  "Barbarian": {
    "x-goal": {
      "source": "Bar-goal.lua",
      "operations": [
        [
          "level_init",
          {
            "style": "solidfill",
            "fg": " "
          }
        ],
        [
          "level_flags",
          "mazelevel"
        ],
        [
          "map",
          "                                                                            \n                               .............                                \n                             ..................                             \n        ....              .........................          ....           \n      .......          ..........................           .......         \n      ......             ........................          .......          \n      ..  ......................................             ..             \n       ..                 .....................             ..              \n        ..                 ..................              ..               \n         ..         ..S...S..............   ................                \n          ..                   ........                ...                  \n       .........                                         ..                 \n       ......  ..                                         ...  ....         \n      .. ...    ..                             ......       ........        \n   ....          .. ..................        ........       ......         \n  ......          ......................       ......         ..            \n   ....             ..................              ...........             \n                      ..............                                        \n                        ...........                                         \n                                                                            "
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              0,
              0,
              75,
              19
            ]
          },
          "unlit"
        ],
        [
          "door",
          "locked",
          22,
          9
        ],
        [
          "door",
          "locked",
          26,
          9
        ],
        [
          "stair",
          "up",
          36,
          5
        ],
        [
          "altar",
          {
            "x": 63,
            "y": 4,
            "align": "noncoaligned",
            "type": "altar"
          }
        ],
        [
          "non_diggable",
          {
            "selection": "area",
            "args": [
              0,
              0,
              75,
              19
            ]
          }
        ],
        [
          "object",
          {
            "id": "luckstone",
            "x": 63,
            "y": 4,
            "buc": "blessed",
            "spe": 0,
            "name": "The Heart of Ahriman"
          }
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "monster",
          {
            "id": "Thoth Amon",
            "x": 63,
            "y": 4,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ogre",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ogre",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ogre",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ogre",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ogre",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ogre",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ogre",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ogre",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ogre",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ogre",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ogre",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ogre",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ogre",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ogre",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ogre",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ogre",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "O",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "O",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "rock troll",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "rock troll",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "rock troll",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "rock troll",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "rock troll",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "rock troll",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "rock troll",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "rock troll",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "T",
            "peaceful": 0
          }
        ],
        [
          "wallify"
        ]
      ]
    }
  }
};
