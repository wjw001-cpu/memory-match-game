"""
server.py — Memory Match Game Local Web Server

What this file does:
- Serves the game files (HTML, CSS, JS) to your browser
- Provides two API endpoints for high scores:
    GET  /scores      → returns the leaderboard as JSON
    POST /scores      → saves a new score (safely, no data loss)
- Scores are saved permanently in scores.json

Run with:
    uv run server.py
"""

import http.server
import json
import os

# ── Settings ──────────────────────────────────────────────────────────────────
# Railway sets a PORT environment variable — fall back to 8000 for local use
PORT = int(os.environ.get("PORT", 8000))

# Paths (relative to this file's location)
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "..", "static")
SCORES_FILE = os.path.join(BASE_DIR, "scores.json")


# ── Helper: safe score read/write ─────────────────────────────────────────────
def read_scores():
    """Read scores from scores.json. Returns an empty list if file is missing or broken."""
    if not os.path.exists(SCORES_FILE):
        return []
    try:
        with open(SCORES_FILE, "r") as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except (json.JSONDecodeError, IOError):
        return []


def write_scores(scores):
    """Write the full scores list back to scores.json."""
    with open(SCORES_FILE, "w") as f:
        json.dump(scores, f, indent=2)


# ── Request Handler ───────────────────────────────────────────────────────────
class GameHandler(http.server.SimpleHTTPRequestHandler):

    def __init__(self, *args, **kwargs):
        # Serve static files from the /static folder
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    def log_message(self, format, *args):
        # Custom log format so the terminal output is easy to read
        print(f"  → {self.command if hasattr(self, 'command') else ''} {self.path if hasattr(self, 'path') else ''} — {args[1] if len(args) > 1 else ''}")

    def do_GET(self):
        """Handle GET requests."""
        if self.path == "/scores":
            self._send_json(read_scores())
        else:
            # Serve static files (index.html, style.css, game.js)
            super().do_GET()

    def do_POST(self):
        """Handle POST requests (submitting a new score)."""
        if self.path == "/scores":
            try:
                length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(length)
                new_score = json.loads(body)

                # ✅ SAFE score saving — read → append → sort → write
                scores = read_scores()          # 1. Read existing scores
                scores.append(new_score)        # 2. Add new score
                scores.sort(key=lambda x: (     # 3. Sort: fewest moves first,
                    x.get("moves", 9999),        #    then fastest time
                    x.get("time", 9999)
                ))
                scores = scores[:100]           # 4. Keep top 100 only
                write_scores(scores)            # 5. Save full list

                self._send_json({"status": "saved", "total_scores": len(scores)})
                print(f"  ✅ Score saved for {new_score.get('name', 'Unknown')} — {len(scores)} total scores on file")

            except Exception as e:
                self._send_error(f"Could not save score: {str(e)}")
        else:
            self._send_error("Not found", code=404)

    def do_OPTIONS(self):
        """Allow browser preflight requests (CORS)."""
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def _send_json(self, data, code=200):
        """Send a JSON response."""
        body = json.dumps(data).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(body)

    def _send_error(self, message, code=400):
        """Send a JSON error response."""
        self._send_json({"error": message}, code=code)

    def _send_cors_headers(self):
        """Allow requests from the browser on the same machine."""
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")


# ── Start the server ──────────────────────────────────────────────────────────
if __name__ == "__main__":
    server = http.server.HTTPServer(("0.0.0.0", PORT), GameHandler)
    print(f"\n🎮 Memory Match Game Server")
    print(f"   Running at:  http://localhost:{PORT}")
    print(f"   Scores file: {SCORES_FILE}")
    print(f"   Press Ctrl+C to stop.\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n\nServer stopped. Goodbye! 👋")
