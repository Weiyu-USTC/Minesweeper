# Minesweeper efficiency experiments

Choosing openings before their borders eliminates one source of extra clicks. Selective flagging and chording can save additional clicks. On 500 paired boards of each standard difficulty, a conservative chord policy achieved mean efficiency of **115.04% on Beginner, 124.91% on Intermediate, and 127.79% on Expert**, compared with exactly 100% for ideal no-flag play.

These are **oracle experiments**: every policy knows all mine locations and openings. They isolate the cost of actions. They do not predict a human player's efficiency, speed, or win rate under hidden information. All three policies complete every board safely by construction.

## Results on identical boards

Each row averages 500 boards. Efficiency is `100 × 3BV ÷ counted actions`, where a reveal, a flag placement, and a chord each cost one action. The column headed mean efficiency averages the percentage separately for every board.

| Difficulty | Policy | Mean 3BV | Mean actions | Mean efficiency |
| --- | --- | ---: | ---: | ---: |
| Beginner 9 × 9 with 10 mines | Random safe cells | 15.868 | 18.396 | 87.44% |
| Beginner | Opening first, no flags | 15.868 | 15.868 | 100.00% |
| Beginner | Selective greedy chords | 15.868 | 13.658 | 115.04% |
| Intermediate 16 × 16 with 40 mines | Random safe cells | 65.366 | 77.586 | 84.55% |
| Intermediate | Opening first, no flags | 65.366 | 65.366 | 100.00% |
| Intermediate | Selective greedy chords | 65.366 | 52.178 | 124.91% |
| Expert 30 × 16 with 99 mines | Random safe cells | 174.202 | 202.494 | 86.09% |
| Expert | Opening first, no flags | 174.202 | 174.202 | 100.00% |
| Expert | Selective greedy chords | 174.202 | 136.242 | 127.79% |

The greedy policy used 13.93%, 20.18%, and 21.79% fewer total actions than ideal no-flag play on Beginner, Intermediate, and Expert respectively. It exceeded 100% efficiency on 66.6%, 99.4%, and 100% of those boards. A high efficiency gain is not the same numerical quantity as the percentage of clicks saved, because clicks are in the denominator.

The paired mean efficiency gains over ideal no-flag play were 15.04 percentage points on Beginner, 24.91 on Intermediate, and 27.79 on Expert. Approximate 95% sampling intervals were 13.65–16.42, 23.94–25.88, and 27.07–28.50 percentage points. These intervals describe variation among generated boards under this experiment; they do not capture uncertainty about human behavior or differences from an online site's board generator.

Pooling all 3BV and all actions before dividing gives a different summary from averaging percentages. The greedy policy's pooled efficiencies were 116.18%, 125.28%, and 127.86%. Both summaries are saved so neither is silently substituted for the other.

## Policies and generation

Every board starts by revealing the upper-left corner. That cell and its three neighbors are protected from mines, guaranteeing a zero opening. This is a deliberately fixed opening-safe setting. It is not a comparison of starting positions, and its results should not be transferred unchanged to a first-click-only-safe setting.

Mines are sampled from the remaining cells with a seeded Fisher–Yates shuffle. The generator is Mulberry32. For each difficulty, the experiment uses 500 consecutive seeds from `0x51A7E000 + difficultyIndex × 100000`, with difficulty indices 0, 1, and 2. The three policies then play the same layouts:

1. **Random safe cells.** Shuffle all safe cells, then reveal the next still-covered cell. This player never hits a mine, but sometimes clicks a numbered border that a later opening would have revealed automatically.
2. **Opening first, no flags.** Reveal one zero from each unopened zero component, then every remaining isolated safe number. Its action count equals 3BV exactly. No-flag players with hidden information cannot necessarily identify that sequence.
3. **Selective greedy chords.** Inspect already-revealed numbers. For each, count the independent remaining no-flag actions that a chord would complete, subtract the cost of missing adjacent flags and the chord itself, and choose the greatest strictly positive saving. Ties use row-major order. If no chord saves actions, take the next opening-first no-flag move. Previously placed flags are reused without a second charge.

The third policy counts distinct zero components and isolated numbered cells, **not the number of tiles that disappear**. A border number contributes no independent no-flag action, and several zeros from one opening contribute only one. Flag placements are included in the total. No flags are removed, since an oracle only flags real mines. There are no no-op clicks, although random safe reveals can be redundant relative to an eventual opening.

## Why this greedy policy cannot lose to ideal no-flag play

Let `R` be the number of remaining no-flag units: unopened zero components plus unrevealed safe numbers not adjacent to any zero. Initially, `R = 3BV`.

A fallback reveal costs one action and completes one unit. A chosen chord completes `k` distinct remaining units and costs `f + 1` actions, including its new flags. The policy permits it only when `k > f + 1`. Summing those inequalities over the whole game gives `total actions ≤ initial 3BV`, so this particular oracle policy always achieves at least 100% efficiency. All 1,500 simulated boards satisfy this invariant.

This guarantee depends on knowing which cells are mines and which concealed cells belong to zero components. It is a statement about action accounting, not a guaranteed practical strategy with hidden information.

## An exact counterexample to greedy optimization

A separate exhaustive breadth-first search solves a small board in the fewest possible actions under the same oracle action model. It shows that the conservative greedy rule is not globally optimal.

The board is 4 × 4 with three mines, generated with seed 1. The upper-left opening is fixed. An asterisk marks a mine; the other entries are full-information clues:

```text
0 1 1 1
1 2 * 1
* 3 2 2
1 2 * 1
```

Its 3BV is 10. The conservative greedy policy takes 10 actions. The exact optimum is **7 actions**, or **142.86% efficiency**:

| Action | Move | Row | Column |
| ---: | --- | ---: | ---: |
| 1 | Reveal | 1 | 1 |
| 2 | Reveal | 2 | 4 |
| 3 | Reveal | 4 | 1 |
| 4 | Flag | 2 | 3 |
| 5 | Chord | 2 | 4 |
| 6 | Flag | 4 | 3 |
| 7 | Chord | 3 | 3 |

Rows and columns in this table start at 1. The final chord reuses the first flag. The exact search explores every reachable combination of revealed safe cells and correctly flagged mines in order of action count; the first solved state is therefore minimal under this model. Removing a correct flag cannot enable a useful action in a board-known game, so omitting flag removals does not weaken that optimum. This 7-click claim is for this board and these controls, not a bound for larger boards.

The example explains why looking ahead matters: the most immediately rewarding action can miss setup reveals, neutral chords, and shared flags that make a later sequence cheaper.

## Reproduce and inspect

From the `Minesweeper` folder, with Node.js installed:

```sh
node research/experiment.cjs 500
node research/exact-small.cjs
```

The first script runs fixture checks and verifies safe completion, exact no-flag action counts, seeded reproducibility, mine counts, opening safety, and the greedy bound. It writes:

- [`data/results.json`](../data/results.json): experiment metadata, policy summaries, percentiles, and paired intervals.
- [`data/paired-results.json`](../data/paired-results.json): every seed, 3BV, action breakdown, and policy score for all 1,500 boards.
- [`data/results.js`](../data/results.js): the same summaries for the offline game's research view.

The second script writes [`data/exact-example.json`](../data/exact-example.json), including the mine layout and exact optimal action sequence. The independent experiment implementation does not import the playable game engine.

See [the analytical efficiency guide](efficiency.md) for how to apply these findings to visible clues and how to balance efficiency against time and survival.
