/* Paddle — first to eleven, against a CPU with three real skill levels or a
 * second player on the same keyboard.
 *
 * The CPU is deliberately imperfect: it tracks a predicted intercept with a
 * reaction delay and a small aim error, rather than snapping to the ball.
 */
(function () {
  "use strict";

  var W = 900,
    H = 562;
  var PW = 14,
    PH = 96;
  var MARGIN = 34;
  var TARGET = 11;

  var CPU = {
    easy: { speed: 300, error: 58, react: 0.24 },
    normal: { speed: 430, error: 30, react: 0.14 },
    hard: { speed: 610, error: 11, react: 0.06 }
  };

  var style = document.createElement("style");
  style.textContent =
    ".pd-bar{position:absolute;top:10px;left:50%;transform:translateX(-50%);z-index:8;" +
    "display:flex;gap:6px;background:rgba(9,14,41,.6);backdrop-filter:blur(8px);" +
    "padding:5px;border-radius:999px;border:1px solid rgba(255,255,255,.12)}" +
    ".pd-opt{height:26px;padding:0 11px;border-radius:999px;border:none;background:transparent;" +
    "color:#9fabc6;font-size:12px;font-weight:700}" +
    ".pd-opt[aria-pressed=true]{background:linear-gradient(135deg,#7aa7ff,#8b2fd6);color:#fff}";
  document.head.appendChild(style);

  PG.mount({
    id: "paddle",
    width: W,
    height: H,
    letterbox: "#080d1c",
    swipe: false,

    setup: function (g) {
      var bar = document.createElement("div");
      bar.className = "pd-bar";
      bar.innerHTML =
        ["easy", "normal", "hard"]
          .map(function (k) {
            return '<button class="pd-opt" data-cpu="' + k + '">CPU ' + k + "</button>";
          })
          .join("") + '<button class="pd-opt" data-cpu="2p">2 player</button>';
      g.stage.appendChild(bar);
      g.data.bar = bar;
      g.data.mode = PG.store.get("pd:mode", "normal");

      bar.addEventListener("click", function (e) {
        var b = e.target.closest("[data-cpu]");
        if (!b) return;
        g.data.mode = b.getAttribute("data-cpu");
        PG.store.set("pd:mode", g.data.mode);
        syncBar(g);
        g.start();
      });
      syncBar(g);
    },

    start: function (g) {
      var d = g.data;
      d.left = { y: H / 2, vy: 0 };
      d.right = { y: H / 2, vy: 0 };
      d.scoreL = 0;
      d.scoreR = 0;
      d.aim = H / 2;
      d.reactTimer = 0;
      d.trail = [];
      serve(g, Math.random() < 0.5 ? -1 : 1);
      syncBar(g);
    },

    update: function (g, dt) {
      var d = g.data;
      var cfg = CPU[d.mode] || CPU.normal;

      // Left paddle: always human (W/S), or mouse/touch on the left half.
      var lv = 0;
      if (g.keys.w) lv -= 1;
      if (g.keys.s) lv += 1;
      d.left.y += lv * 560 * dt;
      if (g.pointer.down && g.pointer.x < W / 2) d.left.y = g.pointer.y;

      // Right paddle: second player or CPU.
      if (d.mode === "2p") {
        var rv = 0;
        if (g.keys.arrowup) rv -= 1;
        if (g.keys.arrowdown) rv += 1;
        d.right.y += rv * 560 * dt;
        if (g.pointer.down && g.pointer.x >= W / 2) d.right.y = g.pointer.y;
      } else {
        d.reactTimer -= dt;
        if (d.reactTimer <= 0) {
          d.reactTimer = cfg.react;
          d.aim = d.ball.vx > 0 ? predict(d.ball) + (Math.random() - 0.5) * cfg.error * 2 : H / 2;
        }
        var diff = d.aim - d.right.y;
        var step = PG.clamp(diff, -cfg.speed * dt, cfg.speed * dt);
        d.right.y += step;
      }

      d.left.y = PG.clamp(d.left.y, PH / 2, H - PH / 2);
      d.right.y = PG.clamp(d.right.y, PH / 2, H - PH / 2);

      if (d.serveDelay > 0) {
        d.serveDelay -= dt;
        d.ball.x = d.ball.dir < 0 ? MARGIN + PW + 18 : W - MARGIN - PW - 18;
        d.ball.y = d.ball.dir < 0 ? d.left.y : d.right.y;
        return;
      }

      stepBall(g, dt);

      d.trail.unshift({ x: d.ball.x, y: d.ball.y });
      if (d.trail.length > 12) d.trail.pop();
    },

    draw: function (g, ctx) {
      var d = g.data;
      ctx.fillStyle = "#080d1c";
      ctx.fillRect(0, 0, W, H);

      if (!d.ball) return;

      // Centre line
      ctx.fillStyle = "rgba(255,255,255,0.14)";
      for (var y = 14; y < H; y += 34) ctx.fillRect(W / 2 - 3, y, 6, 18);

      PG.draw.text(ctx, String(d.scoreL), W / 2 - 70, 62, 54, "rgba(240,248,255,0.9)", "right", 800);
      PG.draw.text(ctx, String(d.scoreR), W / 2 + 70, 62, 54, "rgba(240,248,255,0.9)", "left", 800);

      // Ball trail
      d.trail.forEach(function (t, i) {
        ctx.globalAlpha = (1 - i / d.trail.length) * 0.3;
        ctx.fillStyle = "#7aa7ff";
        ctx.beginPath();
        ctx.arc(t.x, t.y, d.ball.r * (1 - i / d.trail.length), 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      ctx.fillStyle = "#f0f8ff";
      PG.draw.roundRect(ctx, MARGIN, d.left.y - PH / 2, PW, PH, 7);
      ctx.fill();
      PG.draw.roundRect(ctx, W - MARGIN - PW, d.right.y - PH / 2, PW, PH, 7);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(d.ball.x, d.ball.y, d.ball.r, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      g.fx.draw(ctx);

      var names = d.mode === "2p" ? ["Player 1 — W / S", "Player 2 — ↑ / ↓"] : ["You — W / S", "CPU " + d.mode];
      PG.draw.text(ctx, names[0], MARGIN, H - 22, 13, "rgba(159,171,198,0.75)", "left", 600);
      PG.draw.text(ctx, names[1], W - MARGIN, H - 22, 13, "rgba(159,171,198,0.75)", "right", 600);

      if (d.serveDelay > 0) {
        PG.draw.text(ctx, "Serving…", W / 2, H / 2 + 90, 16, "rgba(159,171,198,0.8)", "center", 600);
      }
    }
  });

  function syncBar(g) {
    Array.prototype.forEach.call(g.data.bar.querySelectorAll("[data-cpu]"), function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-cpu") === g.data.mode ? "true" : "false");
    });
  }

  function serve(g, dir) {
    var d = g.data;
    d.ball = { x: W / 2, y: H / 2, vx: 0, vy: 0, r: 9, dir: dir, speed: 380 };
    d.serveDelay = 0.8;
    d.trail = [];
    setTimeout(function () {
      if (!d.ball) return;
      var a = (Math.random() - 0.5) * 0.6;
      d.ball.vx = Math.cos(a) * d.ball.speed * dir;
      d.ball.vy = Math.sin(a) * d.ball.speed;
    }, 800);
  }

  /* Where the ball will cross the right paddle's plane, with wall bounces. */
  function predict(ball) {
    if (ball.vx <= 0) return H / 2;
    var x = ball.x,
      y = ball.y,
      vy = ball.vy;
    var t = (W - MARGIN - PW - x) / ball.vx;
    y += vy * t;
    var span = H;
    y = ((y % (2 * span)) + 2 * span) % (2 * span);
    if (y > span) y = 2 * span - y;
    return y;
  }

  function stepBall(g, dt) {
    var d = g.data;
    var b = d.ball;
    var steps = Math.max(1, Math.ceil(Math.abs(b.vx) * dt / 8));
    var sdt = dt / steps;

    for (var s = 0; s < steps; s++) {
      b.x += b.vx * sdt;
      b.y += b.vy * sdt;

      if (b.y - b.r < 0) {
        b.y = b.r;
        b.vy = Math.abs(b.vy);
        g.sfx.blip();
      } else if (b.y + b.r > H) {
        b.y = H - b.r;
        b.vy = -Math.abs(b.vy);
        g.sfx.blip();
      }

      // Left paddle
      if (b.vx < 0 && b.x - b.r < MARGIN + PW && b.x > MARGIN && Math.abs(b.y - d.left.y) < PH / 2 + b.r) {
        bounce(g, b, d.left, 1);
      }
      // Right paddle
      if (
        b.vx > 0 &&
        b.x + b.r > W - MARGIN - PW &&
        b.x < W - MARGIN &&
        Math.abs(b.y - d.right.y) < PH / 2 + b.r
      ) {
        bounce(g, b, d.right, -1);
      }

      if (b.x < -30) return point(g, "right");
      if (b.x > W + 30) return point(g, "left");
    }
  }

  function bounce(g, b, paddle, dir) {
    var rel = PG.clamp((b.y - paddle.y) / (PH / 2), -1, 1);
    var angle = rel * 0.95;
    b.speed = Math.min(920, b.speed * 1.055);
    b.vx = Math.cos(angle) * b.speed * dir;
    b.vy = Math.sin(angle) * b.speed;
    b.x = dir > 0 ? MARGIN + PW + b.r + 1 : W - MARGIN - PW - b.r - 1;
    g.sfx.tone(dir > 0 ? 440 : 520, 0.05, "square", 0.06);
    g.fx.burst(b.x, b.y, 6, { color: ["#7aa7ff", "#ffffff"], speed: 120, life: 0.35, size: 3, gravity: 0 });
  }

  function point(g, who) {
    var d = g.data;
    if (who === "left") d.scoreL++;
    else d.scoreR++;
    g.sfx.tone(who === "left" ? 700 : 260, 0.16, "triangle", 0.08);

    if (d.scoreL >= TARGET || d.scoreR >= TARGET) {
      var youWon = d.scoreL > d.scoreR;
      var title =
        d.mode === "2p"
          ? (youWon ? "Player 1" : "Player 2") + " wins"
          : youWon ? "You win" : "CPU wins";
      g.over({
        won: youWon,
        title: title,
        text: d.scoreL + " – " + d.scoreR + (d.mode === "2p" ? "" : " against CPU " + d.mode + "."),
        button: "Play again"
      });
      return;
    }
    serve(g, who === "left" ? 1 : -1);
  }
})();
