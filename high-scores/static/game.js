/**
 * game.js — Memory Match Game Logic
 *
 * What this file does:
 * - Creates and shuffles 16 cards (8 matching emoji pairs)
 * - Handles card flipping and match detection
 * - Tracks moves and elapsed time
 * - Detects when the game is won
 * - Submits the score to the Python server (POST /scores)
 * - Loads and displays the leaderboard (GET /scores)
 */

// ── Card Emojis (8 pairs = 16 cards) ─────────────────────────────────────────
const EMOJIS = ['🎮', '🎯', '🏆', '⭐', '🎸', '🚀', '🎲', '🎪'];

// ── Game State ────────────────────────────────────────────────────────────────
let playerName   = '';   // Set when game starts
let cards        = [];   // Array of card objects {id, emoji, element}
let flippedCards = [];   // Cards currently face-up (max 2)
let matchedCount = 0;    // How many pairs have been matched
let moves        = 0;    // Total move counter
let timerSeconds = 0;    // Elapsed seconds
let timerInterval = null; // setInterval reference
let isLocked     = false; // Prevents clicking during flip animation

// ── DOM References ────────────────────────────────────────────────────────────
const setupScreen    = document.getElementById('setup-screen');
const gameScreen     = document.getElementById('game-screen');
const gameBoard      = document.getElementById('game-board');
const playerNameInput = document.getElementById('player-name');
const startBtn       = document.getElementById('start-btn');
const restartBtn     = document.getElementById('restart-btn');
const moveCountEl    = document.getElementById('move-count');
const timerDisplayEl = document.getElementById('timer-display');
const pairsFoundEl   = document.getElementById('pairs-found');
const displayNameEl  = document.getElementById('display-name');
const winModal       = document.getElementById('win-modal');
const modalOverlay   = document.getElementById('modal-overlay');
const winStatsEl     = document.getElementById('win-stats');
const saveStatusEl   = document.getElementById('save-status');
const playAgainBtn   = document.getElementById('play-again-btn');
const viewScoresBtn  = document.getElementById('view-scores-btn');
const scoresBody     = document.getElementById('scores-body');
const refreshScoresBtn = document.getElementById('refresh-scores-btn');

// ── Utility: Shuffle an Array (Fisher-Yates) ──────────────────────────────────
function shuffle(array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Utility: Format seconds as M:SS ──────────────────────────────────────────
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ── Utility: Format a date as "Nov 12, 2026" ─────────────────────────────────
function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

// ── Timer Controls ────────────────────────────────────────────────────────────
function startTimer() {
  timerSeconds = 0;
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timerSeconds++;
    timerDisplayEl.textContent = formatTime(timerSeconds);
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
}

// ── Build the Game Board ──────────────────────────────────────────────────────
function buildBoard() {
  // Double the emoji array to create pairs, then shuffle
  const emojiPairs = shuffle([...EMOJIS, ...EMOJIS]);

  gameBoard.innerHTML = '';
  cards = [];
  flippedCards = [];
  matchedCount = 0;
  moves = 0;
  isLocked = false;

  // Reset stats display
  moveCountEl.textContent  = '0';
  timerDisplayEl.textContent = '0:00';
  pairsFoundEl.textContent = `0 / ${EMOJIS.length}`;

  // Create a card element for each emoji
  emojiPairs.forEach((emoji, index) => {
    const card = document.createElement('div');
    card.classList.add('card');
    card.dataset.index = index;

    card.innerHTML = `
      <div class="card-inner">
        <div class="card-back">🂠</div>
        <div class="card-front">${emoji}</div>
      </div>
    `;

    card.addEventListener('click', () => onCardClick(card, emoji, index));
    gameBoard.appendChild(card);

    cards.push({ index, emoji, element: card });
  });
}

// ── Card Click Handler ────────────────────────────────────────────────────────
function onCardClick(cardEl, emoji, index) {
  // Ignore clicks if: board locked, card already flipped, or card already matched
  if (isLocked) return;
  if (cardEl.classList.contains('flipped')) return;
  if (cardEl.classList.contains('matched')) return;

  // Start timer on the very first card flip
  if (moves === 0 && flippedCards.length === 0) {
    startTimer();
  }

  // Flip the card
  cardEl.classList.add('flipped');
  flippedCards.push({ element: cardEl, emoji });

  // If only one card is flipped, wait for the second
  if (flippedCards.length < 2) return;

  // Two cards are now flipped — count this as a move
  moves++;
  moveCountEl.textContent = moves;

  const [first, second] = flippedCards;

  if (first.emoji === second.emoji) {
    // ✅ Match found!
    first.element.classList.add('matched');
    second.element.classList.add('matched');
    matchedCount++;
    pairsFoundEl.textContent = `${matchedCount} / ${EMOJIS.length}`;
    flippedCards = [];

    // Check for win
    if (matchedCount === EMOJIS.length) {
      stopTimer();
      setTimeout(showWinModal, 600); // Short delay so last match animates
    }
  } else {
    // ❌ No match — flip both cards back after a short pause
    isLocked = true;
    setTimeout(() => {
      first.element.classList.remove('flipped');
      second.element.classList.remove('flipped');
      flippedCards = [];
      isLocked = false;
    }, 1000);
  }
}

// ── Win Modal ─────────────────────────────────────────────────────────────────
function showWinModal() {
  winStatsEl.textContent = `${moves} moves · ${formatTime(timerSeconds)}`;
  saveStatusEl.textContent = '💾 Saving your score...';

  winModal.classList.remove('hidden');
  modalOverlay.classList.remove('hidden');

  submitScore(playerName, moves, timerSeconds);
}

function hideWinModal() {
  winModal.classList.add('hidden');
  modalOverlay.classList.add('hidden');
}

// ── Score Submission ──────────────────────────────────────────────────────────
async function submitScore(name, moves, time) {
  const scoreData = {
    name:  name,
    moves: moves,
    time:  time,
    date:  new Date().toISOString()
  };

  try {
    const response = await fetch('/scores', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(scoreData)
    });

    if (response.ok) {
      saveStatusEl.textContent = '✅ Score saved to leaderboard!';
      loadScores(); // Refresh leaderboard in the background
    } else {
      saveStatusEl.textContent = '⚠️ Could not save score (server error).';
    }
  } catch (err) {
    saveStatusEl.textContent = '⚠️ Could not reach server. Is it running?';
    console.error('Score submit error:', err);
  }
}

// ── Load Leaderboard ──────────────────────────────────────────────────────────
async function loadScores() {
  try {
    const response = await fetch('/scores');
    if (!response.ok) throw new Error('Server error');
    const scores = await response.json();
    renderScores(scores);
  } catch (err) {
    scoresBody.innerHTML = `<tr><td colspan="5" class="no-scores">⚠️ Could not load scores. Is the server running?</td></tr>`;
    console.error('Score load error:', err);
  }
}

function renderScores(scores) {
  if (!scores || scores.length === 0) {
    scoresBody.innerHTML = `<tr><td colspan="5" class="no-scores">No scores yet — be the first!</td></tr>`;
    return;
  }

  const medals = ['🥇', '🥈', '🥉'];

  scoresBody.innerHTML = scores.map((score, i) => `
    <tr>
      <td>${medals[i] || i + 1}</td>
      <td>${escapeHtml(score.name)}</td>
      <td>${score.moves}</td>
      <td>${formatTime(score.time)}</td>
      <td>${formatDate(score.date)}</td>
    </tr>
  `).join('');
}

// Safety: prevent XSS if someone types HTML in their name
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Start Game ────────────────────────────────────────────────────────────────
function startGame() {
  const name = playerNameInput.value.trim();
  if (!name) {
    playerNameInput.focus();
    playerNameInput.style.borderColor = '#ef4444';
    setTimeout(() => playerNameInput.style.borderColor = '', 1000);
    return;
  }

  playerName = name;
  displayNameEl.textContent = name;

  setupScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');

  buildBoard();
}

// ── Restart ───────────────────────────────────────────────────────────────────
function restartGame() {
  stopTimer();
  hideWinModal();
  buildBoard();
  startTimer();
}

function goToSetup() {
  stopTimer();
  hideWinModal();
  gameScreen.classList.add('hidden');
  setupScreen.classList.remove('hidden');
  playerNameInput.value = '';
}

// ── Event Listeners ───────────────────────────────────────────────────────────
startBtn.addEventListener('click', startGame);

// Allow pressing Enter in the name field to start
playerNameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') startGame();
});

restartBtn.addEventListener('click', restartGame);

playAgainBtn.addEventListener('click', restartGame);

viewScoresBtn.addEventListener('click', () => {
  hideWinModal();
  document.getElementById('leaderboard').scrollIntoView({ behavior: 'smooth' });
});

refreshScoresBtn.addEventListener('click', loadScores);

// ── Init: load leaderboard on page load ───────────────────────────────────────
loadScores();
