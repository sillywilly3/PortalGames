/* Stacks — falling-block puzzle.
 * Seven-bag randomiser, SRS rotation with wall kicks, hold queue, ghost piece,
 * lock delay and DAS. Board is 10x20 with a hidden two-row spawn zone.
 */
(function () {
  "use strict";

  var COLS = 10,
    ROWS = 20;
  var CELL = 26;
  var BX = 22,
    BY = 44; // board origin
  var W = 480,
    H = 600;

  var SHAPES = {
    I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
    L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
    O: [[1, 1], [1, 1]],
    S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
    T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
    Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]]
  };

  var COLORS = {
    I: "#22d3ee", J: "#4f7dff", L: "#f59e0b", O: "#facc15",
    S: "#34d399", T: "#a855f7", Z: "#f43f5e"
  };

  var TYPES = ["I", "J", "L", "O", "S", "T", "Z"];

  /* SRS kick tables: offsets tried in order when a rotation is blocked. */
  var KICKS_JLSTZ = {
    "0>1": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    "1>0": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    "1>2": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    "2>1": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    "2>3": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    "3>2": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    "3>0": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    "0>3": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]]
  };

  var KICKS_I = {
    "0>1": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
    "1>0": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
    "1>2": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
    "2>1": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    "2>3": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
    "3>2": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
    "3>0": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    "0>3": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]]
  };

  /* Gravity in seconds per cell, indexed by level. */
  function gravity(level) {
    var t = Math.pow(0.8 - (level - 1) * 0.007, level - 1);
    return Math.max(0.02, t);
  }

  function rotateCW(m) {
    var n = m.length;
    var out = [];
    for (var y = 0; y < n; y++) {
      out.push([]);
      for (var x = 0; x < n; x++) out[y].push(m[n - 1 - x][y]);
    }
    return out;
  }

  function rotations(type) {
    var list = [SHAPES[type]];
    for (var i = 1; i < 4; i++) list.push(rotateCW(list[i - 1]));
    return list;
  }

  var ROT = {};
  TYPES.forEach(function (t) {
    ROT[t] = rotations(t);
  });

  function cellsOf(piece) {
    var m = ROT[piece.type][piece.r];
    var out = [];
    for (var y = 0; y < m.length; y++) {
      for (var x = 0; x < m.length; x++) {
        if (m[y][x]) out.push([piece.x + x, piece.y + y]);
      }
    }
    return out;
  }

  PG.mount({
    id: "stacks",
    width: W,
    height: H,
    letterbox: "#0b1120",
    swipe: false,

    start: function (g) {
      var d = g.data;
      d.grid = [];
      for (var y = 0; y < ROWS; y++) {
        d.grid.push(new Array(COLS).fill(null));
      }
      d.bag = [];
      d.queue = [];
      for (var i = 0; i < 5; i++) d.queue.push(nextType(d));
      d.hold = null;
      d.canHold = true;
      d.lines = 0;
      d.level = 1;
      d.fall = 0;
      d.lockTimer = 0;
      d.lockResets = 0;
      d.das = { dir: 0, timer: 0, repeat: 0 };
      d.clearing = null;
      d.flash = 0;
      spawn(g);
    },

    onKey: function (g, k) {
      var d = g.data;
      if (g.state !== "playing" || d.clearing) return;
      if (k === "arrowleft" || k === "a") startDas(g, -1);
      else if (k === "arrowright" || k === "d") startDas(g, 1);
      else if (k === "arrowup" || k === "x" || k === "w") rotate(g, 1);
      else if (k === "z") rotate(g, -1);
      else if (k === "arrowdown" || k === "s") softDrop(g);
      else if (k === "space") hardDrop(g);
      else if (k === "c" || k === "shift") hold(g);
    },

    onKeyUp: function (g, k) {
      var d = g.data;
      if (!d.das) return;
      if ((k === "arrowleft" || k === "a") && d.das.dir === -1) d.das.dir = 0;
      if ((k === "arrowright" || k === "d") && d.das.dir === 1) d.das.dir = 0;
    },

    update: function (g, dt) {
      var d = g.data;

      if (d.flash > 0) d.flash = Math.max(0, d.flash - dt * 4);

      /* Line-clear pause: hold the cleared rows on screen briefly. */
      if (d.clearing) {
        d.clearing.t -= dt;
        if (d.clearing.t <= 0) {
          finishClear(g);
        }
        return;
      }

      // Delayed auto-shift
      if (d.das.dir !== 0) {
        d.das.timer += dt;
        if (d.das.timer > 0.15) {
          d.das.repeat += dt;
          while (d.das.repeat > 0.04) {
            d.das.repeat -= 0.04;
            move(g, d.das.dir, 0);
          }
        }
      }

      var g0 = gravity(d.level) * (g.keys.arrowdown || g.keys.s ? 0.08 : 1);
      d.fall += dt;
      while (d.fall >= g0) {
        d.fall -= g0;
        if (!move(g, 0, 1)) break;
      }

      // Lock delay: the piece gets a moment to be nudged once it lands.
      if (!fits(d, { type: d.piece.type, r: d.piece.r, x: d.piece.x, y: d.piece.y + 1 })) {
        d.lockTimer += dt;
        if (d.lockTimer > 0.5 || d.lockResets > 15) lock(g);
      } else {
        d.lockTimer = 0;
      }
    },

    draw: function (g, ctx) {
      var d = g.data;
      ctx.fillStyle = "#0b1120";
      ctx.fillRect(0, 0, W, H);

      drawWell(ctx);
      if (!d.grid) return;

      // Settled blocks
      for (var y = 0; y < ROWS; y++) {
        for (var x = 0; x < COLS; x++) {
          if (d.grid[y][x]) drawCell(ctx, BX + x * CELL, BY + y * CELL, CELL, d.grid[y][x], 1);
        }
      }

      if (d.clearing) {
        ctx.fillStyle = "rgba(255,255,255," + (0.15 + d.clearing.t * 1.6) + ")";
        d.clearing.rows.forEach(function (r) {
          ctx.fillRect(BX, BY + r * CELL, COLS * CELL, CELL);
        });
      } else if (d.piece) {
        // Ghost
        var ghost = { type: d.piece.type, r: d.piece.r, x: d.piece.x, y: d.piece.y };
        while (fits(d, { type: ghost.type, r: ghost.r, x: ghost.x, y: ghost.y + 1 })) ghost.y++;
        cellsOf(ghost).forEach(function (c) {
          if (c[1] < 0) return;
          ctx.strokeStyle = "rgba(255,255,255,0.22)";
          ctx.lineWidth = 2;
          ctx.strokeRect(BX + c[0] * CELL + 2.5, BY + c[1] * CELL + 2.5, CELL - 5, CELL - 5);
        });

        cellsOf(d.piece).forEach(function (c) {
          if (c[1] < 0) return;
          drawCell(ctx, BX + c[0] * CELL, BY + c[1] * CELL, CELL, COLORS[d.piece.type], 1);
        });
      }

      drawPanels(g, ctx);
      g.fx.draw(ctx);
    }
  });

  /* ------------------------------------------------------------- pieces -- */
  function nextType(d) {
    if (!d.bag.length) {
      d.bag = TYPES.slice();
      for (var i = d.bag.length - 1; i > 0; i--) {
        var j = (Math.random() * (i + 1)) | 0;
        var t = d.bag[i];
        d.bag[i] = d.bag[j];
        d.bag[j] = t;
      }
    }
    return d.bag.pop();
  }

  function spawn(g, type) {
    var d = g.data;
    var t = type || d.queue.shift();
    if (!type) d.queue.push(nextType(d));
    var size = ROT[t][0].length;
    d.piece = { type: t, r: 0, x: Math.floor((COLS - size) / 2), y: t === "I" ? -1 : -2 };
    d.lockTimer = 0;
    d.lockResets = 0;
    d.fall = 0;
    if (!fits(d, d.piece)) {
      g.over({ title: "Topped out", text: d.lines + " lines cleared." });
    }
  }

  function fits(d, piece) {
    var m = ROT[piece.type][piece.r];
    for (var y = 0; y < m.length; y++) {
      for (var x = 0; x < m.length; x++) {
        if (!m[y][x]) continue;
        var gx = piece.x + x,
          gy = piece.y + y;
        if (gx < 0 || gx >= COLS || gy >= ROWS) return false;
        if (gy >= 0 && d.grid[gy][gx]) return false;
      }
    }
    return true;
  }

  function startDas(g, dir) {
    var d = g.data;
    d.das.dir = dir;
    d.das.timer = 0;
    d.das.repeat = 0;
    move(g, dir, 0);
  }

  function move(g, dx, dy) {
    var d = g.data;
    var p = { type: d.piece.type, r: d.piece.r, x: d.piece.x + dx, y: d.piece.y + dy };
    if (!fits(d, p)) return false;
    d.piece = p;
    if (dx !== 0) {
      d.lockTimer = 0;
      d.lockResets++;
      g.sfx.tone(320, 0.03, "square", 0.03);
    }
    return true;
  }

  function rotate(g, dir) {
    var d = g.data;
    var from = d.piece.r;
    var to = (from + (dir > 0 ? 1 : 3)) % 4;
    if (d.piece.type === "O") return;
    var table = d.piece.type === "I" ? KICKS_I : KICKS_JLSTZ;
    var kicks = table[from + ">" + to] || [[0, 0]];
    for (var i = 0; i < kicks.length; i++) {
      var p = { type: d.piece.type, r: to, x: d.piece.x + kicks[i][0], y: d.piece.y - kicks[i][1] };
      if (fits(d, p)) {
        d.piece = p;
        d.lockTimer = 0;
        d.lockResets++;
        g.sfx.tone(520, 0.04, "square", 0.035);
        return;
      }
    }
  }

  function softDrop(g) {
    if (move(g, 0, 1)) g.addScore(1);
  }

  function hardDrop(g) {
    var d = g.data;
    var n = 0;
    while (move(g, 0, 1)) n++;
    g.addScore(n * 2);
    g.sfx.thud();
    lock(g);
  }

  function hold(g) {
    var d = g.data;
    if (!d.canHold) return;
    var cur = d.piece.type;
    if (d.hold) {
      var swap = d.hold;
      d.hold = cur;
      spawn(g, swap);
    } else {
      d.hold = cur;
      spawn(g);
    }
    d.canHold = false;
    g.sfx.blip();
  }

  function lock(g) {
    var d = g.data;
    var cells = cellsOf(d.piece);
    for (var i = 0; i < cells.length; i++) {
      var c = cells[i];
      if (c[1] < 0) {
        g.over({ title: "Topped out", text: d.lines + " lines cleared." });
        return;
      }
      d.grid[c[1]][c[0]] = COLORS[d.piece.type];
    }

    var rows = [];
    for (var y = 0; y < ROWS; y++) {
      if (d.grid[y].every(function (v) { return v; })) rows.push(y);
    }

    if (rows.length) {
      d.clearing = { rows: rows, t: 0.22 };
      g.fx.burst(BX + COLS * CELL / 2, BY + rows[0] * CELL, 26 * rows.length, {
        color: ["#ffffff", "#7aa7ff", "#a855f7"],
        speed: 240,
        life: 0.7,
        size: 4
      });
      if (rows.length === 4) g.sfx.win();
      else g.sfx.good();
    } else {
      d.canHold = true;
      spawn(g);
    }
  }

  function finishClear(g) {
    var d = g.data;
    var rows = d.clearing.rows;
    rows.sort(function (a, b) { return a - b; });
    rows.forEach(function (r) {
      d.grid.splice(r, 1);
      d.grid.unshift(new Array(COLS).fill(null));
    });

    var points = [0, 100, 300, 500, 800][rows.length] * d.level;
    g.addScore(points);
    d.lines += rows.length;
    var newLevel = Math.floor(d.lines / 10) + 1;
    if (newLevel > d.level) {
      d.level = newLevel;
      d.flash = 1;
    }
    d.clearing = null;
    d.canHold = true;
    spawn(g);
  }

  /* ------------------------------------------------------------ drawing -- */
  function drawWell(ctx) {
    var w = COLS * CELL,
      h = ROWS * CELL;
    ctx.fillStyle = "#080d1a";
    PG.draw.roundRect(ctx, BX - 6, BY - 6, w + 12, h + 12, 10);
    ctx.fill();
    ctx.strokeStyle = "rgba(122,167,255,0.28)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,255,255,0.035)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var x = 1; x < COLS; x++) {
      ctx.moveTo(BX + x * CELL, BY);
      ctx.lineTo(BX + x * CELL, BY + h);
    }
    for (var y = 1; y < ROWS; y++) {
      ctx.moveTo(BX, BY + y * CELL);
      ctx.lineTo(BX + w, BY + y * CELL);
    }
    ctx.stroke();
  }

  function drawCell(ctx, x, y, s, color, alpha) {
    ctx.globalAlpha = alpha;
    PG.draw.roundRect(ctx, x + 1, y + 1, s - 2, s - 2, 4);
    ctx.fillStyle = color;
    ctx.fill();
    // Top-left highlight gives the blocks a bevel without a texture.
    ctx.beginPath();
    ctx.moveTo(x + 3, y + s - 4);
    ctx.lineTo(x + 3, y + 3);
    ctx.lineTo(x + s - 4, y + 3);
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawMini(ctx, type, cx, cy, cell) {
    var m = ROT[type][0];
    var n = m.length;
    var minX = n, maxX = -1, minY = n, maxY = -1;
    for (var y = 0; y < n; y++)
      for (var x = 0; x < n; x++)
        if (m[y][x]) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
    var w = (maxX - minX + 1) * cell,
      h = (maxY - minY + 1) * cell;
    for (var yy = minY; yy <= maxY; yy++) {
      for (var xx = minX; xx <= maxX; xx++) {
        if (m[yy][xx]) {
          drawCell(ctx, cx - w / 2 + (xx - minX) * cell, cy - h / 2 + (yy - minY) * cell, cell, COLORS[type], 1);
        }
      }
    }
  }

  function drawPanels(g, ctx) {
    var d = g.data;
    var px = BX + COLS * CELL + 22;
    var pw = W - px - 20;

    function box(y, h, label) {
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      PG.draw.roundRect(ctx, px, y, pw, h, 12);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      ctx.stroke();
      PG.draw.text(ctx, label, px + 12, y + 16, 10, "#74809c", "left", 800);
    }

    box(BY, 74, "HOLD");
    if (d.hold) drawMini(ctx, d.hold, px + pw / 2, BY + 46, 17);

    box(BY + 86, 210, "NEXT");
    for (var i = 0; i < Math.min(4, d.queue.length); i++) {
      drawMini(ctx, d.queue[i], px + pw / 2, BY + 128 + i * 50, 15);
    }

    box(BY + 308, 62, "LINES");
    PG.draw.text(ctx, String(d.lines), px + pw / 2, BY + 348, 26, "#f0f8ff", "center", 800);

    box(BY + 382, 62, "LEVEL");
    PG.draw.text(ctx, String(d.level), px + pw / 2, BY + 422, 26, d.flash > 0 ? "#7aa7ff" : "#f0f8ff", "center", 800);

    PG.draw.text(ctx, "SCORE", W / 2, 18, 10, "#74809c", "center", 800);
    PG.draw.text(ctx, g.score.toLocaleString(), W / 2, 34, 22, "#f0f8ff", "center", 800);
  }
})();
