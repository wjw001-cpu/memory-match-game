# Coding Rules — Memory Match Game

## General Rules
- All code must be beginner-friendly and well-commented.
- No paid APIs or external services.
- Test each feature before moving to the next.

## Python (server.py)
- Use Python's built-in `http.server` or a lightweight framework (no Django).
- Run with `uv` (see README.md).
- Always read → modify → write when updating scores.json. Never overwrite blindly.

## JavaScript (game.js)
- Keep all game logic in game.js.
- Use `fetch()` to talk to the Python server for scores.
- No external JS libraries unless agreed upon.

## CSS (style.css)
- Mobile-friendly layout.
- Keep styles organized with comments.

## Data Safety Rule ⚠️
When saving a new high score:
1. GET the existing scores from scores.json
2. APPEND the new score to the list
3. SORT the list
4. SAVE the full list back to scores.json

**NEVER replace the whole file with just the new score.**
