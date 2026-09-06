// Generated from NetHack quest Lua by tools/generate-quest-levels.mjs.
// Copyright (c) 1989 by Jean-Christophe Collet
// Copyright (c) 1991 by M. Stephenson
// Copyright (c) 1991, 1993 by M. Stephenson, P. Winner
// Copyright (c) 1992 by Dean Luick
// Copyright (c) 1991-2 by M. Stephenson
// Copyright (c) 1991,92 by M. Stephenson
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
    },
    "x-loca": {
      "source": "Cav-loca.lua",
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
          "mazelevel",
          "hardfloor"
        ],
        [
          "map",
          "                                                                            \n    .............                     ...........                           \n   ...............                   .............                          \n    .............                  ...............        ..........        \n     ...........                    .............      ...............      \n        ...                                    ...   ..................     \n         ...                ..........          ... ..................      \n          ...              ............          BBB...................     \n           ...              ..........          ......................      \n            .....                 ..      .....B........................    \n  ....       ...............      .    ........B..........................  \n ......     .. .............S..............         ..................      \n  ....     ..                ...........             ...............        \n     ..  ...                                    ....................        \n      ....                                      BB...................       \n         ..                 ..                 ..  ...............          \n          ..   .......     ....  .....  ....  ..     .......   S            \n           ............     ....... ..  .......       .....    ...  ....    \n               .......       .....   ......                      .......    \n                                                                            "
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
          "region",
          {
            "region": [
              52,
              6,
              73,
              15
            ],
            "lit": 1,
            "type": "ordinary",
            "irregular": 1
          }
        ],
        [
          "door",
          "locked",
          28,
          11
        ],
        [
          "stair",
          "up",
          4,
          3
        ],
        [
          "stair",
          "down",
          73,
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
            "id": "bugbear",
            "x": 2,
            "y": 10,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "bugbear",
            "x": 3,
            "y": 11,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "bugbear",
            "x": 4,
            "y": 12,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "bugbear",
            "x": 2,
            "y": 11,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "bugbear",
            "x": 16,
            "y": 16,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "bugbear",
            "x": 17,
            "y": 17,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "bugbear",
            "x": 18,
            "y": 18,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "bugbear",
            "x": 19,
            "y": 16,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "bugbear",
            "x": 30,
            "y": 6,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "bugbear",
            "x": 31,
            "y": 7,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "bugbear",
            "x": 32,
            "y": 8,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "bugbear",
            "x": 33,
            "y": 6,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "bugbear",
            "x": 34,
            "y": 7,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "bugbear",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "bugbear",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "bugbear",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "bugbear",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "h",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "H",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "hill giant",
            "x": 3,
            "y": 12,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "hill giant",
            "x": 20,
            "y": 17,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "hill giant",
            "x": 35,
            "y": 8,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "hill giant",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "hill giant",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "hill giant",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "hill giant",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "H",
            "peaceful": 0
          }
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
    },
    "x-loca": {
      "source": "Hea-loca.lua",
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
          "mazelevel",
          "hardfloor"
        ],
        [
          "level_init",
          {
            "style": "mines",
            "fg": ".",
            "bg": "P",
            "smoothed": true,
            "joined": true,
            "lit": 1,
            "walled": false
          }
        ],
        [
          "map",
          "PPPPPPPPPPPPP.......PPPPPPPPPPP\nPPPPPPPP...............PPPPPPPP\nPPPP.....-------------...PPPPPP\nPPPPP....|.S.........|....PPPPP\nPPP......+.|.........|...PPPPPP\nPPP......+.|.........|..PPPPPPP\nPPPP.....|.S.........|..PPPPPPP\nPPPPP....-------------....PPPPP\nPPPPPPPP...............PPPPPPPP\nPPPPPPPPPPP........PPPPPPPPPPPP"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              0,
              0,
              30,
              9
            ]
          },
          "lit"
        ],
        [
          "region",
          {
            "region": [
              12,
              3,
              20,
              6
            ],
            "lit": 1,
            "type": "temple",
            "filled": 1
          }
        ],
        [
          "door",
          "closed",
          9,
          4
        ],
        [
          "door",
          "closed",
          9,
          5
        ],
        [
          "door",
          "locked",
          11,
          3
        ],
        [
          "door",
          "locked",
          11,
          6
        ],
        [
          "stair",
          "up",
          4,
          4
        ],
        [
          "stair",
          "down",
          20,
          6
        ],
        [
          "non_diggable",
          {
            "selection": "area",
            "args": [
              11,
              2,
              21,
              7
            ]
          }
        ],
        [
          "altar",
          {
            "x": 13,
            "y": 5,
            "align": "chaos",
            "type": "shrine"
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
          "kraken"
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
    },
    "x-loca": {
      "source": "Ran-loca.lua",
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
          "mazelevel",
          "hardfloor"
        ],
        [
          "map",
          "              .......  .........  .......              \n     ...................       ...................     \n  ....        .......             .......        ....  \n...    .....     .       .....       .     .....    ...\n.   .......... .....  ...........  ..... ..........   .\n.  ..  ..... ..........  .....  .......... .....  ..  .\n.  .     .     .....       .       .....     .     .  .\n.  .   .....         .............         .....   .  .\n.  .  ................  .......  ................  .  .\n.  .   .....            .......            .....   .  .\n.  .     .    ......               ......    .     .  .\n.  .     ...........   .........   ...........     .  .\n.  .          ..........       ..........          .  .\n.  ..  .....     .       .....       .     .....  ..  .\n.   .......... .....  ...........  ..... ..........   .\n.      ..... ..........  .....  .......... .....      .\n.        .     .....       .       .....     .        .\n...   .......           .......           .......   ...\n  ..............     .............     ..............  \n      .......  .......  .......  .......  .......      "
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              0,
              0,
              54,
              19
            ]
          },
          "lit"
        ],
        [
          "stair",
          "up",
          25,
          5
        ],
        [
          "stair",
          "down",
          27,
          18
        ],
        [
          "non_diggable",
          {
            "selection": "area",
            "args": [
              0,
              0,
              54,
              19
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
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "trap",
          "spiked pit"
        ],
        [
          "trap",
          "spiked pit"
        ],
        [
          "trap",
          "teleport"
        ],
        [
          "trap",
          "teleport"
        ],
        [
          "trap",
          "arrow"
        ],
        [
          "trap",
          "arrow"
        ],
        [
          "monster",
          {
            "id": "wumpus",
            "x": 27,
            "y": 18,
            "peaceful": 0,
            "asleep": 1
          }
        ],
        [
          "monster",
          {
            "id": "giant bat",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "giant bat",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "giant bat",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "giant bat",
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
          "monster",
          {
            "class": "s",
            "peaceful": 0
          }
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
  },
  "Rogue": {
    "x-loca": {
      "source": "Rog-loca.lua",
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
          "             ----------------------------------------------------   --------\n           ---.................................................-    --.....|\n         ---...--------........-------.......................---     ---...|\n       ---.....-      ---......-     ---..................----         --.--\n     ---.....----       --------       --..................--         --..| \n   ---...-----                       ----.----.....----.....---      --..|| \n----..----                       -----..---  |...---  |.......---   --...|  \n|...---                       ----....---    |.---    |.........-- --...||  \n|...-                      ----.....---     ----      |..........---....|   \n|...----                ----......---       |         |...|.......-....||   \n|......-----          ---.........-         |     -----...|............|    \n|..........-----   ----...........---       -------......||...........||    \n|..............-----................---     |............|||..........|     \n|------...............................---   |...........|| |.........||     \n|.....|..............------.............-----..........||  ||........|      \n|.....|.............--    ---.........................||    |.......||      \n|.....|.............-       ---.....................--|     ||......|       \n|-S----------.......----      --.................----        |.....||       \n|...........|..........--------..............-----           ||....|        \n|...........|............................-----                |....|        \n------------------------------------------                    ------        "
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              0,
              0,
              75,
              20
            ]
          },
          "lit"
        ],
        [
          "stair",
          "up"
        ],
        [
          "stair",
          "down"
        ],
        [
          "non_diggable",
          {
            "selection": "area",
            "args": [
              0,
              0,
              75,
              20
            ]
          }
        ],
        [
          "object",
          {
            "id": "scroll of teleportation",
            "x": 11,
            "y": 18,
            "buc": "cursed",
            "spe": 0
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
            "id": "leprechaun",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "l",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "guardian naga",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "guardian naga",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "guardian naga",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "guardian naga",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "guardian naga",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "guardian naga",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "guardian naga",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "N",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "N",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "N",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "chameleon",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "chameleon",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "chameleon",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "chameleon",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "chameleon",
            "peaceful": 0
          }
        ]
      ]
    }
  },
  "Valkyrie": {
    "x-loca": {
      "source": "Val-loca.lua",
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
          "mazelevel",
          "hardfloor",
          "icedpools",
          "noflip"
        ],
        [
          "level_init",
          {
            "style": "mines",
            "fg": ".",
            "bg": "I",
            "smoothed": true,
            "joined": false,
            "lit": 1,
            "walled": false
          }
        ],
        [
          "map",
          "PPPPxxxx                      xxxxPPPPPx\nPLPxxx                          xPPLLLPP\nPPP    .......................    PPPLLP\nxx   ............................   PPPP\nx  ...............................  xxxx\n  .................................   xx\n....................................   x\n  ...................................   \nx  ..................................  x\nxx   ..............................   PP\nxPPP  ..........................     PLP\nxPLLP                             xxPLLP\nxPPPPxx                         xxxxPPPP"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              0,
              0,
              39,
              12
            ]
          },
          "lit"
        ],
        [
          "stair",
          "up",
          48,
          14
        ],
        [
          "stair",
          "down",
          20,
          6
        ],
        [
          "non_diggable",
          {
            "selection": "area",
            "args": [
              0,
              0,
              39,
              12
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
          "trap",
          "fire"
        ],
        [
          "trap",
          "fire"
        ],
        [
          "trap",
          "fire"
        ],
        [
          "trap",
          "fire"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "monster",
          "fire ant"
        ],
        [
          "monster",
          "fire ant"
        ],
        [
          "monster",
          "fire ant"
        ],
        [
          "monster",
          "fire ant"
        ],
        [
          "monster",
          "fire ant"
        ],
        [
          "monster",
          "fire ant"
        ],
        [
          "monster",
          "fire ant"
        ],
        [
          "monster",
          "fire ant"
        ],
        [
          "monster",
          "fire ant"
        ],
        [
          "monster",
          "fire ant"
        ],
        [
          "monster",
          "fire ant"
        ],
        [
          "monster",
          "fire ant"
        ],
        [
          "monster",
          "fire ant"
        ],
        [
          "monster",
          "fire ant"
        ],
        [
          "monster",
          "fire ant"
        ],
        [
          "monster",
          "fire ant"
        ],
        [
          "monster",
          "fire ant"
        ],
        [
          "monster",
          "a"
        ],
        [
          "monster",
          {
            "class": "H",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "fire giant",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "fire giant",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "fire giant",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "fire giant",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "fire giant",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "fire giant",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "fire giant",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "H",
            "peaceful": 0
          }
        ]
      ]
    }
  },
  "Knight": {
    "x-loca": {
      "source": "Kni-loca.lua",
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
          "mazelevel",
          "hardfloor"
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
          "xxxxxxxxx......xxxx...........xxxxxxxxxx\nxxxxxxx.........xxx.............xxxxxxxx\nxxxx..............................xxxxxx\nxx.................................xxxxx\n....................................xxxx\n.......................................x\n........................................\nxx...................................xxx\nxxxx..............................xxxxxx\nxxxxxx..........................xxxxxxxx\nxxxxxxxx.........xx..........xxxxxxxxxxx\nxxxxxxxxx.......xxxxxx.....xxxxxxxxxxxxx"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              0,
              0,
              39,
              11
            ]
          },
          "lit"
        ],
        [
          "region",
          {
            "region": [
              9,
              2,
              27,
              9
            ],
            "lit": 1,
            "type": "temple",
            "filled": 2
          }
        ],
        [
          "stair",
          "up",
          38,
          0
        ],
        [
          "stair",
          "down",
          18,
          5
        ],
        [
          "altar",
          {
            "x": 17,
            "y": 5,
            "align": "neutral",
            "type": "shrine"
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
          "object"
        ],
        [
          "trap",
          "magic",
          8,
          11
        ],
        [
          "trap",
          "magic",
          9,
          11
        ],
        [
          "trap",
          "magic",
          10,
          11
        ],
        [
          "trap",
          "magic",
          11,
          11
        ],
        [
          "trap",
          "magic",
          12,
          11
        ],
        [
          "trap",
          "magic",
          13,
          11
        ],
        [
          "trap",
          "magic",
          14,
          11
        ],
        [
          "trap",
          "magic",
          15,
          11
        ],
        [
          "trap",
          "magic",
          16,
          11
        ],
        [
          "trap",
          "magic",
          20,
          11
        ],
        [
          "trap",
          "magic",
          21,
          11
        ],
        [
          "trap",
          "magic",
          22,
          11
        ],
        [
          "trap",
          "magic",
          23,
          11
        ],
        [
          "trap",
          "magic",
          24,
          11
        ],
        [
          "trap",
          "magic",
          25,
          11
        ],
        [
          "trap",
          "magic",
          26,
          11
        ],
        [
          "trap",
          "magic",
          27,
          11
        ],
        [
          "trap",
          "magic",
          28,
          11
        ],
        [
          "trap",
          "magic",
          0,
          3
        ],
        [
          "trap",
          "magic",
          0,
          4
        ],
        [
          "trap",
          "magic",
          0,
          5
        ],
        [
          "trap",
          "magic",
          0,
          6
        ],
        [
          "trap",
          "magic",
          6,
          0
        ],
        [
          "trap",
          "magic",
          7,
          0
        ],
        [
          "trap",
          "magic",
          8,
          0
        ],
        [
          "trap",
          "magic",
          9,
          0
        ],
        [
          "trap",
          "magic",
          10,
          0
        ],
        [
          "trap",
          "magic",
          11,
          0
        ],
        [
          "trap",
          "magic",
          12,
          0
        ],
        [
          "trap",
          "magic",
          13,
          0
        ],
        [
          "trap",
          "magic",
          14,
          0
        ],
        [
          "trap",
          "magic",
          19,
          0
        ],
        [
          "trap",
          "magic",
          20,
          0
        ],
        [
          "trap",
          "magic",
          21,
          0
        ],
        [
          "trap",
          "magic",
          22,
          0
        ],
        [
          "trap",
          "magic",
          23,
          0
        ],
        [
          "trap",
          "magic",
          24,
          0
        ],
        [
          "trap",
          "magic",
          25,
          0
        ],
        [
          "trap",
          "magic",
          26,
          0
        ],
        [
          "trap",
          "magic",
          27,
          0
        ],
        [
          "trap",
          "magic",
          28,
          0
        ],
        [
          "trap",
          "magic",
          29,
          0
        ],
        [
          "trap",
          "magic",
          30,
          0
        ],
        [
          "trap",
          "magic",
          31,
          0
        ],
        [
          "trap",
          "magic",
          32,
          0
        ],
        [
          "trap",
          "anti magic"
        ],
        [
          "trap",
          "anti magic"
        ],
        [
          "trap",
          "anti magic"
        ],
        [
          "trap",
          "anti magic"
        ],
        [
          "trap",
          "anti magic"
        ],
        [
          "trap",
          "anti magic"
        ],
        [
          "trap",
          "anti magic"
        ],
        [
          "monster",
          {
            "id": "quasit",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "quasit",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "quasit",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "quasit",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "quasit",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "quasit",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "quasit",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "quasit",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "quasit",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "quasit",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "quasit",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "quasit",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "quasit",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "quasit",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "quasit",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "quasit",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "quasit",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "i",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "j",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ochre jelly",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ochre jelly",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ochre jelly",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ochre jelly",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ochre jelly",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ochre jelly",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ochre jelly",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "j",
            "peaceful": 0
          }
        ]
      ]
    }
  }
};
