globalThis.MinesweeperExperiment = {
  "study": "Oracle comparison of Minesweeper action economy",
  "version": 1,
  "sampleSizePerDifficulty": 500,
  "totalBoards": 1500,
  "firstClick": 0,
  "firstClickPolicy": "zero-safe corner: clicked cell and its three neighbors excluded from mine placement",
  "seedScheme": "uint32(0x51A7E000 + difficultyIndex*100000 + boardIndex)",
  "generator": "Mulberry32 with Fisher-Yates shuffle via Math.floor(rng*(i+1)); finite PRNG precision applies",
  "information": "All policies know every mine and zero component. Results measure click mechanics, not a solver or player under uncertainty.",
  "actions": "1 per left reveal, flag placement, or chord. No no-op or unflag actions; random-safe can reveal opening borders prematurely. Flags are charged when placed, even if reused.",
  "ciMethod": "Paired board differences, sample mean ± 1.96 sample standard error; an approximate sampling interval under the generator.",
  "results": [
    {
      "difficulty": "Beginner",
      "width": 9,
      "height": 9,
      "mines": 10,
      "boards": 500,
      "mean3BV": 15.868,
      "policies": {
        "random-safe": {
          "mean3BV": 15.868,
          "meanClicks": 18.396,
          "meanEfficiency": 87.438356,
          "pooledEfficiency": 86.257882,
          "minEfficiency": 38.461538,
          "maxEfficiency": 100,
          "medianEfficiency": 89.473684,
          "p10Efficiency": 70.333333,
          "p90Efficiency": 100,
          "meanLeft": 18.396,
          "meanRight": 0,
          "meanChord": 0
        },
        "opening-first": {
          "mean3BV": 15.868,
          "meanClicks": 15.868,
          "meanEfficiency": 100,
          "pooledEfficiency": 100,
          "minEfficiency": 100,
          "maxEfficiency": 100,
          "medianEfficiency": 100,
          "p10Efficiency": 100,
          "p90Efficiency": 100,
          "meanLeft": 15.868,
          "meanRight": 0,
          "meanChord": 0
        },
        "greedy-chord": {
          "mean3BV": 15.868,
          "meanClicks": 13.658,
          "meanEfficiency": 115.037945,
          "pooledEfficiency": 116.180993,
          "minEfficiency": 100,
          "maxEfficiency": 200,
          "medianEfficiency": 111.111111,
          "p10Efficiency": 100,
          "p90Efficiency": 138.461538,
          "meanLeft": 10.98,
          "meanRight": 1.18,
          "meanChord": 1.498
        }
      },
      "paired": {
        "comparator": "greedy-chord minus opening-first on identical boards",
        "meanEfficiencyGainPercentagePoints": 15.037945,
        "approximate95PercentCI": [
          13.653606,
          16.422283
        ],
        "meanClicksSaved": 2.21,
        "approximate95PercentClicksSavedCI": [
          1.989667,
          2.430333
        ],
        "percentBoardsAbove100": 66.6,
        "percentClicksSavedPooled": 13.927401
      }
    },
    {
      "difficulty": "Intermediate",
      "width": 16,
      "height": 16,
      "mines": 40,
      "boards": 500,
      "mean3BV": 65.366,
      "policies": {
        "random-safe": {
          "mean3BV": 65.366,
          "meanClicks": 77.586,
          "meanEfficiency": 84.545375,
          "pooledEfficiency": 84.249736,
          "minEfficiency": 60.674157,
          "maxEfficiency": 100,
          "medianEfficiency": 85.135135,
          "p10Efficiency": 74.645785,
          "p90Efficiency": 93.757716,
          "meanLeft": 77.586,
          "meanRight": 0,
          "meanChord": 0
        },
        "opening-first": {
          "mean3BV": 65.366,
          "meanClicks": 65.366,
          "meanEfficiency": 100,
          "pooledEfficiency": 100,
          "minEfficiency": 100,
          "maxEfficiency": 100,
          "medianEfficiency": 100,
          "p10Efficiency": 100,
          "p90Efficiency": 100,
          "meanLeft": 65.366,
          "meanRight": 0,
          "meanChord": 0
        },
        "greedy-chord": {
          "mean3BV": 65.366,
          "meanClicks": 52.178,
          "meanEfficiency": 124.908241,
          "pooledEfficiency": 125.27502,
          "minEfficiency": 100,
          "maxEfficiency": 169.565217,
          "medianEfficiency": 124,
          "p10Efficiency": 110.330753,
          "p90Efficiency": 140,
          "meanLeft": 37.27,
          "meanRight": 6.52,
          "meanChord": 8.388
        }
      },
      "paired": {
        "comparator": "greedy-chord minus opening-first on identical boards",
        "meanEfficiencyGainPercentagePoints": 24.908241,
        "approximate95PercentCI": [
          23.935633,
          25.880849
        ],
        "meanClicksSaved": 13.188,
        "approximate95PercentClicksSavedCI": [
          12.62385,
          13.75215
        ],
        "percentBoardsAbove100": 99.4,
        "percentClicksSavedPooled": 20.175626
      }
    },
    {
      "difficulty": "Expert",
      "width": 30,
      "height": 16,
      "mines": 99,
      "boards": 500,
      "mean3BV": 174.202,
      "policies": {
        "random-safe": {
          "mean3BV": 174.202,
          "meanClicks": 202.494,
          "meanEfficiency": 86.089577,
          "pooledEfficiency": 86.028228,
          "minEfficiency": 71.859296,
          "maxEfficiency": 97.175141,
          "medianEfficiency": 86.313904,
          "p10Efficiency": 80.486643,
          "p90Efficiency": 91.792369,
          "meanLeft": 202.494,
          "meanRight": 0,
          "meanChord": 0
        },
        "opening-first": {
          "mean3BV": 174.202,
          "meanClicks": 174.202,
          "meanEfficiency": 100,
          "pooledEfficiency": 100,
          "minEfficiency": 100,
          "maxEfficiency": 100,
          "medianEfficiency": 100,
          "p10Efficiency": 100,
          "p90Efficiency": 100,
          "meanLeft": 174.202,
          "meanRight": 0,
          "meanChord": 0
        },
        "greedy-chord": {
          "mean3BV": 174.202,
          "meanClicks": 136.242,
          "meanEfficiency": 127.785491,
          "pooledEfficiency": 127.862186,
          "minEfficiency": 109.836066,
          "maxEfficiency": 156.410256,
          "medianEfficiency": 127.204086,
          "p10Efficiency": 117.636739,
          "p90Efficiency": 139.398207,
          "meanLeft": 94.16,
          "meanRight": 18.722,
          "meanChord": 23.36
        }
      },
      "paired": {
        "comparator": "greedy-chord minus opening-first on identical boards",
        "meanEfficiencyGainPercentagePoints": 27.785491,
        "approximate95PercentCI": [
          27.071167,
          28.499814
        ],
        "meanClicksSaved": 37.96,
        "approximate95PercentClicksSavedCI": [
          36.918368,
          39.001632
        ],
        "percentBoardsAbove100": 100,
        "percentClicksSavedPooled": 21.790795
      }
    }
  ]
};
