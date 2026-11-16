# User Guide — Minesweeper Field Notes

A local Minesweeper game and an exploration of click efficiency. It combines a classic beveled board, familiar controls, detailed records, an adaptive course with placement questions and interactive practice, and playable classic, no-guess, no-flag, click-budget, Crossfield, and Knightfield modes.

**To play, double-click [Minesweeper.html](../Minesweeper.html), or use [Start Minesweeper.command](../Start%20Minesweeper.command) on macOS.** The game is bundled into one HTML file. Keep the research folder beside it to use the report links. [index.html](../index.html) is the unbundled development version and needs its neighboring script/style files. No installation, build step, account, or internet connection is needed for the game. The external source links in the research notes need internet access.

## What is included

| Item | Where to find it |
| --- | --- |
| Classic game, settings, live action counts | The field tab |
| Adaptive tutorial, placement quiz, pattern practice | [Minesweeper Tutorial.html](../Minesweeper%20Tutorial.html) |
| Academic efficiency paper, including first-click strategy | [PDF](../papers/efficiency/efficiency.pdf), [LaTeX source](../papers/efficiency/main.tex) |
| Academic paper on no-guess probability laws | [PDF](../papers/no-guess/no-guess.pdf), [LaTeX source](../papers/no-guess/main.tex) |
| Efficiency formula, chord calculator, simulation results, seven-action example | Efficiency lab tab |
| Game records, replay inspection, CSV export | Your record tab |
| Playable Crossfield and Knightfield | Other neighborhoods tab |
| Analytical strategy and official source links | [Efficiency analysis](../research/efficiency.md) |
| Reproducible methods, results, and limitations | [Experiment report](../research/experiments.md) |
| Relay and curated reference-solution budget proposals | [Variant designs](../research/variants.md) |
| Detailed experiment data | [Summary](../data/results.json), [paired boards](../data/paired-results.json), [exact example](../data/exact-example.json) |

## Playing and customizing

Reveal every safe cell to win; you do not need to flag every mine. A number counts mines in its neighborhood. A chord on a revealed number opens its unflagged neighbors when the surrounding flag count matches the number. Incorrect flags can make a chord hit a mine.

| Control | Action |
| --- | --- |
| Left click | Reveal; click a revealed number to chord when that option is enabled |
| Right click | Place or remove a flag |
| Both mouse buttons or middle button | Chord |
| Arrow keys on the board | Move focus |
| Enter or Space on a cell | Reveal, or use the selected single-click chord behavior |
| F on a cell | Toggle its flag |
| C on a cell | Chord |
| F2, smile button, or New field | Start a new field |
| Tap | Reveal, or flag when Flag mode is on |
| Touch and hold for about 420 ms | Toggle a flag |
| Escape | Leave focus view |

The controls panel offers 18–36 px cells, optional sounds, neighborhood highlighting, focus view, and an option to reveal covered cells on mouse press instead of release. The layout adapts to smaller screens; large boards can scroll.

Choose Beginner (9 × 9, 10 mines), Intermediate (16 × 16, 40), Expert (30 × 16, 99), or a custom board from 5–60 columns and 5–40 rows. The maximum mine count reserves room for the chosen first-reveal protection at any position.

**Safe cell only is the default for a new installation; classic play may begin with a number and may require guesses.** Existing saved preferences are preserved. **Opening guaranteed** protects the first revealed cell and its entire neighborhood. **Safe cell only** protects just that cell. Normal games generate their layout at the first effective reveal. A seed, dimensions, mine count, topology, first-click rule, and starting cell together determine that layout; the seed string alone is insufficient.

**Retry seed** holds the exact generated layout and starting location, marked by a green dot. Retry runs are labeled in the record. Re-entering a known seed manually is not independently detected as practice; these are personal records rather than verified competition results.

## Modes and hints

- **Classic:** eight touching neighbors, including diagonals.
- **No flags:** classic adjacency with flag placement disabled.
- **Click budget:** choose an action allowance before starting. Reveal, flag/unflag, chord, and no-change attempts each cost one. A run ends as `exhausted` when the budget is spent; winning on the last action counts as a win. It does not guarantee a solvable board or an attainable budget, so use it as a personal challenge or retry a known layout.
- **No guess:** searches for a board the built-in direct/subset constraint solver can finish from the marked top-left starting cell, using the selected safe-only or guaranteed-opening proposal. A successful certificate is a sequential deduction guarantee, not a promise that the full hidden layout was uniquely determined at the start. The interface limits this mode to 480 cells, 25% mine density, and 250 candidate boards per search. If no board is certified, it reports that outcome and does not silently start an uncertified game. Choose New field with another seed or change the settings to try again.
- **Crossfield:** only north, south, east, and west count.
- **Knightfield:** neighbors are chess-knight jumps. Hovering or focusing a cell shows its neighborhood.

Zero floods, clues, chords, hints, and the benchmark all use the selected neighborhood. Compare variant results within the same rules; their scores are not classic-board rankings.

**Logic hint** uses visible clues, subset deductions, and the total mine count. It does not inspect hidden mine locations or assume the player's flags are correct. A hint may identify a safe cell, a mine, or a provably incorrect flag. A returned move marks the run assisted; the hint does not perform the move. “No forced move found” means this solver stopped, not that guessing has been mathematically proved necessary.

Click budget is now an implemented game mode. The tutorial adds pattern-practice drills. Relay and a curated collection of budgets derived from reference solutions remain design proposals. [Minesweeper Online's arenas](https://minesweeper.online/help/arena) motivate separating speed, no-flag, and efficiency challenges; these local modes use their own stated rules.

## Timing and statistics

The timer starts on the first effective reveal and stops at a win, mine loss, or budget exhaustion. Flags and ineffective actions before that reveal count as actions but do not start the clock. Time continues while you change tabs, hide the browser tab, or inspect a replay during an active game. There is no pause control. Replay frames display their recorded time without advancing.

Elapsed time uses the browser's monotonic `performance.now()` clock and is displayed to three decimal places. The display requests updates every 33 ms; browser scheduling can delay a repaint. The classic counter shows whole seconds and caps at 999. Game actions have no artificial animation delay. Millisecond display precision is not a measurement of hardware input latency or proof of Windows-native speed parity.

Let B be total board 3BV, S be completed benchmark units, C be total counted actions, W be actions that changed nothing, and T be elapsed seconds.

| Metric | Definition and convention |
| --- | --- |
| Time / `seconds` | Elapsed time T; unfinished attempts retain time at recording |
| Total actions / `clicks` | C = reveals + flag actions + chords; one two-button chord is one game action |
| Reveals / `left` | Reveal attempts, including ineffective attempts on already open or flagged cells |
| Flag actions / `right` | Flag placements and removals; an attempt on an open cell also counts |
| Chords / `chord` | Chord attempts, including unsatisfied or unproductive chords |
| No-change actions / `wasted` | W: counted actions that change no cell; strategic waste can still change cells |
| Effective actions / `effective` | C − W; flags and removals count as changes |
| 3BV / `bbbv` | B: one per connected zero opening, plus one per safe numbered cell bordering no zero |
| Solved 3BV / `solvedBBBV` | S: completed openings, including their safe numbered boundaries, plus revealed isolated numbered cells |
| Efficiency | On wins, 100 × B/C; losses and abandoned attempts have no final efficiency score in the interface or CSV |
| 3BV per second / `bbbvs` | S/T; on a win S = B. For unfinished attempts this is completed work per second |
| Actions per second / `cps` | C/T |
| Effective action ratio / `effectiveActionRatio` in CSV | S/(C − W), a declared local ratio; the engine retains an internal `ioe` alias, without claiming verified online-statistic equivalence |
| Flags / `flags` | Flags currently placed, rather than cumulative flag actions |
| Safe cells cleared / `revealed` | Revealed non-mine cells; `safeCells` is board area minus mines |
| Openings / `openings` | Number of connected zero components |
| Isolated numbers / `isolated` | Safe numbered cells adjacent to no zero |
| Pointer travel / `pointerDistance` | Sampled movement within the board while playing, in CSS pixels; excludes movement outside it and is unavailable as a reconstructed replay measurement |
| Action budget | `actionLimit` and `actionsRemaining`; null outside Click budget mode |
| First-click rule | `firstClick`: safe cell only or guaranteed zero opening |
| Outcome and context | Win, mine loss, budget exhaustion, or abandonment; mode, difficulty, dimensions, mine count, seed, date, assistance, and retry status |
| Win rate | Wins divided by recorded attempts, including abandoned and budget-exhausted attempts |
| Best time and efficiency | Best values among filtered wins that used neither a hint nor the Retry command |

Rates with a zero denominator are zero in the data and may appear as a dash in the interface. Engine statistics for an unfinished run contain a provisional `efficiency = 100 × S/C`; the exported result table deliberately leaves final efficiency blank for losses and abandonments.

Full 3BV and 3BV rates are hidden during live play to avoid disclosing hidden opening structure. They become visible after a win, mine loss, or budget exhaustion if the board has been generated. Use records and CSV for additional metrics. Filter by mode and difficulty before comparing; custom sizes and first-reveal rules can still differ inside a filter.

The completed-game efficiency formula matches [Minesweeper Online's definition](https://minesweeper.online/help/efficiency). Detailed action accounting is this game's explicit convention. ZiNi variants, certified maximum efficiency, STNB, RQP, online estimated time, throughput, and correctness formulas are not implemented as purported website equivalents. Online accounts, social features, server rankings, anti-cheat verification, quests, equipment, and the site's economy are outside this local game's scope.

## Records, exports, and replays

Settings and up to the latest 1,000 recorded attempts are saved in this browser's local storage, subject to its storage quota. A win, mine loss, or budget exhaustion records immediately; starting a new field or leaving the page records a started unfinished attempt as abandoned. Untouched fields are not attempts. A browser returning to a cached page starts a fresh field if the former active attempt was already recorded as abandoned.

Browser storage is tied to the browser and page location. Private browsing, clearing site data, moving the folder, or changing browser can affect persistence. If storage is unavailable or full, the game reports it; export results you want to keep.

**Export statistics CSV** exports the currently filtered records. Text values that begin with spreadsheet formula prefixes are escaped, including user-entered seeds. The CSV contains measurements, not complete replay layouts, and is not a history-import format.

**Save replay** downloads a JSON file with the exact mine map, settings, action sequence, and timestamps. **Open replay** loads a local file up to 8 MB and provides an action slider. Replay inspection does not add a new score. Files are validated for basic format and legal action sequences, but are not tamper-proof competition evidence. They contain the full hidden layout, so reading one reveals the puzzle's answer.

The Efficiency lab's seven-action demonstration has deliberately illustrative timing of one second per action. Its 142.86% efficiency illustrates a known-board optimum; it is not a measured speed record.

## Verification and reproducing the research

The automated suite contains 30 tests: 22 engine and budget tests, plus 8 tutorial tests. Engine checks cover deterministic generation, first-click safety, flood behavior, wrong flags, chording, action counts, 3BV, replays, variant neighborhoods, hint soundness, no-guess certification, cancellation, and budget exhaustion. Its deduction check exhaustively enumerates the 3 × 3 revealed/hidden/mine state space. Tutorial checks validate pattern geometry in every rotation, residual clues, subset deductions, genuine ambiguity, placement recommendations, the one-, five-, and seven-action exercises, and zero probabilities.

Browser checks verified a no-guess win using visible-clue hints, history recording, replay rewind, and the exact demonstration. The added tutorial was checked through its full placement quiz, route recommendation, incorrect-move feedback, 1–2–1 and 1–2–2–1 drills, rotated practice, one-action opening and five-action chord challenges, probability controls, and persisted progress. The click-budget end state was also exercised in the browser. Replaying that demonstration with mouse and keyboard input produced three reveals, two flags, two chords, zero no-change actions, and 142.9% efficiency. Native simultaneous two-button input was not directly exercised; its event handling was reviewed separately. Browser checks used a local HTTP preview; the automation browser does not allow file URLs, so direct double-click launch was not exercised by automation. The bundle uses ordinary inline scripts and styles, without network dependencies.

The saved experiment compares three policies on 1,500 paired boards: 500 each at Beginner, Intermediate, and Expert, for 4,500 completed policy runs. All policies know the hidden layout. A separate exhaustive small-board search verifies a seven-action solution where the conservative greedy policy needs ten. These results demonstrate click economy under complete information; they do not establish human win rates or a universally best blind-play strategy.

Playing needs no development tools. To rerun the checks or regenerate research data with Node.js installed, open a terminal in the repository root and run the desired command:

```sh
node build-standalone.cjs
node --test tests/*.test.cjs
node research/experiment.cjs 500
node research/exact-small.cjs
```

The experiment commands overwrite their corresponding generated files under `data/`. The [experiment report](../research/experiments.md) documents seeds, assumptions, confidence intervals, and the distinction between mean and pooled efficiency.

## Tutorial and new research

Choose a learning level manually or answer the placement questions. The tutorial adjusts explanation depth and recommends lessons based on your answers; it is a training aid, not a validated rating system. Pattern diagrams declare their geometry and other known-safe cells: the digits 1-2-1 or 1-2-2-1 alone are insufficient for an arbitrary board. Teaching boards may show answers for explanation and are separate from unassisted game records.

Both papers are written in LaTeX and compiled with `pdflatex`. Their folders contain the simulation scripts, datasets, and figure sources. Rebuild the PDFs with `sh papers/build-papers.sh` on a system with a LaTeX installation. The initial-click study adds 90,000 generated boards; the no-guess study exactly enumerates every 4×4 board with three mines and separately checks rejection sampling. These are original research notes with stated models and limitations, not peer-reviewed publications.
