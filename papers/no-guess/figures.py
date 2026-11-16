"""Create publication figures from exact enumeration; no external datasets."""
import json
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parent
DATA = json.loads((ROOT / "data/results.json").read_text())
OUT = ROOT / "figures"
OUT.mkdir(exist_ok=True)
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 10,
                     "axes.titlesize": 11, "axes.labelsize": 10,
                     "pdf.fonttype": 42, "ps.fonttype": 42,
                     "axes.spines.top": False, "axes.spines.right": False})

case = next(s for s in DATA["scenarios"] if s["startLabel"] == "corner" and s["protection"] == "zero")
fig, axes = plt.subplots(1, 2, figsize=(7.2, 3.15), layout="constrained")
for ax, values, title in zip(axes, [case["baselineMarginal"], case["methods"]["subset"]["marginal"]],
                             ["Proposal: all 220 eligible layouts", "Accepted: 165 subset-solvable layouts"]):
    a = np.array(values).reshape(4, 4)
    image = ax.imshow(a, vmin=0, vmax=.32, cmap="Blues")
    ax.set_title(title, pad=10)
    ax.set_xticks(range(4), ["1", "2", "3", "4"])
    ax.set_yticks(range(4), ["1", "2", "3", "4"])
    ax.set_xlabel("Column")
    ax.set_ylabel("Row")
    ax.set_xticks(np.arange(-.5, 4), minor=True)
    ax.set_yticks(np.arange(-.5, 4), minor=True)
    ax.grid(which="minor", color="white", linewidth=2)
    ax.tick_params(which="minor", bottom=False, left=False)
    for r in range(4):
        for c in range(4):
            text = "start" if r == 0 and c == 0 else f"{100*a[r,c]:.1f}%"
            ax.text(c, r, text, ha="center", va="center", fontsize=10,
                    color="white" if a[r,c] > .2 else "#17212B")
fig.colorbar(image, ax=axes, shrink=.82, label="Mine probability")
fig.savefig(OUT / "marginals.pdf", bbox_inches="tight")
fig.savefig(OUT / "marginals.png", dpi=180, bbox_inches="tight")
plt.close(fig)

mc = DATA["simulation"]
fig, axes = plt.subplots(1, 2, figsize=(7.2, 2.8), layout="constrained")
observed = [h["count"] / mc["samples"] for h in mc["attemptHistogram"][:5]]
observed += [(sum(h["count"] for h in mc["attemptHistogram"][5:]) + mc["tailCount"]) / mc["samples"]]
expected = [mc["p"] * (1-mc["p"])**j for j in range(5)] + [(1-mc["p"])**5]
x = np.arange(1, 7)
axes[0].bar(x-.17, expected, .34, color="#284D73", label="Geometric law")
axes[0].bar(x+.17, observed, .34, color="#67A3B2", label="10,000 runs")
axes[0].set_yscale("log")
axes[0].set_xticks(x, ["1", "2", "3", "4", "5", "6+"])
axes[0].set_xlabel("Proposals until acceptance")
axes[0].set_ylabel("Probability (log scale)")
axes[0].legend(frameon=False, fontsize=8)
axes[0].grid(axis="y", alpha=.2)
indices = [i for i, p in enumerate(mc["exactMarginal"]) if p > 0]
pred = np.array([mc["exactMarginal"][i] for i in indices])
emp = np.array([mc["empiricalMarginal"][i] for i in indices])
se = np.sqrt(pred * (1-pred) / mc["samples"])
axes[1].errorbar(pred, emp, yerr=1.96*se, fmt="o", markersize=4, capsize=2,
                 color="#284D73", ecolor="#67A3B2", linewidth=1)
axes[1].plot([.19, .32], [.19, .32], "--", color="gray", linewidth=1)
axes[1].set_xlim(.19, .32)
axes[1].set_ylim(.19, .32)
axes[1].set_xlabel("Exact accepted mine marginal")
axes[1].set_ylabel("Sample mine marginal")
axes[1].grid(alpha=.2)
fig.savefig(OUT / "sampling.pdf", bbox_inches="tight")
fig.savefig(OUT / "sampling.png", dpi=180, bbox_inches="tight")
plt.close(fig)
print("Wrote four figure files in", OUT)
