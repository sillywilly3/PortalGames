/* Sudoku — puzzles generated at load and verified to have exactly one
 * solution before they are handed to the player.
 *
 * As with Minesweeper, only Medium times feed the site-wide best so the
 * figure means one thing; every difficulty keeps its own record below the grid.
 */
(function () {
  "use strict";

  var GIVENS = { easy: 46, medium: 36, hard: 30, expert: 25 };
  var LABEL = { easy: "Easy", medium: "Medium", hard: "Hard", expert: "Expert" };

  var style = document.createElement("style");
  style.textContent =
    ".sd{display:flex;flex-direction:column;align-items:center;gap:9px;padding:8px}" +
    ".sd-bar{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;align-items:center}" +
    ".sd-opt{height:27px;padding:0 10px;border-radius:999px;border:1px solid var(--border);" +
    "background:var(--surface);color:var(--muted);font-size:12px;font-weight:650}" +
    ".sd-opt[aria-pressed=true]{background:var(--brand-grad);color:#fff;border-color:transparent}" +
    ".sd-grid{display:grid;grid-template-columns:repeat(9,var(--sd-cell));" +
    "background:#2dd4bf40;gap:1px;padding:2px;border-radius:8px}" +
    ".sd-c{position:relative;display:grid;place-items:center;background:#0d1526;border:none;padding:0;" +
    "color:#e6edff;font-weight:650;cursor:pointer;transition:background .1s}" +
    ".sd-c.b-r{margin-right:2px}.sd-c.b-b{margin-bottom:2px}" +
    ".sd-c.given{color:#9fabc6;font-weight:800;cursor:default}" +
    ".sd-c.peer{background:#7aa7ff14}" +
    ".sd-c.same{background:#2dd4bf26}" +
    ".sd-c.sel{background:#2dd4bf4d;box-shadow:inset 0 0 0 2px #2dd4bf}" +
    ".sd-c.bad{color:#fb7185;background:#fb718526}" +
    ".sd-marks{position:absolute;inset:2px;display:grid;grid-template-columns:repeat(3,1fr);" +
    "grid-template-rows:repeat(3,1fr);font-size:9px;font-weight:700;color:#74809c;pointer-events:none}" +
    ".sd-marks span{display:grid;place-items:center}" +
    ".sd-pad{display:grid;grid-template-columns:repeat(9,1fr);gap:5px;width:100%;max-width:var(--sd-w)}" +
    ".sd-n{aspect-ratio:1;border-radius:8px;border:1px solid var(--border);background:var(--surface);" +
    "color:var(--text);font-weight:750;display:grid;place-items:center}" +
    ".sd-n:hover{background:var(--surface-2)}" +
    ".sd-n.done{opacity:.3}" +
    ".sd-stat{font-size:12.5px;color:var(--muted);font-variant-numeric:tabular-nums}";
  document.head.appendChild(style);

  PG.mount({
    id: "sudoku",
    mode: "dom",
    autoStart: true,
    pauseable: false,
    pauseOnBlur: false,
    rKeyRestarts: false,
    swipe: false,

    setup: function (g) {
      var wrap = document.createElement("div");
      wrap.className = "sd";
      wrap.innerHTML =
        '<div class="sd-bar">' +
        Object.keys(GIVENS)
          .map(function (k) {
            return '<button class="sd-opt" data-diff="' + k + '">' + LABEL[k] + "</button>";
          })
          .join("") +
        "</div>" +
        '<div class="sd-grid" data-grid></div>' +
        '<div class="sd-pad" data-pad></div>' +
        '<div class="sd-bar">' +
        '<button class="sd-opt" data-act="pencil">✎ Pencil</button>' +
        '<button class="sd-opt" data-act="erase">Erase</button>' +
        '<button class="sd-opt" data-act="hint">Hint</button>' +
        '<span class="sd-stat" data-stat></span>' +
        "</div>";
      g.root.appendChild(wrap);
      g.data.wrap = wrap;
      g.data.gridEl = wrap.querySelector("[data-grid]");
      g.data.padEl = wrap.querySelector("[data-pad]");
      g.data.diff = PG.store.get("sd:diff", "medium");

      for (var n = 1; n <= 9; n++) {
        var b = document.createElement("button");
        b.className = "sd-n";
        b.textContent = n;
        b.setAttribute("data-n", n);
        g.data.padEl.appendChild(b);
      }

      wrap.addEventListener("click", function (e) {
        var diff = e.target.closest("[data-diff]");
        if (diff) {
          g.data.diff = diff.getAttribute("data-diff");
          PG.store.set("sd:diff", g.data.diff);
          return g.start();
        }
        var cell = e.target.closest("[data-i]");
        if (cell) {
          g.data.sel = +cell.getAttribute("data-i");
          return paint(g);
        }
        var num = e.target.closest("[data-n]");
        if (num) return enter(g, +num.getAttribute("data-n"));
        var act = e.target.closest("[data-act]");
        if (!act) return;
        if (act.dataset.act === "pencil") {
          g.data.pencil = !g.data.pencil;
          act.setAttribute("aria-pressed", g.data.pencil ? "true" : "false");
        } else if (act.dataset.act === "erase") {
          enter(g, 0);
        } else if (act.dataset.act === "hint") {
          hint(g);
        }
      });
    },

    start: function (g) {
      var d = g.data;
      var puzzle = generate(GIVENS[d.diff]);
      d.solution = puzzle.solution;
      d.given = puzzle.given;
      d.cells = puzzle.given.slice();
      d.marks = [];
      for (var i = 0; i < 81; i++) d.marks.push({});
      d.sel = -1;
      d.elapsed = 0;
      d.done = false;
      d.hints = 0;
      buildGrid(g);
      paint(g);
      Array.prototype.forEach.call(d.wrap.querySelectorAll("[data-diff]"), function (b) {
        b.setAttribute("aria-pressed", b.getAttribute("data-diff") === d.diff ? "true" : "false");
      });
    },

    update: function (g, dt) {
      var d = g.data;
      if (d.done) return;
      d.elapsed += dt;
      var s = d.wrap.querySelector("[data-stat]");
      if (s) {
        var best = PG.store.get("sd:best:" + d.diff, null);
        s.textContent =
          PG.formatTime(Math.floor(d.elapsed)) + "   ·   Best " + (best === null ? "—" : PG.formatTime(best));
      }
    },

    onKey: function (g, k) {
      var d = g.data;
      if (d.done) return;
      if (k >= "1" && k <= "9") return enter(g, +k);
      if (k === "backspace" || k === "delete" || k === "0") return enter(g, 0);
      if (k === "n") {
        d.pencil = !d.pencil;
        var b = d.wrap.querySelector('[data-act="pencil"]');
        if (b) b.setAttribute("aria-pressed", d.pencil ? "true" : "false");
        return;
      }
      var delta = { arrowleft: -1, arrowright: 1, arrowup: -9, arrowdown: 9 }[k];
      if (delta !== undefined) {
        d.sel = d.sel < 0 ? 40 : PG.clamp(d.sel + delta, 0, 80);
        paint(g);
      }
    },

    onResize: function (g) {
      if (g.data.cells) sizeGrid(g);
    }
  });

  /* ------------------------------------------------------------ solver -- */
  function rowOf(i) { return (i / 9) | 0; }
  function colOf(i) { return i % 9; }
  function boxOf(i) { return ((rowOf(i) / 3) | 0) * 3 + ((colOf(i) / 3) | 0); }

  function allowed(grid, i, v) {
    var r = rowOf(i),
      c = colOf(i),
      b = boxOf(i);
    for (var k = 0; k < 81; k++) {
      if (grid[k] !== v) continue;
      if (rowOf(k) === r || colOf(k) === c || boxOf(k) === b) return false;
    }
    return true;
  }

  function shuffled() {
    var a = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (var i = 8; i > 0; i--) {
      var j = (Math.random() * (i + 1)) | 0;
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function fill(grid, i) {
    if (i >= 81) return true;
    if (grid[i]) return fill(grid, i + 1);
    var nums = shuffled();
    for (var k = 0; k < 9; k++) {
      if (allowed(grid, i, nums[k])) {
        grid[i] = nums[k];
        if (fill(grid, i + 1)) return true;
        grid[i] = 0;
      }
    }
    return false;
  }

  /* Counts solutions but stops at two — that is all uniqueness needs. */
  function countSolutions(grid, limit) {
    var best = -1,
      bestOptions = null;
    for (var i = 0; i < 81; i++) {
      if (grid[i]) continue;
      var opts = [];
      for (var v = 1; v <= 9; v++) if (allowed(grid, i, v)) opts.push(v);
      if (!opts.length) return 0;
      if (bestOptions === null || opts.length < bestOptions.length) {
        best = i;
        bestOptions = opts;
        if (opts.length === 1) break;
      }
    }
    if (best === -1) return 1;

    var total = 0;
    for (var k = 0; k < bestOptions.length; k++) {
      grid[best] = bestOptions[k];
      total += countSolutions(grid, limit - total);
      grid[best] = 0;
      if (total >= limit) return total;
    }
    return total;
  }

  function generate(targetGivens) {
    var solution = new Array(81).fill(0);
    fill(solution, 0);

    var puzzle = solution.slice();
    var order = [];
    for (var i = 0; i < 81; i++) order.push(i);
    for (var s = 80; s > 0; s--) {
      var j = (Math.random() * (s + 1)) | 0;
      var t = order[s];
      order[s] = order[j];
      order[j] = t;
    }

    var givens = 81;
    for (var k = 0; k < order.length && givens > targetGivens; k++) {
      var idx = order[k];
      var backup = puzzle[idx];
      puzzle[idx] = 0;
      if (countSolutions(puzzle.slice(), 2) !== 1) {
        puzzle[idx] = backup;
      } else {
        givens--;
      }
    }
    return { solution: solution, given: puzzle };
  }

  /* --------------------------------------------------------------- ui -- */
  function buildGrid(g) {
    var el = g.data.gridEl;
    el.innerHTML = "";
    for (var i = 0; i < 81; i++) {
      var b = document.createElement("button");
      b.className =
        "sd-c" + (colOf(i) % 3 === 2 && colOf(i) !== 8 ? " b-r" : "") + (rowOf(i) % 3 === 2 && rowOf(i) !== 8 ? " b-b" : "");
      b.setAttribute("data-i", i);
      el.appendChild(b);
    }
    sizeGrid(g);
  }

  function sizeGrid(g) {
    var host = g.root.getBoundingClientRect();
    var cell = Math.max(20, Math.floor(Math.min((host.width - 30) / 9, (host.height - 150) / 9)));
    g.data.gridEl.style.setProperty("--sd-cell", cell + "px");
    g.data.wrap.style.setProperty("--sd-w", cell * 9 + 12 + "px");
    Array.prototype.forEach.call(g.data.gridEl.children, function (c) {
      c.style.width = cell + "px";
      c.style.height = cell + "px";
      c.style.fontSize = Math.round(cell * 0.55) + "px";
    });
  }

  function enter(g, v) {
    var d = g.data;
    if (d.done || d.sel < 0 || d.given[d.sel]) return;

    if (v === 0) {
      d.cells[d.sel] = 0;
      d.marks[d.sel] = {};
    } else if (d.pencil) {
      if (d.marks[d.sel][v]) delete d.marks[d.sel][v];
      else d.marks[d.sel][v] = true;
    } else {
      d.cells[d.sel] = d.cells[d.sel] === v ? 0 : v;
      d.marks[d.sel] = {};
      if (d.cells[d.sel]) {
        if (d.cells[d.sel] === d.solution[d.sel]) g.sfx.tone(660, 0.05, "triangle", 0.05);
        else g.sfx.tone(200, 0.12, "sawtooth", 0.05);
      }
    }
    paint(g);
    checkDone(g);
  }

  function hint(g) {
    var d = g.data;
    if (d.done) return;
    var blanks = [];
    for (var i = 0; i < 81; i++) if (!d.cells[i] || d.cells[i] !== d.solution[i]) blanks.push(i);
    if (!blanks.length) return;
    var pick = d.sel >= 0 && blanks.indexOf(d.sel) !== -1 ? d.sel : blanks[(Math.random() * blanks.length) | 0];
    d.cells[pick] = d.solution[pick];
    d.marks[pick] = {};
    d.hints++;
    d.elapsed += 30; // hints cost half a minute
    g.sfx.pick();
    PG.toast("Hint used — 30 seconds added", "clock");
    paint(g);
    checkDone(g);
  }

  function checkDone(g) {
    var d = g.data;
    for (var i = 0; i < 81; i++) if (d.cells[i] !== d.solution[i]) return;
    d.done = true;
    var time = Math.floor(d.elapsed);
    var key = "sd:best:" + d.diff;
    var prev = PG.store.get(key, null);
    if (prev === null || time < prev) PG.store.set(key, time);

    if (d.diff === "medium") {
      g.over({ won: true, title: "Solved", score: time, text: "Medium in " + PG.formatTime(time) + "." });
    } else {
      g.over({
        won: true,
        title: "Solved",
        text: LABEL[d.diff] + " in " + PG.formatTime(time) + ". Solve a Medium grid to set the site record."
      });
    }
  }

  function paint(g) {
    var d = g.data;
    var sel = d.sel;
    var selVal = sel >= 0 ? d.cells[sel] : 0;

    for (var i = 0; i < 81; i++) {
      var el = d.gridEl.children[i];
      var v = d.cells[i];
      var cls = "sd-c";
      if (colOf(i) % 3 === 2 && colOf(i) !== 8) cls += " b-r";
      if (rowOf(i) % 3 === 2 && rowOf(i) !== 8) cls += " b-b";
      if (d.given[i]) cls += " given";

      if (sel >= 0) {
        if (i === sel) cls += " sel";
        else if (rowOf(i) === rowOf(sel) || colOf(i) === colOf(sel) || boxOf(i) === boxOf(sel)) cls += " peer";
        if (selVal && v === selVal && i !== sel) cls += " same";
      }
      if (v && v !== d.solution[i]) cls += " bad";
      el.className = cls;

      if (v) {
        el.textContent = v;
      } else {
        var marks = Object.keys(d.marks[i]);
        if (marks.length) {
          var html = "";
          for (var n = 1; n <= 9; n++) html += "<span>" + (d.marks[i][n] ? n : "") + "</span>";
          el.innerHTML = '<div class="sd-marks">' + html + "</div>";
        } else {
          el.textContent = "";
        }
      }
    }

    // Grey out digits that are fully placed.
    var counts = {};
    for (var k = 0; k < 81; k++) if (d.cells[k]) counts[d.cells[k]] = (counts[d.cells[k]] || 0) + 1;
    Array.prototype.forEach.call(d.padEl.children, function (b) {
      b.classList.toggle("done", counts[+b.getAttribute("data-n")] >= 9);
    });
  }
})();
