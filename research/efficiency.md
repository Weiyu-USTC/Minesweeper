# Minesweeper efficiency and how to improve it

For high efficiency, optimize the number of useful actions: preserve zero openings, place flags when they enable worthwhile chords, and reuse those flags across neighboring clues. For fast play, also consider how much thinking and pointer travel each saved click requires. The two objectives overlap but are not identical.

This exploration uses Minesweeper Online's public definition of efficiency, then develops the mathematics and practical implications. The accompanying [reproducible experiment](experiments.md) isolates click economy on the same boards; it does not measure human skill or winning probability. Sources were checked on October 25, 2026.

## The score and its baseline

Minesweeper Online defines efficiency as the board's 3BV divided by the clicks used to complete it. Expressed as a percentage:

**Efficiency = 100 × B / C**, where B is 3BV and C is the counted actions.

A 50-3BV board completed in 40 actions earns 125%; completing it in 60 actions earns 83.33%. Flags consume actions, while chording can save actions. [Official efficiency explanation](https://minesweeper.online/help/efficiency)

3BV is the minimum number of reveals needed without flagging, assuming knowledge of which cells to open. It is a benchmark for a particular board, rather than a guarantee that a player can discover the right moves. The site permits single-click chords on satisfied clues and supports traditional two-button chording. Its published speed-ranking 3BV thresholds are 5, 30, and 100 for Beginner, Intermediate, and Expert. [Official gameplay and 3BV explanation](https://minesweeper.online/help/gameplay)

The following construction explains the baseline. Group zero cells into connected components using the game's adjacency rule. Clicking any zero reveals its component and the numbered cells bordering it. Count one action per component, plus one for each safe numbered cell bordering no zero component:

**B = number of zero components + number of isolated numbered cells.**

Each component requires at least one direct reveal in a no-flag solution; each isolated number also requires its own reveal. Conversely, opening every zero component first and then every isolated number attains that count. This proves the formula. A number bordering several components is still revealed automatically and is never an extra unit.

“Minimum” here is restricted to no-flag reveals. It is not the minimum over all permitted controls. A chord can clear several of those units at once, so 100% is not a ceiling when flags and chords are available.

Conversely, a winning no-flag run has C ≥ B, so its efficiency cannot exceed 100% under this action model. Knowing all the mine locations does not alone ensure 100%: revealing an opening's numbered edge before its zero can still spend unnecessary actions.

## What the best move means

For a fixed board, B is constant. Maximizing efficiency is therefore exactly equivalent to minimizing C. Different boards have different B and different chord opportunities, so comparing a player's highest single score mixes skill with layout selection and luck.

Suppose a contemplated chord needs **f new flags** and clears work that otherwise needs **k independent remaining no-flag actions**. If those alternatives leave equivalent useful work afterward, its net saving is:

**saved actions = k − f − 1.**

Use the chord if this quantity is positive; it breaks even at zero. Existing correctly placed flags have no new placement cost. A flag that supports several chords should be charged once, across the whole plan.

| Situation | Individual reveals | Flags plus chord | Net saving |
| --- | ---: | ---: | ---: |
| Three independent safe cells, one new flag | 3 | 2 | 1 |
| Two independent safe cells, one new flag | 2 | 2 | 0 |
| Two independent safe cells, flags already present | 2 | 1 | 1 |
| Five visible safe cells belonging to one unopened zero region, one new flag | 1 | 2 | −1 |

The fourth row is why counting visible cells can mislead. If one zero reveal would clear them all, they represent one unit of work. A chord opening several boundary numbers, while missing the zero behind them, can look productive without reducing the final action count.

The rule is a local comparison, not a complete solver. A reveal can expose new information or a clue needed to set up a better chord. Two individually promising chords can overlap. One otherwise unprofitable flag can become valuable because two later chords reuse it. A global plan must account for all these interactions.

For a small completely known board, the exact optimum can in principle be found by shortest-path search over revealed-cell and flag states, with unit-cost reveal, flag, unflag, and chord edges. For real play, the hidden layout is unknown; the decision state must instead include every layout compatible with the visible clues. Finding a cheap route with hindsight does not establish that the route was knowable during play.

This is why there is no defensible universal instruction such as “always flag,” “never flag,” or “always chord.” For ordinary efficiency play, a useful policy is selective flagging combined with no-flag play. For a fixed complete board there is a finite optimum, but it depends on the board, the allowed controls, and the available information.

The included exhaustive search gives a concrete counterexample to the greedy rule. On a 4 × 4 board with mines at row/column (2, 3), (3, 1), and (4, 3), and a fixed first reveal at (1, 1), the benchmark is 10. The conservative greedy policy uses 10 actions. An exact search over the fully known board finds a 7-action solution, or 142.86% efficiency:

1. Reveal (1, 1).
2. Reveal (2, 4).
3. Reveal (4, 1).
4. Flag (2, 3).
5. Chord (2, 4).
6. Flag (4, 3).
7. Chord (3, 3).

Coordinates here are one-based, in (row, column) order. This example proves that setup order can beat a locally greedy action sequence. Its seven-action optimum is specific to the declared known-board model and initial click; it is not a claim that all those choices follow from the clues available during an ordinary game. See [the exact search](exact-small.cjs) and [recorded result](../data/exact-example.json).

## A practical routine

1. **Prove safety first.** Treat logical deductions and speculative opening predictions differently. A guessed zero that saves two clicks when correct can still lose the entire game.
2. **Look for openings before clearing their edges.** When the clues prove a zero exists, opening it first can prevent redundant numbered-cell reveals. When zero status is uncertain, weigh the uncertainty explicitly.
3. **Count net chord savings.** Compare useful work with new flags plus the chord itself. A flag is a tool for a plan; recognizing a mine does not by itself require placing one.
4. **Scan adjacent clues before committing.** A flag may enable two chords. A cheap setup reveal may expose the more valuable chord. Avoid opening the same useful region twice in your mental accounting.
5. **Switch to individual reveals when flags do not pay.** Late in a game, a known safe cell often costs less to open than to prepare for a chord.
6. **Review wasted actions separately from strategic waste.** A click that changes nothing is mechanical waste. An unnecessary flag or an opening-edge reveal may change the board but still increase the final count.
7. **Practice on fixed seeds, then test on fresh ones.** Repeated boards teach action planning. Fresh boards test whether that planning transfers without layout memory.

The site's [guide index](https://minesweeper.online/help/guides) links dedicated efficiency, no-flag, opening, and ZiNi guides for additional worked positions.

## Why corners often help at the start

Here is an analytical result under explicit assumptions, not a claim about every online generator. Let a board contain N cells and M mines. Assume the clicked cell is guaranteed safe and the mines are uniformly distributed among the remaining N−1 cells. If the cell has d neighbors, the probability that it is zero is:

**P(zero | first cell safe) = choose(N−1−d, M) / choose(N−1, M).**

For classic square adjacency, d is 3 in a corner, 5 on a non-corner edge, and 8 in the interior. Fewer neighbors make zero more likely.

| Board | Corner zero | Edge zero | Interior zero |
| --- | ---: | ---: | ---: |
| Beginner 9 × 9, 10 mines | 66.63% | 50.35% | 32.57% |
| Intermediate 16 × 16, 40 mines | 59.80% | 42.29% | 25.01% |
| Expert 30 × 16, 99 mines | 49.85% | 31.25% | 15.45% |

These numbers say which position is more likely to yield a zero under that model. They do not prove the greatest expected opening size, highest win probability, best eventual efficiency, or fastest finish. A middle opening can expose a different frontier and more useful information.

If the generator guarantees a zero by excluding the clicked cell and all its neighbors, the zero probability is 100% at every permitted starting cell. The corner argument then no longer distinguishes starts. If the very first click may hit a mine, its survival probability under an unconditioned uniform layout is (N−M)/N at every location, while its probability of both surviving and being zero is choose(N−d−1, M)/choose(N, M).

## Efficiency and speed answer different questions

Let time be T seconds. Then clicks per second is C/T and completed-board 3BV per second is B/T. Therefore:

**3BV/s = (efficiency / 100) × clicks/s.**

This identity does not make the quantities independent. Taking longer to identify a clever chord can raise efficiency while lowering speed. For example, 50 3BV in 40 clicks and 30 seconds is 125% efficiency and 1.67 3BV/s; 50 clicks in 20 seconds is 100% efficiency and 2.50 3BV/s.

Saving one action improves efficiency from 100B/C to 100B/(C−1), a gain of **100B/[C(C−1)] percentage points**. The effect is often conspicuous on small boards. For training, record efficiency, time, win rate, and assistance status together, grouped by difficulty and rules. A strategy that produces prettier scores only by losing more often is a different tradeoff from a safe click reduction.

There are several distinct objectives worth keeping separate:

| Objective | Suitable measurement |
| --- | --- |
| Economy on one known board | Fewest actions for a successful solution |
| Reliable play on fresh boards | Win rate plus efficiency of wins |
| Speed | Time and 3BV/s within comparable board classes |
| Long-run efficient progress | Total completed 3BV divided by all attempted actions, with the treatment of losses declared |
| Record hunting | Best score, accompanied by number of attempts |

For statistical comparisons, use the same board samples and opening rule. Report both mean per-game efficiency and pooled efficiency, **100 × sum(B) / sum(C)**; those are generally different quantities. If you report winners only, also report attempted boards and losses. Avoid discarding inconvenient boards after looking at results.

## Statistics and compatibility boundaries

The local game uses the official completed-game efficiency formula. Its detailed accounting is a declared local convention, because the public help pages do not specify every edge case, including ineffective clicks, pre-start flags, and per-button event timing. A “click” in these reports means a game action; a two-button chord is one chord action rather than two independently charged button presses.

The most useful transparent statistics are elapsed time, left/right/chord counts, total actions, ineffective actions, opened safe cells, 3BV, solved 3BV, efficiency, clicks/s, 3BV/s, openings, flags, outcomes, and seed/replay information. “Solved 3BV” should count completed opening units and revealed isolated numbers, not merely the fraction of safe cells opened. An exact 3BV-based live display can reveal information about hidden openings, so the unassisted game's full benchmark belongs in the result screen.

Online advanced labels are not automatically interchangeable. In particular, an output called ZiNi must identify the algorithm used; a heuristic solution length is not a certified global optimum. Do not label a greedy estimate “maximum efficiency.” Do not invent substitutes for STNB, RQP, estimated time, throughput, or correctness and present them as exact website equivalents. The local game's documented metrics are the supported comparison surface; online accounts, economy, competitive verification, and rankings are separate systems.

## What the experiment establishes

The companion [experiment report](experiments.md) compares policies with complete board knowledge. That controlled setup can establish whether action selection alone changes efficiency and whether a chord heuristic improves on a no-flag baseline on the sampled boards. It cannot establish that a human can infer every chosen move, that one heuristic is globally best, or that the reported efficiency transfers unchanged to blind play.

Across 500 paired boards per difficulty, with a guaranteed zero opening in the top-left corner, the measured mean per-board efficiencies were:

| Difficulty | Random safe reveals | Opening-first no flags | Selective greedy chords |
| --- | ---: | ---: | ---: |
| Beginner | 87.44% | 100.00% | 115.04% |
| Intermediate | 84.55% | 100.00% | 124.91% |
| Expert | 86.09% | 100.00% | 127.79% |

Every policy knew the mine locations and won every board. The first column isolates redundant opening-edge reveals; it is not a random guessing policy. The third policy accepts positive immediate savings, then falls back to opening-first reveals. Its improvement demonstrates available action savings on this sample, not optimal human performance. Full results, uncertainty intervals, and the seed scheme are in [the experiment report](experiments.md) and [machine-readable results](../data/results.json).

The actionable conclusion supported by the formula and local comparison is to combine opening-aware no-flag reveals with chords whose total savings exceed their setup cost. Treat positive local savings as a practical heuristic, and use replay review to discover missed multi-move plans.
