# Minesweeper variations built around useful actions

Minesweeper combines hidden-state deduction with an unusual scoring opportunity: one well-prepared action can replace several ordinary actions. That suggests nearby games that retain its crisp click, reveal, and chord loop while changing what makes a good plan. Cross, Knight, and a user-selected Click budget are playable in the local game. The tutorial adds pattern practice. Relay and a curated budget-puzzle collection remain design proposals.

## Cross

Each number counts mines directly above, below, left, and right. Diagonal cells are unrelated. Zero floods and chords use the same four-neighbor rule. Reveal all safe cells to win; flags are optional.

The smaller neighborhood makes clues visually simple and lets players learn graph-based deduction without new controls. Diagonal-looking mine patterns from classic Minesweeper no longer apply. Since a clue touches fewer cells, many classic high-yield chords disappear, making economical flag placement more noticeable.

The baseline remains the number of zero components plus safe numbered cells that border no zero, computed using four-neighbor adjacency. Label it a **Cross benchmark**, or explicitly identify the rules wherever 3BV is displayed. Compare scores within Cross only. A 120% score on Cross and a 120% classic score have the same mathematical ratio but do not imply equal difficulty.

## Knight

Each number counts mines a chess knight's move away: two cells in one direction and one perpendicular, up to eight neighbors. Zero floods and chords follow these same jumps. A highlighted neighborhood preview is especially useful, because visual closeness no longer indicates adjacency.

The player must reason about overlapping networks instead of contiguous patches. An apparently distant flag can support several local clues. This turns the flag-reuse lesson into the central visual puzzle. Smaller starting boards keep the changed geometry readable.

Use the same graph-based baseline construction and declare the Knight rules in records. A zero flood may reveal disconnected-looking screen regions that are connected by knight jumps. This is intended behavior. Shared seeds should always include the topology, dimensions, mine count, first-click rule, and initial position; the seed string alone does not define a comparable board.

## Relay

**Design proposal.** Every safe revealed number becomes a relay. A satisfied relay can trigger other already satisfied neighboring relays in one planned activation, but each new flag still costs an action. Before committing, the player previews the connected activation path using only revealed clues and flags.

This makes multi-step reuse explicit. A flag that looks unprofitable locally may connect two relay groups and save several future activations. The challenge becomes choosing a small number of reliable setup actions.

To keep the rules learnable, activation propagates only through revealed relays, never through newly revealed clues during the same action. Incorrect flags can still trigger a mine, preserving the need for deduction. Track reveals, flag changes, relay activations, chain length, mistakes, and total action cost. Keep the classic no-flag benchmark as a clearly labeled reference, but do not compare Relay records to classic efficiency records: the action set is stronger.

Prototype evaluation should test whether players can predict the activation path before clicking. If they cannot, reduce chain radius or offer a one-step mode before adding further mechanics.

## Budget

**Implemented base mode:** choose a fixed action allowance, with ordinary safe-first or zero-first generation. Every counted action spends the allowance; a non-winning final action ends the attempt. The budget is not certified achievable and the board need not be NG. Retries and hints retain their practice/assistance labels.

**Curated puzzle extension (design proposal).** Give each puzzle a fixed action allowance, a guaranteed logical starting position, and a target to reveal every safe cell. The budget counts reveals, flag changes, and chords equally. No ticking clock is needed.

The player sees a concrete reason to preserve an opening or reuse a flag. Optional hints explain a deduction without revealing hidden truth; using one marks the solution assisted. A replay comparison shows where the action budget went.

Set the initial budget from a recorded valid solution plus a small allowance. Call that solution a reference, not an optimum, unless exhaustive search proves optimality. Easy levels can offer enough slack for straightforward no-flag play; advanced levels can require at least one profitable chord. Reaching zero actions ends the attempt, and replaying the same puzzle is explicitly practice.

Score by actions remaining and assistance status. Also retain time, benchmark units, and the reference solution length for research. This avoids rewarding unsafe record hunting and makes a 1-action improvement easy to understand.

## Common design rules

All four ideas benefit from instant feedback, consistent action counting, deterministic replay, and a visible explanation of the current neighborhood. Keep deduction separate from hidden-information evaluation: an after-game analyzer may know the whole board, while a live hint must justify its move using only visible information.

For each new topology, generate numbers, zero floods, chord targets, the solver, and the benchmark from the same adjacency function. Mixing classic flood rules with Knight clue rules would create a different and confusing game. Tests should verify that every winning replay clears precisely the safe cells, that first-click protection follows the selected neighborhood, and that a wrong flag can make a chord lose when it opens a mine.

## Pattern practice

The tutorial provides repeated small pattern exercises with rotations. Its purpose is to learn the geometric conditions behind deductions, then make recognition quicker. A correct classification is supported by visible constraints; merely matching a sequence of digits is not enough.

The separation of efficiency, no-flag, and speed challenges is also seen in [Minesweeper Online's arena categories](https://minesweeper.online/help/arena). The local Click budget and tutorial practice are original adaptations, not replicas of the online arena rules.
