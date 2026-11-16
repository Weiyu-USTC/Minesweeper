Probability Laws for No-Guess Minesweeper Generation

main.tex is the editable seven-page paper. no-guess.pdf is the compiled result
linked from the game, tutorial, and repository README.

To rebuild both named PDFs from this folder:
  sh ../build-papers.sh

The shared build script writes temporary files into each paper's ignored
build/ directory and copies the final PDF into its paper folder.

To regenerate this paper's experiment and figures from this folder:
  node enumerate.cjs
  python3 figures.py
  sh ../build-papers.sh

Requirements: Node.js 24 or newer for the supported development environment;
Python with NumPy and Matplotlib for figure regeneration; a LaTeX installation
with the packages declared in main.tex. The shared script also compiles the
efficiency paper, which uses TikZ/PGFPlots. No external dataset, service, or
account is used by the experiments. Regeneration overwrites saved outputs.

The enumeration reads ../../engine.js to exercise the playable application's
actual subset deduction function. It writes data/results.json with full layout
acceptance masks, exact marginal probabilities, examples, and sampling results.
It saves hashes of the engine file and deduction function to identify the code
used for certification. Direct and exact solvers are implemented independently.

figures.py writes vector PDF and PNG copies under figures/. The figure PDFs are
inputs to the paper, so retain them even when excluding compilation outputs.
Rendered review pages and previous logs are local artifacts, not required to
rebuild or read the paper.

The probability theorems assume their stated ideal proposal laws. Exact finite
enumeration does not rely on pseudorandomness. The secondary Monte Carlo check
uses a fixed SHA-256 counter stream and bounded integer rejection; it is a
reproducible numerical check, not a claim of physically independent draws.
