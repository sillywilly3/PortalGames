/* Minesweeper — DOM grid.
 * First click is always safe (mines are laid after it, avoiding the clicked
 * cell and its neighbours), and chording works on satisfied numbers.
 *
 * Only Intermediate times feed the site-wide best, so the leaderboard figure
 * always means the same thing; per-difficulty bests are shown in the board header.
 */
(function () {
  "use strict";

  var LEVELS = {
    beginner: { w: 9, h: 9, mines: 10, label: "Beginner" },
    intermediate: { w: 16, h: 16, mines: 40, label: "Intermediate" },
    expert: { w: 20, h: 20, mines: 90, label: "Expert" }
  };

  var NUM_COLORS = ["", "#60a5fa", "#34d399", "#f87171", "#c084fc", "#fbbf24", "#22d3ee", "#f0f8ff", "#9fabc6"];

  var style = document.createElement("style");
  style.textContent =
    ".ms{display:flex;flex-direction:column;gap:10px;align-items:center;padding:10px}" +
    ".ms-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:center}" +
    ".ms-lvl{height:28px;padding:0 11px;border-radius:999px;border:1px solid var(--border);" +
    "background:var(--surface);color:var(--muted);font-size:12.5px;font-weight:650}" +
    ".ms-lvl[aria-pressed=true]{background:var(--brand-grad);color:#fff;border-color:transparent}" +
    ".ms-stat{display:flex;align-items:center;gap:6px;padding:3px 11px;border-radius:8px;" +
    "background:rgba(255,255,255,.06);font-variant-numeric:tabular-nums;font-weight:750;font-size:14px}" +
    ".ms-grid{display:grid;gap:2px;background:rgba(255,255,255,.06);padding:5px;border-radius:10px;" +
    "box-shadow:inset 0 0 0 1px rgba(255,255,255,.07)}" +
    ".ms-c{display:grid;place-items:center;border-radius:3px;background:#7aa7ff45;" +
    "font-weight:800;line-height:1;user-select:none;cursor:pointer;border:none;color:#f0f8ff;padding:0;" +
    "transition:background .1s}" +
    ".ms-c:hover:not(.open){background:#7aa7ff6b}" +
    ".ms-c.open{background:rgba(255,255,255,.05);cursor:default}" +
    ".ms-c.mine{background:#ef4444}" +
    ".ms-c.wrong{background:#7f1d1d}" +
    ".ms-c.flag{background:#7aa7ff45}";
  document.head.appendChild(style);

  PG.mount({
    id: "minesweeper",
    mode: "dom",
    autoStart: true,
    pauseable: false,
    pauseOnBlur: false,
    rKeyRestarts: false,
    allowContextMenu: false,
    swipe: false,

    setup: function (g) {
      var wrap = document.createElement("div");
      wrap.className = "ms";
      wrap.innerHTML =
        '<div class="ms-bar">' +
        Object.keys(LEVELS)
          .map(function (k) {
            return '<button class="ms-lvl" data-lvl="' + k + '">' + LEVELS[k].label + "</button>";
          })
          .join("") +
        "</div>" +
        '<div class="ms-bar">' +
        '<span class="ms-stat">⚑ <b data-mines>0</b></span>' +
        '<span class="ms-stat">⏱ <b data-timer>0.0</b></span>' +
        '<span class="ms-stat" data-pb>Best —</span>' +
        "</div>" +
        '<div class="ms-grid" data-grid></div>';
      g.root.appendChild(wrap);
      g.data.wrap = wrap;
      g.data.gridEl = wrap.querySelector("[data-grid]");
      g.data.level = PG.store.get("ms:level", "intermediate");

      wrap.addEventListener("click", function (e) {
        var lvl = e.target.closest("[data-lvl]");
        if (lvl) {
          g.data.level = lvl.getAttribute("data-lvl");
          PG.store.set("ms:level", g.data.level);
          g.start();
        }
      });
    },

    start: function (g) {
      var d = g.data;
      var cfg = LEVELS[d.level];
      d.cfg = cfg;
      d.first = true;
      d.dead = false;
      d.won = false;
      d.elapsed = 0;
      d.flags = 0;
      d.revealed = 0;
      d.cells = [];
      for (var i = 0; i < cfg.w * cfg.h; i++) {
        d.cells.push({ mine: false, open: false, flag: false, n: 0 });
      }
      buildGrid(g);
      paintStats(g);
      Array.prototype.forEach.call(d.wrap.querySelectorAll("[data-lvl]"), function (b) {
        b.setAttribute("aria-pressed", b.getAttribute("data-lvl") === d.level ? "true" : "false");
      });
    },

    update: function (g, dt) {
      var d = g.data;
      if (d.first || d.dead || d.won) return;
      d.elapsed += dt;
      var el = d.wrap.querySelector("[data-timer]");
      if (el) el.textContent = d.elapsed.toFixed(1);
    },

    onKey: function (g, k) {
      if (k === "r") g.start();
    },

    onResize: function (g) {
      if (g.data.cfg) sizeGrid(g);
    }
  });

  /* -------------------------------------------------------------- grid -- */
  function buildGrid(g) {
    var d = g.data;
    var cfg = d.cfg;
    var el = d.gridEl;
    el.innerHTML = "";
    el.style.gridTemplateColumns = "repeat(" + cfg.w + ", var(--ms-cell))";

    var frag = document.createDocumentFragment();
    for (var i = 0; i < cfg.w * cfg.h; i++) {
      var b = document.createElement("button");
      b.className = "ms-c";
      b.setAttribute("data-i", i);
      b.setAttribute("aria-label", "hidden square");
      frag.appendChild(b);
    }
    el.appendChild(frag);
    sizeGrid(g);

    if (!el.dataset.wired) {
      el.dataset.wired = "1";
      var longPress = null;

      el.addEventListener("contextmenu", function (e) {
        e.preventDefault();
        var c = e.target.closest("[data-i]");
        if (c) toggleFlag(g, +c.getAttribute("data-i"));
      });

      el.addEventListener("pointerdown", function (e) {
        var c = e.target.closest("[data-i]");
        if (!c) return;
        if (e.pointerType === "touch") {
          var i = +c.getAttribute("data-i");
          longPress = setTimeout(function () {
            longPress = null;
            toggleFlag(g, i);
            if (navigator.vibrate) navigator.vibrate(18);
          }, 380);
        }
      });

      ["pointerup", "pointercancel", "pointerleave"].forEach(function (ev) {
        el.addEventListener(ev, function () {
          if (longPress) {
            clearTimeout(longPress);
            longPress = null;
          } else if (ev === "pointerup") {
            // A long-press already handled this touch.
            g.data.suppressClick = true;
            setTimeout(function () { g.data.suppressClick = false; }, 0);
          }
        });
      });

      el.addEventListener("click", function (e) {
        var c = e.target.closest("[data-i]");
        if (!c || g.data.suppressClick) return;
        reveal(g, +c.getAttribute("data-i"));
      });
    }
  }

  function sizeGrid(g) {
    var d = g.data;
    var host = g.root.getBoundingClientRect();
    var avail = Math.min(host.width - 24, host.height - 110);
    var cell = Math.max(14, Math.floor((avail - (d.cfg.w + 1) * 2) / d.cfg.w));
    d.gridEl.style.setProperty("--ms-cell", cell + "px");
    d.gridEl.style.gridTemplateColumns = "repeat(" + d.cfg.w + ", " + cell + "px)";
    Array.prototype.forEach.call(d.gridEl.children, function (c) {
      c.style.width = cell + "px";
      c.style.height = cell + "px";
      c.style.fontSize = Math.round(cell * 0.6) + "px";
    });
  }

  function idx(g, x, y) {
    return y * g.data.cfg.w + x;
  }

  function neighbours(g, i) {
    var cfg = g.data.cfg;
    var x = i % cfg.w,
      y = (i / cfg.w) | 0;
    var out = [];
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        var nx = x + dx,
          ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= cfg.w || ny >= cfg.h) continue;
        out.push(idx(g, nx, ny));
      }
    }
    return out;
  }

  function layMines(g, safeIndex) {
    var d = g.data;
    var forbidden = {};
    forbidden[safeIndex] = true;
    neighbours(g, safeIndex).forEach(function (n) {
      forbidden[n] = true;
    });

    var pool = [];
    for (var i = 0; i < d.cells.length; i++) if (!forbidden[i]) pool.push(i);
    for (var k = pool.length - 1; k > 0; k--) {
      var j = (Math.random() * (k + 1)) | 0;
      var t = pool[k];
      pool[k] = pool[j];
      pool[j] = t;
    }
    pool.slice(0, d.cfg.mines).forEach(function (i) {
      d.cells[i].mine = true;
    });

    d.cells.forEach(function (c, i) {
      c.n = neighbours(g, i).filter(function (n) {
        return d.cells[n].mine;
      }).length;
    });
  }

  /* ------------------------------------------------------------ actions -- */
  function toggleFlag(g, i) {
    var d = g.data;
    var c = d.cells[i];
    if (d.dead || d.won || c.open) return;
    c.flag = !c.flag;
    d.flags += c.flag ? 1 : -1;
    paintCell(g, i);
    paintStats(g);
    g.sfx.blip();
  }

  function reveal(g, i) {
    var d = g.data;
    if (d.dead || d.won) return;
    var c = d.cells[i];

    if (c.open) {
      chord(g, i);
      return;
    }
    if (c.flag) return;

    if (d.first) {
      layMines(g, i);
      d.first = false;
    }

    if (c.mine) return boom(g, i);

    flood(g, i);
    paintStats(g);
    checkWin(g);
    g.sfx.tone(500, 0.04, "square", 0.04);
  }

  function flood(g, start) {
    var d = g.data;
    var stack = [start];
    while (stack.length) {
      var i = stack.pop();
      var c = d.cells[i];
      if (c.open || c.flag || c.mine) continue;
      c.open = true;
      d.revealed++;
      paintCell(g, i);
      if (c.n === 0) {
        neighbours(g, i).forEach(function (n) {
          if (!d.cells[n].open) stack.push(n);
        });
      }
    }
  }

  /* Clicking a fully-flagged number opens its remaining neighbours. */
  function chord(g, i) {
    var d = g.data;
    var c = d.cells[i];
    if (!c.open || c.n === 0) return;
    var ns = neighbours(g, i);
    var flagged = ns.filter(function (n) {
      return d.cells[n].flag;
    }).length;
    if (flagged !== c.n) return;

    var hitMine = -1;
    ns.forEach(function (n) {
      var nc = d.cells[n];
      if (nc.flag || nc.open) return;
      if (nc.mine) hitMine = n;
      else flood(g, n);
    });
    if (hitMine >= 0) return boom(g, hitMine);
    paintStats(g);
    checkWin(g);
  }

  function boom(g, i) {
    var d = g.data;
    d.dead = true;
    d.cells[i].open = true;
    d.cells.forEach(function (c, j) {
      if (c.mine && !c.flag) {
        c.open = true;
        paintCell(g, j, j === i ? "mine" : "");
      } else if (c.flag && !c.mine) {
        paintCell(g, j, "wrong");
      }
    });
    g.sfx.thud();
    g.over({ title: "Boom", text: "You hit a mine on " + d.cfg.label + "." });
  }

  function checkWin(g) {
    var d = g.data;
    var total = d.cfg.w * d.cfg.h - d.cfg.mines;
    if (d.revealed < total) return;
    d.won = true;
    d.cells.forEach(function (c, j) {
      if (c.mine && !c.flag) {
        c.flag = true;
        d.flags++;
        paintCell(g, j);
      }
    });
    paintStats(g);

    var time = Math.round(d.elapsed * 10) / 10;
    var key = "ms:best:" + d.level;
    var prev = PG.store.get(key, null);
    if (prev === null || time < prev) {
      PG.store.set(key, time);
      paintStats(g);
    }

    // Only Intermediate counts toward the site-wide best.
    if (d.level === "intermediate") {
      g.over({ won: true, title: "Cleared", score: time, text: "Intermediate in " + time.toFixed(1) + "s." });
    } else {
      g.over({
        won: true,
        title: "Cleared",
        text: d.cfg.label + " in " + time.toFixed(1) + "s. Play Intermediate to set the site record."
      });
    }
  }

  /* ------------------------------------------------------------- paint -- */
  function paintCell(g, i, extra) {
    var d = g.data;
    var c = d.cells[i];
    var el = d.gridEl.children[i];
    if (!el) return;
    el.className = "ms-c" + (c.open ? " open" : "") + (c.flag && !c.open ? " flag" : "") + (extra ? " " + extra : "");
    if (c.flag && !c.open) {
      el.textContent = "⚑";
      el.style.color = "#f87171";
      el.setAttribute("aria-label", "flagged");
    } else if (c.open && c.mine) {
      el.textContent = "✸";
      el.style.color = "#1a0505";
      el.setAttribute("aria-label", "mine");
    } else if (c.open && c.n > 0) {
      el.textContent = c.n;
      el.style.color = NUM_COLORS[c.n];
      el.setAttribute("aria-label", c.n + " adjacent mines");
    } else {
      el.textContent = "";
      el.setAttribute("aria-label", c.open ? "empty" : "hidden square");
    }
  }

  function paintStats(g) {
    var d = g.data;
    var m = d.wrap.querySelector("[data-mines]");
    if (m) m.textContent = Math.max(0, d.cfg.mines - d.flags);
    var t = d.wrap.querySelector("[data-timer]");
    if (t) t.textContent = d.elapsed.toFixed(1);
    var pb = d.wrap.querySelector("[data-pb]");
    if (pb) {
      var best = PG.store.get("ms:best:" + d.level, null);
      pb.textContent = "Best " + (best === null ? "—" : best.toFixed(1) + "s");
    }
  }
})();
