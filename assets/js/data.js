/* Portal Games — catalog.
 * Single source of truth. The page shell, the library, the per-game pages and
 * the sitemap are all generated from this file (see tools/build.js).
 */
(function (root) {
  "use strict";

  var SITE = {
    name: "Portal Games",
    url: "https://portalgames.org",
    tagline: "Free games that actually load.",
    description:
      "A hand-built arcade of free browser games. No ads, no sign-ups, no trackers, " +
      "and nothing loaded from another server — so it works even on locked-down networks.",
    // Set these to switch the links on; leave empty and they stay hidden.
    discord: "",
    links: [{ label: "beanz.dev", href: "https://beanz.dev" }]
  };

  var CATEGORIES = [
    { id: "arcade", label: "Arcade" },
    { id: "puzzle", label: "Puzzle" },
    { id: "board", label: "Board" },
    { id: "word", label: "Word" },
    { id: "2p", label: "2 Player" }
  ];

  /* Each entry drives: the library card, the /games/<id>.html page, the
   * generated cover art, and the in-game HUD.
   *   ratio       stage aspect ratio (w/h)
   *   score       "high" = bigger is better, "low" = lower is better, null = no score
   *   accent      [from, to] cover-art gradient
   */
  var GAMES = [
    {
      id: "slope",
      title: "Slope",
      tagline: "Endless neon descent",
      cats: ["arcade"],
      ratio: "16/10",
      score: "high",
      scoreLabel: "Distance",
      featured: true,
      hot: true,
      accent: ["#22d3ee", "#4f46e5"],
      blurb:
        "Steer a chrome ball down an endless procedurally generated slope. It never " +
        "stops getting faster, the track never repeats, and one wrong lean ends the run.",
      howto:
        "Roll down the tunnel and stay on the track. The speed climbs the longer you " +
        "survive, and gaps and obstacle blocks appear the deeper you get. Your distance " +
        "is your score.",
      controls: [
        [["A", "D"], "Steer left and right"],
        [["←", "→"], "Steer left and right"],
        [["Space"], "Start / restart"],
        [["P"], "Pause"]
      ],
      touch: "steer"
    },
    {
      id: "stacks",
      title: "Stacks",
      tagline: "The falling-block classic",
      cats: ["puzzle"],
      ratio: "4/5",
      score: "high",
      scoreLabel: "Score",
      featured: true,
      accent: ["#a855f7", "#ec4899"],
      blurb:
        "Seven-bag randomiser, hold queue, ghost piece, wall kicks, lock delay and a " +
        "proper level curve. Everything a modern stacker should have.",
      howto:
        "Fit the falling pieces together to complete horizontal lines. Complete lines " +
        "clear and score; clearing four at once is worth far more. Every ten lines the " +
        "pieces fall faster.",
      controls: [
        [["←", "→"], "Move piece"],
        [["↓"], "Soft drop"],
        [["Space"], "Hard drop"],
        [["↑", "X"], "Rotate clockwise"],
        [["Z"], "Rotate counter-clockwise"],
        [["C", "Shift"], "Hold piece"],
        [["P"], "Pause"]
      ],
      touch: "stacks"
    },
    {
      id: "2048",
      title: "2048",
      tagline: "Slide, merge, repeat",
      cats: ["puzzle"],
      ratio: "1/1",
      score: "high",
      scoreLabel: "Score",
      accent: ["#f59e0b", "#ef4444"],
      blurb:
        "The tile-merging puzzle that ate everyone's afternoon, with smooth animation, " +
        "undo, and a board that saves itself between visits.",
      howto:
        "Slide all tiles in one direction. Two tiles with the same number merge into " +
        "their sum. Reach 2048 to win — then keep going for a bigger score.",
      controls: [
        [["←", "↑", "→", "↓"], "Slide tiles"],
        [["W", "A", "S", "D"], "Slide tiles"],
        [["U"], "Undo last move"],
        [["R"], "New game"]
      ],
      touch: "swipe"
    },
    {
      id: "snake",
      title: "Neon Snake",
      tagline: "Grow long, don't bite",
      cats: ["arcade"],
      ratio: "1/1",
      score: "high",
      scoreLabel: "Length",
      accent: ["#22c55e", "#0ea5e9"],
      blurb:
        "Snake with smooth interpolated movement, a queued-input buffer so fast turns " +
        "never eat themselves, and golden apples worth chasing.",
      howto:
        "Eat apples to grow. Hitting a wall or your own tail ends the run. Gold apples " +
        "appear briefly and are worth five. The snake speeds up as it grows.",
      controls: [
        [["←", "↑", "→", "↓"], "Turn"],
        [["W", "A", "S", "D"], "Turn"],
        [["Space"], "Start / restart"],
        [["P"], "Pause"]
      ],
      touch: "dpad"
    },
    {
      id: "brickwave",
      title: "Brickwave",
      tagline: "Breakout with power-ups",
      cats: ["arcade"],
      ratio: "4/3",
      score: "high",
      scoreLabel: "Score",
      accent: ["#f472b6", "#8b5cf6"],
      blurb:
        "Angle the ball off your paddle to clear the wall. Catch falling power-ups for " +
        "multi-ball, a wider paddle, or a sticky catch.",
      howto:
        "Keep the ball alive and clear every brick to advance. Where the ball hits your " +
        "paddle decides where it goes. Some bricks need more than one hit.",
      controls: [
        [["←", "→"], "Move paddle"],
        [["Mouse"], "Move paddle"],
        [["Space"], "Launch ball"],
        [["P"], "Pause"]
      ],
      touch: "steer"
    },
    {
      id: "flap",
      title: "Flap",
      tagline: "One button, infinite regret",
      cats: ["arcade"],
      ratio: "3/4",
      score: "high",
      scoreLabel: "Pipes",
      hot: true,
      accent: ["#facc15", "#f97316"],
      blurb:
        "One tap to rise, gravity does the rest. Parallax skies, day-to-night drift and " +
        "a difficulty curve that stays fair right up until it isn't.",
      howto:
        "Tap to flap upward. Fly through the gaps between pipes without touching " +
        "anything. Each pipe you clear is a point.",
      controls: [
        [["Space"], "Flap"],
        [["Click"], "Flap"],
        [["P"], "Pause"]
      ],
      touch: "tap"
    },
    {
      id: "minesweeper",
      title: "Minesweeper",
      tagline: "Logic, not luck",
      cats: ["puzzle"],
      ratio: "1/1",
      score: "low",
      scoreLabel: "Best time",
      accent: ["#38bdf8", "#1e40af"],
      blurb:
        "Three difficulties, guaranteed-safe first click, chording, and flag counts — " +
        "the version you actually want, timed to the tenth of a second.",
      howto:
        "Reveal every square that isn't a mine. A number tells you how many mines touch " +
        "that square. Flag the mines you're sure of; clicking a satisfied number reveals " +
        "its remaining neighbours.",
      controls: [
        [["Click"], "Reveal square"],
        [["Right-click"], "Place flag"],
        [["Both / Click"], "Chord a number"],
        [["R"], "New board"]
      ],
      touch: "minesweeper"
    },
    {
      id: "fourinarow",
      title: "Four in a Row",
      tagline: "Beat the engine",
      cats: ["board", "2p"],
      ratio: "7/6",
      score: null,
      accent: ["#ef4444", "#facc15"],
      blurb:
        "Drop discs against a minimax engine that searches seven plies deep and does " +
        "not blunder — or hand the keyboard to a friend for local two-player.",
      howto:
        "Drop a disc into a column. First to line up four in a row — across, down or " +
        "diagonally — wins. On Hard the engine will punish any obvious threat you leave open.",
      controls: [
        [["Click"], "Drop a disc"],
        [["1", "–", "7"], "Drop in column"],
        [["R"], "New game"]
      ],
      touch: "point"
    },
    {
      id: "driftfield",
      title: "Driftfield",
      tagline: "Asteroids, with thrust",
      cats: ["arcade"],
      ratio: "16/10",
      score: "high",
      scoreLabel: "Score",
      accent: ["#818cf8", "#0ea5e9"],
      blurb:
        "Vector-drawn survival in a wrapping asteroid field. Real momentum, splitting " +
        "rocks, hunting saucers and a hyperspace jump for when it all goes wrong.",
      howto:
        "Thrust, turn and shoot. Big rocks split into smaller, faster ones. Clear a wave " +
        "to face a denser one. Hyperspace teleports you somewhere random — usually safer.",
      controls: [
        [["←", "→"], "Rotate"],
        [["↑", "W"], "Thrust"],
        [["Space"], "Fire"],
        [["Shift"], "Hyperspace"],
        [["P"], "Pause"]
      ],
      touch: "ship"
    },
    {
      id: "sudoku",
      title: "Sudoku",
      tagline: "Four difficulties, always solvable",
      cats: ["puzzle"],
      ratio: "1/1",
      score: "low",
      scoreLabel: "Best time",
      accent: ["#2dd4bf", "#0284c7"],
      blurb:
        "Puzzles generated on the fly and verified to have exactly one solution. Pencil " +
        "marks, mistake highlighting, and a hint when you're properly stuck.",
      howto:
        "Fill the grid so every row, column and 3×3 box contains 1–9 exactly once. Use " +
        "pencil marks for candidates. The timer stops the moment the grid is correct.",
      controls: [
        [["Click"], "Select a cell"],
        [["1", "–", "9"], "Enter a number"],
        [["Backspace"], "Clear cell"],
        [["N"], "Toggle pencil mode"],
        [["Arrows"], "Move selection"]
      ],
      touch: "point"
    },
    {
      id: "paddle",
      title: "Paddle",
      tagline: "Pong, sharpened",
      cats: ["arcade", "2p"],
      ratio: "16/10",
      score: null,
      accent: ["#e2e8f0", "#64748b"],
      blurb:
        "First to eleven. Play a CPU with three genuinely different skill levels, or grab " +
        "a friend and use both ends of the keyboard.",
      howto:
        "Return the ball past your opponent. The ball speeds up on every rally and takes " +
        "spin from a moving paddle. First player to eleven takes the match.",
      controls: [
        [["W", "S"], "Left paddle"],
        [["↑", "↓"], "Right paddle"],
        [["Space"], "Serve"],
        [["P"], "Pause"]
      ],
      touch: "paddle"
    },
    {
      id: "skyhop",
      title: "Sky Hop",
      tagline: "Up is the only direction",
      cats: ["arcade"],
      ratio: "3/4",
      score: "high",
      scoreLabel: "Height",
      accent: ["#34d399", "#3b82f6"],
      blurb:
        "Bounce your way up an endless tower of platforms. Springs launch you, crumbling " +
        "ledges betray you, and the screen never scrolls back down.",
      howto:
        "You bounce automatically on every platform. Steer left and right — the edges " +
        "wrap around. Springs fling you far higher; brown platforms break after one bounce. " +
        "Falling off the bottom ends the run.",
      controls: [
        [["←", "→"], "Steer"],
        [["A", "D"], "Steer"],
        [["P"], "Pause"]
      ],
      touch: "steer"
    },
    {
      id: "penta",
      title: "Penta",
      tagline: "Five letters, six guesses",
      cats: ["word"],
      ratio: "3/4",
      score: null,
      accent: ["#4ade80", "#a3a3a3"],
      blurb:
        "A daily word plus unlimited practice rounds, a real answer list, and a keyboard " +
        "that tracks everything you've ruled out.",
      howto:
        "Guess the five-letter word in six tries. Green means right letter, right spot. " +
        "Yellow means the letter is in the word somewhere else. Grey means it isn't in the " +
        "word at all.",
      controls: [
        [["A", "–", "Z"], "Type a letter"],
        [["Enter"], "Submit guess"],
        [["Backspace"], "Delete letter"]
      ],
      touch: "keyboard"
    },
    {
      id: "match",
      title: "Match",
      tagline: "Memory, against the clock",
      cats: ["puzzle"],
      ratio: "4/3",
      score: "low",
      scoreLabel: "Best moves",
      accent: ["#c084fc", "#6366f1"],
      blurb:
        "Flip cards, remember pairs, finish in as few moves as possible. Three grid sizes " +
        "and a clean flip animation that never gets in the way.",
      howto:
        "Turn over two cards. If they match they stay face up; if not they flip back. " +
        "Clear the whole board in as few moves as you can.",
      controls: [
        [["Click"], "Flip a card"],
        [["R"], "New board"]
      ],
      touch: "point"
    }
  ];

  var api = { SITE: SITE, CATEGORIES: CATEGORIES, GAMES: GAMES };

  if (typeof module === "object" && module.exports) module.exports = api;
  root.PG_DATA = api;
})(typeof window !== "undefined" ? window : globalThis);
