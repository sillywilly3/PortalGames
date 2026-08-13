/* 2048 — DOM-rendered so tiles can animate with GPU transforms and the
 * numbers stay crisp at any zoom. Board persists between visits.
 */
(function () {
  "use strict";

  var N = 4;
  var GAP = 12;

  var TILE_STYLES = {
    2: ["#eee4da", "#6b6355"], 4: ["#ede0c8", "#6b6355"], 8: ["#f2b179", "#ffffff"],
    16: ["#f59563", "#ffffff"], 32: ["#f67c5f", "#ffffff"], 64: ["#f65e3b", "#ffffff"],
    128: ["#edcf72", "#ffffff"], 256: ["#edcc61", "#ffffff"], 512: ["#edc850", "#ffffff"],
    1024: ["#edc53f", "#ffffff"], 2048: ["#edc22e", "#ffffff"], 4096: ["#a855f7", "#ffffff"],
    8192: ["#7aa7ff", "#ffffff"]
  };

  var css =
    ".g2048{position:relative;background:#0d1526;border-radius:16px;padding:" + GAP + "px;" +
    "box-shadow:inset 0 0 0 1px rgba(255,255,255,.07)}" +
    ".g2048 .cellbg{position:absolute;border-radius:9px;background:rgba(255,255,255,.045)}" +
    ".g2048 .tile{position:absolute;display:grid;place-items:center;border-radius:9px;" +
    "font-weight:800;letter-spacing:-.03em;will-change:transform;" +
    "transition:transform .11s cubic-bezier(.22,1,.36,1)}" +
    ".g2048 .tile.new{animation:t-pop .16s cubic-bezier(.22,1,.36,1)}" +
    ".g2048 .tile.merged{animation:t-merge .18s cubic-bezier(.22,1,.36,1)}" +
    "@keyframes t-pop{from{transform:var(--tp) scale(.1);opacity:0}}" +
    "@keyframes t-merge{50%{transform:var(--tp) scale(1.16)}}" +
    "@media (prefers-reduced-motion:reduce){.g2048 .tile{transition:none}}";

  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  var nextId = 1;

  PG.mount({
    id: "2048",
    mode: "dom",
    autoStart: true,
    rKeyRestarts: false,
    pauseable: false,
    pauseOnBlur: false,

    setup: function (g) {
      var board = document.createElement("div");
      board.className = "g2048";
      g.root.appendChild(board);
      g.data.board = board;
      g.data.els = {};

      // Static cell backgrounds
      for (var i = 0; i < N * N; i++) {
        var c = document.createElement("div");
        c.className = "cellbg";
        board.appendChild(c);
      }
      g.data.bgCells = Array.prototype.slice.call(board.children);
      layout(g);
      window.addEventListener("resize", function () {
        layout(g);
        paint(g, true);
      });
    },

    onResize: function (g) {
      if (g.data.board) {
        layout(g);
        paint(g, true);
      }
    },

    start: function (g) {
      var d = g.data;
      var saved = PG.store.get("2048:state", null);
      if (saved && saved.grid && !d.started) {
        d.grid = saved.grid.map(function (row) {
          return row.map(function (v) {
            return v ? { v: v, id: nextId++ } : null;
          });
        });
        g.setScore(saved.score || 0);
      } else {
        d.grid = [];
        for (var y = 0; y < N; y++) d.grid.push(new Array(N).fill(null));
        addRandom(d);
        addRandom(d);
        g.setScore(0);
      }
      d.started = true;
      d.history = [];
      d.reached2048 = false;
      paint(g, true);
      save(g);
    },

    onKey: function (g, k) {
      if (g.state !== "playing") return;
      var dir = { arrowleft: 0, a: 0, arrowup: 1, w: 1, arrowright: 2, d: 2, arrowdown: 3, s: 3 }[k];
      if (dir !== undefined) {
        slide(g, dir);
        return;
      }
      if (k === "u") undo(g);
      if (k === "r") g.start();
    },

    onSwipe: function (g, dir) {
      if (g.state !== "playing") return;
      slide(g, { left: 0, up: 1, right: 2, down: 3 }[dir]);
    }
  });

  /* ---------------------------------------------------------- geometry -- */
  function layout(g) {
    var host = g.root.getBoundingClientRect();
    var size = Math.max(140, Math.min(host.width, host.height) - 16);
    var board = g.data.board;
    board.style.width = size + "px";
    board.style.height = size + "px";
    var cell = (size - GAP * (N + 1)) / N;
    g.data.cell = cell;
    g.data.fontBase = cell;

    g.data.bgCells.forEach(function (c, i) {
      if (!c.classList.contains("cellbg")) return;
      var x = i % N,
        y = (i / N) | 0;
      c.style.width = cell + "px";
      c.style.height = cell + "px";
      c.style.left = GAP + x * (cell + GAP) + "px";
      c.style.top = GAP + y * (cell + GAP) + "px";
    });
  }

  function pos(g, x, y) {
    var c = g.data.cell;
    return "translate(" + (GAP + x * (c + GAP)) + "px," + (GAP + y * (c + GAP)) + "px)";
  }

  /* ------------------------------------------------------------- model -- */
  function addRandom(d) {
    var free = [];
    for (var y = 0; y < N; y++)
      for (var x = 0; x < N; x++) if (!d.grid[y][x]) free.push([x, y]);
    if (!free.length) return null;
    var p = free[(Math.random() * free.length) | 0];
    var tile = { v: Math.random() < 0.9 ? 2 : 4, id: nextId++, isNew: true };
    d.grid[p[1]][p[0]] = tile;
    return tile;
  }

  function snapshot(d) {
    return {
      grid: d.grid.map(function (r) {
        return r.map(function (t) {
          return t ? t.v : 0;
        });
      })
    };
  }

  /* dir: 0 left, 1 up, 2 right, 3 down */
  function slide(g, dir) {
    var d = g.data;
    var before = JSON.stringify(snapshot(d).grid);
    d.history.push({ grid: snapshot(d).grid, score: g.score });
    if (d.history.length > 12) d.history.shift();

    var moved = false;
    var gained = 0;

    for (var i = 0; i < N; i++) {
      var line = [];
      for (var j = 0; j < N; j++) line.push(read(d, dir, i, j));

      var compact = line.filter(Boolean);
      var out = [];
      for (var k = 0; k < compact.length; k++) {
        if (k + 1 < compact.length && compact[k].v === compact[k + 1].v) {
          var merged = { v: compact[k].v * 2, id: compact[k].id, justMerged: true };
          gained += merged.v;
          out.push(merged);
          k++;
        } else {
          out.push({ v: compact[k].v, id: compact[k].id });
        }
      }
      while (out.length < N) out.push(null);
      for (var m = 0; m < N; m++) write(d, dir, i, m, out[m]);
    }

    if (JSON.stringify(snapshot(d).grid) !== before) {
      moved = true;
    } else {
      d.history.pop();
    }

    if (!moved) return;

    if (gained) {
      g.addScore(gained);
      g.sfx.tone(300 + Math.min(700, gained * 3), 0.06, "triangle", 0.06);
    } else {
      g.sfx.tone(220, 0.03, "square", 0.03);
    }

    addRandom(d);
    paint(g);
    save(g);

    if (!d.reached2048 && has2048(d)) {
      d.reached2048 = true;
      g.sfx.win();
      PG.toast("2048 reached — keep going for a bigger score", "star");
    }

    if (!canMove(d)) {
      g.over({ title: "No moves left", text: "The board is full and nothing can merge." });
    }
  }

  function read(d, dir, i, j) {
    if (dir === 0) return d.grid[i][j];
    if (dir === 2) return d.grid[i][N - 1 - j];
    if (dir === 1) return d.grid[j][i];
    return d.grid[N - 1 - j][i];
  }

  function write(d, dir, i, j, v) {
    if (dir === 0) d.grid[i][j] = v;
    else if (dir === 2) d.grid[i][N - 1 - j] = v;
    else if (dir === 1) d.grid[j][i] = v;
    else d.grid[N - 1 - j][i] = v;
  }

  function has2048(d) {
    for (var y = 0; y < N; y++)
      for (var x = 0; x < N; x++) if (d.grid[y][x] && d.grid[y][x].v >= 2048) return true;
    return false;
  }

  function canMove(d) {
    for (var y = 0; y < N; y++) {
      for (var x = 0; x < N; x++) {
        var t = d.grid[y][x];
        if (!t) return true;
        if (x + 1 < N && d.grid[y][x + 1] && d.grid[y][x + 1].v === t.v) return true;
        if (y + 1 < N && d.grid[y + 1][x] && d.grid[y + 1][x].v === t.v) return true;
      }
    }
    return false;
  }

  function undo(g) {
    var d = g.data;
    var prev = d.history.pop();
    if (!prev) return;
    d.grid = prev.grid.map(function (row) {
      return row.map(function (v) {
        return v ? { v: v, id: nextId++ } : null;
      });
    });
    g.setScore(prev.score);
    paint(g, true);
    save(g);
    g.sfx.blip();
  }

  function save(g) {
    PG.store.set("2048:state", { grid: snapshot(g.data).grid, score: g.score });
  }

  /* ------------------------------------------------------------- paint -- */
  function paint(g, instant) {
    var d = g.data;
    var seen = {};
    var cell = d.cell;

    for (var y = 0; y < N; y++) {
      for (var x = 0; x < N; x++) {
        var t = d.grid[y][x];
        if (!t) continue;
        seen[t.id] = true;
        var el = d.els[t.id];
        var tp = pos(g, x, y);

        if (!el) {
          el = document.createElement("div");
          el.className = "tile";
          d.board.appendChild(el);
          d.els[t.id] = el;
          el.style.transform = tp;
          if (!instant) el.classList.add("new");
        }

        var pal = TILE_STYLES[t.v] || ["#8b2fd6", "#ffffff"];
        var digits = String(t.v).length;
        el.style.width = cell + "px";
        el.style.height = cell + "px";
        el.style.background = pal[0];
        el.style.color = pal[1];
        el.style.fontSize = Math.round(cell * (digits > 3 ? 0.3 : digits > 2 ? 0.38 : 0.46)) + "px";
        el.style.setProperty("--tp", tp);
        el.textContent = t.v;

        if (instant) {
          el.style.transition = "none";
          el.style.transform = tp;
          void el.offsetWidth;
          el.style.transition = "";
        } else {
          el.style.transform = tp;
        }

        if (t.justMerged) {
          el.classList.remove("merged");
          void el.offsetWidth;
          el.classList.add("merged");
          t.justMerged = false;
        }
        if (t.isNew) {
          el.classList.remove("new");
          void el.offsetWidth;
          el.classList.add("new");
          t.isNew = false;
        }
      }
    }

    Object.keys(d.els).forEach(function (id) {
      if (!seen[id]) {
        d.els[id].remove();
        delete d.els[id];
      }
    });
  }
})();
