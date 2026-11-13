# Memory Match Game

A browser-based memory card game with persistent high scores, built with Python + HTML/CSS/JS.

## Project Structure

```
memory-match-game/
└── high-scores/
    ├── static/          ← HTML, CSS, JavaScript (the game UI)
    ├── conventions/     ← Coding rules and style guide
    ├── server/          ← Python server + scores.json data file
    └── README.md        ← This file
```

## How to Run

### Prerequisites
Install `uv` if you haven't already:
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### Start the server
From the `memory-match-game/` directory:
```bash
uv run high-scores/server/server.py
```

Then open your browser to: **http://localhost:8000**

## What Each File Does

| File | Purpose |
|------|---------|
| `static/index.html` | The game UI — what players see in the browser |
| `static/style.css` | Visual styling — colors, layout, animations |
| `static/game.js` | Game logic — card flipping, score tracking, timer |
| `server/server.py` | Python web server — serves files + handles score API |
| `server/scores.json` | Persistent storage — high scores saved here permanently |
| `conventions/coding-rules.md` | Rules all code in this project must follow |

## ⚠️ Data Safety
Scores are saved to `scores.json`. The server always reads existing scores first,
appends new ones, then saves the full list — so no scores are ever lost.
