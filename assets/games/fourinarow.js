/* Four in a Row — vs a minimax engine (alpha-beta, iterative window scoring)
 * or two players on one keyboard.
 */
(function () {
  "use strict";

  var COLS = 7,
    ROWS = 6;
  var RED = 1,
    YEL = 2;

  var DEPTHS = { easy: 2, medium: 5, hard: 7 };

  var style = document.createElement("style");
  style.textContent =
    ".c4{display:flex;flex-direction:column;align-items:center;gap:10px;padding:8px}" +
    ".c4-bar{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;align-items:center}" +
    ".c4-opt{height:28px;padding:0 11px;border-radius:999px;border:1px solid var(--border);" +
    "background:var(--surface);color:var(--muted);font-size:12.5px;font-weight:650}" +
    ".c4-opt[aria-pressed=true]{background:var(--brand-grad);color:#fff;border-color:transparent}" +
    ".c4-turn{display:flex;align-items:center;gap:8px;font-weight:700;font-size:14px}" +
    ".c4-turn i{width:14px;height:14px;border-radius:50%;display:block}" +
    ".c4-board{display:grid;gap:var(--c4-gap);padding:var(--c4-gap);border-radius:14px;" +
    "background:linear-gradient(160deg,#1e3a8a,#172554);box-shadow:0 18px 40px -18px #000}" +
    ".c4-cell{position:relative;border-radius:50%;background:#0c142a;cursor:pointer;" +
    "box-shadow:inset 0 2px 6px rgba(0,0,0,.6)}" +
    ".c4-cell.hint{background:#16203f}" +
    ".c4-disc{position:absolute;inset:0;border-radius:50%}" +
    ".c4-disc.r{background:radial-gradient(circle at 35% 30%,#fca5a5,#dc2626 65%)}" +
    ".c4-disc.y{background:radial-gradient(circle at 35% 30%,#fde68a,#eab308 65%)}" +
    ".c4-disc.drop{animation:c4drop .28s cubic-bezier(.4,.8,.5,1)}" +
    ".c4-disc.win{animation:c4win .7s ease-in-out infinite alternate}" +
    "@keyframes c4drop{from{transform:translateY(var(--from))}}" +
    "@keyframes c4win{to{box-shadow:0 0 0 4px #fff,0 0 22px 6px rgba(255,255,255,.55)}}" +
    "@media (prefers-reduced-motion:reduce){.c4-disc.drop,.c4-disc.win{animation:none}}";
  document.head.appendChild(style);

  PG.mount({
    id: "fourinarow",
    mode: "dom",
    autoStart: true,
    pauseable: false,
    pauseOnBlur: false,
    rKeyRestarts: false,
    swipe: false,

    setup: function (g) {
      var wrap = document.createElement("div");
      wrap.className = "c4";
      wrap.innerHTML =
        '<div class="c4-bar">' +
        '<button class="c4-opt" data-mode="easy">CPU easy</button>' +
        '<button class="c4-opt" data-mode="medium">CPU medium</button>' +
        '<button class="c4-opt" data-mode="hard">CPU hard</button>' +
        '<button class="c4-opt" data-mode="2p">2 player</button>' +
        "</div>" +
        '<div class="c4-turn" data-turn></div>' +
        '<div class="c4-board" data-board></div>';
      g.root.appendChild(wrap);
      g.data.wrap = wrap;
      g.data.boardEl = wrap.querySelector("[data-board]");
      g.data.mode = PG.store.get("c4:mode", "hard");

      wrap.addEventListener("click", function (e) {
        var m = e.target.closest("[data-mode]");
        if (m) {
          g.data.mode = m.getAttribute("data-mode");
          PG.store.set("c4:mode", g.data.mode);
          g.start();
          return;
        }
        var cell = e.target.closest("[data-col]");
        if (cell) human(g, +cell.getAttribute("data-col"));
      });

      wrap.addEventListener("pointerover", function (e) {
        var cell = e.target.closest("[data-col]");
        highlight(g, cell ? +cell.getAttribute("data-col") : -1);
      });
      wrap.addEventListener("pointerleave", function () {
        highlight(g, -1);
      });
    },

    start: function (g) {
      var d = g.data;
      d.board = new Array(COLS * ROWS).fill(0);
      d.turn = RED;
      d.finished = false;
      d.thinking = false;
      d.winLine = null;
      buildBoard(g);
      paintTurn(g);
      Array.prototype.forEach.call(d.wrap.querySelectorAll("[data-mode]"), function (b) {
        b.setAttribute("aria-pressed", b.getAttribute("data-mode") === d.mode ? "true" : "false");
      });
    },

    onKey: function (g, k) {
      if (k === "r") return g.start();
      var n = parseInt(k, 10);
      if (n >= 1 && n <= 7) human(g, n - 1);
    },

    onResize: function (g) {
      if (g.data.board) sizeBoard(g);
    }
  });

  /* ------------------------------------------------------------- board -- */
  function at(b, x, y) {
    return b[y * COLS + x];
  }

  function drop(b, col) {
    for (var y = ROWS - 1; y >= 0; y--) {
      if (!b[y * COLS + col]) return y;
    }
    return -1;
  }

  function buildBoard(g) {
    var el = g.data.boardEl;
    el.innerHTML = "";
    el.style.gridTemplateColumns = "repeat(" + COLS + ", var(--c4-cell))";
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        var c = document.createElement("div");
        c.className = "c4-cell";
        c.setAttribute("data-col", x);
        c.setAttribute("data-row", y);
        el.appendChild(c);
      }
    }
    sizeBoard(g);
  }

  function sizeBoard(g) {
    var host = g.root.getBoundingClientRect();
    var gap = 7;
    var cell = Math.floor(
      Math.min((host.width - 40 - gap * (COLS + 1)) / COLS, (host.height - 110 - gap * (ROWS + 1)) / ROWS)
    );
    cell = Math.max(22, cell);
    var el = g.data.boardEl;
    el.style.setProperty("--c4-cell", cell + "px");
    el.style.setProperty("--c4-gap", gap + "px");
    el.style.gridTemplateColumns = "repeat(" + COLS + ", " + cell + "px)";
    Array.prototype.forEach.call(el.children, function (c) {
      c.style.width = cell + "px";
      c.style.height = cell + "px";
    });
    g.data.cellSize = cell + gap;
  }

  function cellEl(g, x, y) {
    return g.data.boardEl.children[y * COLS + x];
  }

  function highlight(g, col) {
    var d = g.data;
    if (!d.board) return;
    Array.prototype.forEach.call(d.boardEl.children, function (c) {
      c.classList.remove("hint");
    });
    if (col < 0 || d.finished || d.thinking) return;
    var y = drop(d.board, col);
    if (y >= 0) cellEl(g, col, y).classList.add("hint");
  }

  function paintTurn(g) {
    var d = g.data;
    var el = d.wrap.querySelector("[data-turn]");
    if (!el) return;
    if (d.finished) return;
    var who =
      d.mode === "2p"
        ? d.turn === RED ? "Red's turn" : "Yellow's turn"
        : d.turn === RED ? "Your turn" : "Thinking…";
    el.innerHTML =
      '<i style="background:' + (d.turn === RED ? "#dc2626" : "#eab308") + '"></i><span>' + who + "</span>";
  }

  /* -------------------------------------------------------------- play -- */
  function human(g, col) {
    var d = g.data;
    if (d.finished || d.thinking || col < 0 || col >= COLS) return;
    if (d.mode !== "2p" && d.turn !== RED) return;
    place(g, col, d.turn);
  }

  function place(g, col, who) {
    var d = g.data;
    var y = drop(d.board, col);
    if (y < 0) return;

    d.board[y * COLS + col] = who;
    var disc = document.createElement("div");
    disc.className = "c4-disc " + (who === RED ? "r" : "y") + " drop";
    disc.style.setProperty("--from", -(y + 1) * d.cellSize + "px");
    cellEl(g, col, y).appendChild(disc);
    g.sfx.tone(who === RED ? 300 : 380, 0.07, "square", 0.05, 180);

    var line = winningLine(d.board, who);
    if (line) return finish(g, who, line);
    if (d.board.every(function (v) { return v; })) return finish(g, 0, null);

    d.turn = who === RED ? YEL : RED;
    paintTurn(g);
    highlight(g, -1);

    if (d.mode !== "2p" && d.turn === YEL) {
      d.thinking = true;
      // Yield so the drop animation renders before the search blocks.
      setTimeout(function () {
        var move = bestMove(d.board, DEPTHS[d.mode] || 5, d.mode === "easy");
        d.thinking = false;
        if (!d.finished) place(g, move, YEL);
      }, 240);
    }
  }

  function finish(g, who, line) {
    var d = g.data;
    d.finished = true;
    d.winLine = line;
    if (line) {
      line.forEach(function (p) {
        var el = cellEl(g, p[0], p[1]).firstChild;
        if (el) el.classList.add("win");
      });
    }
    var turnEl = d.wrap.querySelector("[data-turn]");

    if (!who) {
      if (turnEl) turnEl.textContent = "Draw";
      g.over({ title: "Draw", text: "The board filled with no line of four.", button: "Play again" });
      return;
    }
    var youWon = d.mode === "2p" ? null : who === RED;
    var label = d.mode === "2p" ? (who === RED ? "Red wins" : "Yellow wins") : youWon ? "You win" : "The engine wins";
    if (turnEl) turnEl.textContent = label;
    g.over({
      won: youWon !== false,
      title: label,
      text: d.mode === "2p" ? "" : youWon ? "Beat the " + d.mode + " engine." : "Try a shallower search, or a different opening.",
      button: "Play again"
    });
  }

  /* ------------------------------------------------------------ engine -- */
  var LINES = (function () {
    var out = [];
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        if (x + 3 < COLS) out.push([[x, y], [x + 1, y], [x + 2, y], [x + 3, y]]);
        if (y + 3 < ROWS) out.push([[x, y], [x, y + 1], [x, y + 2], [x, y + 3]]);
        if (x + 3 < COLS && y + 3 < ROWS) out.push([[x, y], [x + 1, y + 1], [x + 2, y + 2], [x + 3, y + 3]]);
        if (x - 3 >= 0 && y + 3 < ROWS) out.push([[x, y], [x - 1, y + 1], [x - 2, y + 2], [x - 3, y + 3]]);
      }
    }
    return out;
  })();

  function winningLine(b, who) {
    for (var i = 0; i < LINES.length; i++) {
      var L = LINES[i];
      if (
        at(b, L[0][0], L[0][1]) === who &&
        at(b, L[1][0], L[1][1]) === who &&
        at(b, L[2][0], L[2][1]) === who &&
        at(b, L[3][0], L[3][1]) === who
      )
        return L;
    }
    return null;
  }

  /* Window scoring: reward threes and twos, weight the centre file. */
  function evaluate(b, me) {
    var them = me === RED ? YEL : RED;
    var score = 0;

    for (var y = 0; y < ROWS; y++) {
      if (at(b, 3, y) === me) score += 6;
      else if (at(b, 3, y) === them) score -= 6;
    }

    for (var i = 0; i < LINES.length; i++) {
      var L = LINES[i];
      var mine = 0,
        theirs = 0;
      for (var k = 0; k < 4; k++) {
        var v = at(b, L[k][0], L[k][1]);
        if (v === me) mine++;
        else if (v === them) theirs++;
      }
      if (mine && theirs) continue;
      if (mine === 4) score += 100000;
      else if (mine === 3) score += 120;
      else if (mine === 2) score += 14;
      if (theirs === 4) score -= 100000;
      else if (theirs === 3) score -= 140; // block slightly harder than attack
      else if (theirs === 2) score -= 14;
    }
    return score;
  }

  var ORDER = [3, 2, 4, 1, 5, 0, 6];

  function search(b, depth, alpha, beta, maximising, me) {
    var them = me === RED ? YEL : RED;
    if (winningLine(b, me)) return 1000000 + depth;
    if (winningLine(b, them)) return -1000000 - depth;
    if (depth === 0) return evaluate(b, me);

    var moved = false;
    var best = maximising ? -Infinity : Infinity;

    for (var i = 0; i < ORDER.length; i++) {
      var col = ORDER[i];
      var y = drop(b, col);
      if (y < 0) continue;
      moved = true;
      b[y * COLS + col] = maximising ? me : them;
      var v = search(b, depth - 1, alpha, beta, !maximising, me);
      b[y * COLS + col] = 0;

      if (maximising) {
        if (v > best) best = v;
        if (best > alpha) alpha = best;
      } else {
        if (v < best) best = v;
        if (best < beta) beta = best;
      }
      if (alpha >= beta) break;
    }
    return moved ? best : 0;
  }

  function bestMove(board, depth, blunder) {
    var b = board.slice();
    var options = [];

    for (var i = 0; i < ORDER.length; i++) {
      var col = ORDER[i];
      var y = drop(b, col);
      if (y < 0) continue;
      b[y * COLS + col] = YEL;
      var v = search(b, depth - 1, -Infinity, Infinity, false, YEL);
      b[y * COLS + col] = 0;
      options.push({ col: col, v: v });
    }
    if (!options.length) return 0;

    options.sort(function (p, q) {
      return q.v - p.v;
    });

    // Easy mode still refuses to miss an immediate win or loss.
    if (blunder && options.length > 1 && Math.abs(options[0].v) < 900000 && Math.random() < 0.4) {
      return options[1].col;
    }
    return options[0].col;
  }
})();
