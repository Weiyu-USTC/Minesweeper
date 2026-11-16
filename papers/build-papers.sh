#!/bin/sh
# Run from anywhere, with a LaTeX installation that provides pdflatex.
set -eu
paper_root=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
for paper_name in efficiency no-guess; do
  (
    cd "$paper_root/$paper_name"
    mkdir -p build
    pdflatex -interaction=nonstopmode -halt-on-error -output-directory=build -jobname="$paper_name" main.tex
    pdflatex -interaction=nonstopmode -halt-on-error -output-directory=build -jobname="$paper_name" main.tex
    cp "build/$paper_name.pdf" "$paper_name.pdf"
  )
done
