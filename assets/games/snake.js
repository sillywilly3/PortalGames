/* Neon Snake — grid logic, interpolated rendering.
 * Turns are queued rather than applied instantly, so a fast double-tap round a
 * corner can never fold the snake back into itself.
 */
(function () {
  "use strict";

  var GRID = 20;
  var W = 600,
    H = 600;
  var CELL = W / GRID;

  var DIRS = {
    arrowleft: [-1, 0], a: [-1, 0],
    arrowright: [1, 0], d: [1, 0],
    arrowup: [0, -1], w: [0, -1],
    arrowdown: [0, 1], s: [0, 1]
  };

  PG.mount({
    id: "snake",
    width: W,
    height: H,
    letterbox: "#0b1120",

    start: function (g) {
      var d = g.data;
      var mid = GRID >> 1;
      d.body = [[mid - 2, mid], [mid - 1, mid], [mid, mid]]; // tail .. head
      d.dir = [1, 0];
      d.queue = [];
      d.grow = 0;
      d.step = 0.16;
      d.acc = 0;
      d.gold = null;
      d.goldTimer = 6 + Math.random() * 6;
      d.apple = freeCell(d);
      g.setScore(d.body.length);
    },

    onKey: function (g, k) {
      var d = g.data;
      var nd = DIRS[k];
      if (!nd || g.state !== "playing") return;
      var last = d.queue.length ? d.queue[d.queue.length - 1] : d.dir;
      if (nd[0] === -last[0] && nd[1] === -last[1]) return; // no instant reverse
      if (nd[0] === last[0] && nd[1] === last[1]) return;
      if (d.queue.length < 3) d.queue.push(nd);
    },

    update: function (g, dt) {
      var d = g.data;

      d.goldTimer -= dt;
      if (!d.gold && d.goldTimer <= 0) {
        d.gold = { cell: freeCell(d), life: 5.5 };
        g.sfx.tone(1100, 0.07, "triangle", 0.05);
      }
      if (d.gold) {
        d.gold.life -= dt;
        if (d.gold.life <= 0) {
          d.gold = null;
          d.goldTimer = 8 + Math.random() * 8;
        }
      }

      d.acc += dt;
      while (d.acc >= d.step) {
        d.acc -= d.step;
        stepSnake(g);
        if (g.state !== "playing") return;
      }
    },

    draw: function (g, ctx) {
      var d = g.data;
      drawBoard(ctx);
      if (!d.body) return;

      var t = PG.clamp(d.acc / d.step, 0, 1);

      // Apples
      drawApple(ctx, d.apple, "#ef4444", 1);
      if (d.gold) {
        var pulse = 0.6 + 0.4 * Math.sin(g.time * 9);
        drawApple(ctx, d.gold.cell, "#facc15", pulse, d.gold.life < 1.6 && Math.floor(g.time * 8) % 2 === 0 ? 0.25 : 1);
      }

      // Body drawn as one rounded polyline, interpolated toward the next cell.
      var pts = [];
      for (var i = 0; i < d.body.length; i++) {
        var c = d.body[i];
        var x = c[0],
          y = c[1];
        if (i === d.body.length - 1) {
          x += d.dir[0] * t;
          y += d.dir[1] * t;
        } else if (i === 0 && d.grow <= 0) {
          var nxt = d.body[1];
          x += (nxt[0] - c[0]) * t;
          y += (nxt[1] - c[1]) * t;
        }
        pts.push([x * CELL + CELL / 2, y * CELL + CELL / 2]);
      }

      // Wrapping never happens in this game, but a long jump would look wrong
      // if it did, so segments are drawn in continuous runs.
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.strokeStyle = "rgba(52,211,153,0.25)";
      ctx.lineWidth = CELL * 0.95;
      stroke(ctx, pts);

      var grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, "#22c55e");
      grad.addColorStop(1, "#38bdf8");
      ctx.strokeStyle = grad;
      ctx.lineWidth = CELL * 0.66;
      stroke(ctx, pts);

      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.lineWidth = CELL * 0.2;
      stroke(ctx, pts);

      // Head
      var head = pts[pts.length - 1];
      ctx.fillStyle = "#eafff3";
      ctx.beginPath();
      ctx.arc(head[0], head[1], CELL * 0.36, 0, Math.PI * 2);
      ctx.fill();
      var ex = d.dir[0] * CELL * 0.13,
        ey = d.dir[1] * CELL * 0.13;
      var px = -d.dir[1] * CELL * 0.13,
        py = d.dir[0] * CELL * 0.13;
      ctx.fillStyle = "#0b1120";
      [[1, 1], [-1, -1]].forEach(function (s) {
        ctx.beginPath();
        ctx.arc(head[0] + ex + px * s[0], head[1] + ey + py * s[0], CELL * 0.075, 0, Math.PI * 2);
        ctx.fill();
      });

      g.fx.draw(ctx);
    }
  });

  function stroke(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }

  function occupied(d, x, y) {
    for (var i = 0; i < d.body.length; i++) if (d.body[i][0] === x && d.body[i][1] === y) return true;
    return false;
  }

  function freeCell(d) {
    var open = [];
    for (var y = 0; y < GRID; y++)
      for (var x = 0; x < GRID; x++)
        if (!occupied(d, x, y) && !(d.apple && d.apple[0] === x && d.apple[1] === y)) open.push([x, y]);
    return open.length ? open[(Math.random() * open.length) | 0] : [0, 0];
  }

  function stepSnake(g) {
    var d = g.data;
    if (d.queue.length) d.dir = d.queue.shift();

    var head = d.body[d.body.length - 1];
    var nx = head[0] + d.dir[0];
    var ny = head[1] + d.dir[1];

    if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) {
      return die(g, "Hit the wall", nx, ny);
    }
    // The tail cell frees up this step unless the snake is growing.
    var hitSelf = false;
    for (var i = d.grow > 0 ? 0 : 1; i < d.body.length; i++) {
      if (d.body[i][0] === nx && d.body[i][1] === ny) hitSelf = true;
    }
    if (hitSelf) return die(g, "Bit your own tail", nx, ny);

    d.body.push([nx, ny]);

    var ate = false;
    if (d.apple[0] === nx && d.apple[1] === ny) {
      d.grow += 1;
      ate = true;
      d.apple = freeCell(d);
      g.sfx.pick();
      g.fx.burst(nx * CELL + CELL / 2, ny * CELL + CELL / 2, 12, {
        color: ["#ef4444", "#fca5a5"], speed: 150, life: 0.45, size: 4
      });
    } else if (d.gold && d.gold.cell[0] === nx && d.gold.cell[1] === ny) {
      d.grow += 5;
      ate = true;
      d.gold = null;
      d.goldTimer = 9 + Math.random() * 8;
      g.sfx.good();
      g.fx.burst(nx * CELL + CELL / 2, ny * CELL + CELL / 2, 26, {
        color: ["#facc15", "#fde68a", "#ffffff"], speed: 220, life: 0.7, size: 5
      });
    }

    if (d.grow > 0) d.grow--;
    else d.body.shift();

    if (ate) {
      g.setScore(d.body.length + d.grow);
      d.step = Math.max(0.055, 0.16 - (d.body.length - 3) * 0.0026);
    }

    if (d.body.length >= GRID * GRID) {
      g.over({ won: true, title: "Perfect board", text: "You filled all 400 cells." });
    }
  }

  function die(g, reason, x, y) {
    g.fx.burst(
      PG.clamp(x, 0, GRID - 1) * CELL + CELL / 2,
      PG.clamp(y, 0, GRID - 1) * CELL + CELL / 2,
      30,
      { color: ["#34d399", "#38bdf8", "#ffffff"], speed: 260, life: 0.8, size: 5 }
    );
    g.over({ text: reason + " at length " + g.data.body.length + "." });
  }

  function drawBoard(ctx) {
    ctx.fillStyle = "#0b1120";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(255,255,255,0.035)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var i = 1; i < GRID; i++) {
      ctx.moveTo(i * CELL, 0);
      ctx.lineTo(i * CELL, H);
      ctx.moveTo(0, i * CELL);
      ctx.lineTo(W, i * CELL);
    }
    ctx.stroke();
    ctx.strokeStyle = "rgba(122,167,255,0.35)";
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, W - 3, H - 3);
  }

  function drawApple(ctx, cell, color, pulse, alpha) {
    var cx = cell[0] * CELL + CELL / 2;
    var cy = cell[1] * CELL + CELL / 2;
    var r = CELL * 0.3 * (0.9 + pulse * 0.15);
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    var glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2.6);
    glow.addColorStop(0, color);
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = (alpha == null ? 1 : alpha) * 0.35;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.beginPath();
    ctx.arc(cx - r * 0.3, cy - r * 0.35, r * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
})();
