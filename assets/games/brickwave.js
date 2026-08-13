/* Brickwave — brick breaker with power-ups.
 * Paddle contact point controls the rebound angle, so the ball is steerable
 * rather than random.
 */
(function () {
  "use strict";

  var W = 800,
    H = 600;
  var COLS = 11,
    ROWS = 7;
  var BW = 62,
    BH = 22,
    BGAP = 6;
  var OX = (W - (COLS * BW + (COLS - 1) * BGAP)) / 2;
  var OY = 74;

  var TIER = [
    { hp: 1, color: "#f472b6", pts: 10 },
    { hp: 1, color: "#c084fc", pts: 10 },
    { hp: 2, color: "#8b5cf6", pts: 25 },
    { hp: 3, color: "#6366f1", pts: 45 }
  ];

  var POWERS = [
    { id: "wide", color: "#34d399", label: "W" },
    { id: "multi", color: "#facc15", label: "M" },
    { id: "sticky", color: "#38bdf8", label: "S" },
    { id: "slow", color: "#a855f7", label: "T" }
  ];

  PG.mount({
    id: "brickwave",
    width: W,
    height: H,
    letterbox: "#0b1120",
    swipe: false,

    start: function (g) {
      var d = g.data;
      d.level = 1;
      d.lives = 3;
      d.paddle = { x: W / 2, w: 130, h: 15 };
      d.powerups = [];
      d.effects = {};
      buildLevel(g);
      resetBall(g);
    },

    onKey: function (g, k) {
      var d = g.data;
      if (k === "space" && g.state === "playing" && d.stuck) launch(g);
    },

    onPointerDown: function (g) {
      if (g.state === "playing" && g.data.stuck) launch(g);
    },

    onPointerMove: function (g, p) {
      if (g.state === "playing") g.data.paddle.x = PG.clamp(p.x, 0, W);
    },

    update: function (g, dt) {
      var d = g.data;

      // Paddle
      var speed = 620;
      if (g.keys.arrowleft || g.keys.a) d.paddle.x -= speed * dt;
      if (g.keys.arrowright || g.keys.d) d.paddle.x += speed * dt;
      var halfW = d.paddle.w / 2;
      d.paddle.x = PG.clamp(d.paddle.x, halfW, W - halfW);

      // Timed effects
      Object.keys(d.effects).forEach(function (key) {
        d.effects[key] -= dt;
        if (d.effects[key] <= 0) {
          delete d.effects[key];
          if (key === "wide") d.paddle.w = 130;
        }
      });

      var slow = d.effects.slow ? 0.62 : 1;

      // Balls
      for (var i = d.balls.length - 1; i >= 0; i--) {
        var b = d.balls[i];
        if (b.stuck) {
          b.x = d.paddle.x + b.offset;
          b.y = H - 58 - b.r;
          continue;
        }
        stepBall(g, b, dt * slow);
        if (b.y - b.r > H) {
          d.balls.splice(i, 1);
        }
      }

      if (!d.balls.length) loseLife(g);

      // Falling power-ups
      for (var p = d.powerups.length - 1; p >= 0; p--) {
        var pu = d.powerups[p];
        pu.y += 190 * dt;
        pu.spin += dt * 4;
        if (pu.y > H + 20) {
          d.powerups.splice(p, 1);
          continue;
        }
        if (
          pu.y + 12 > H - 58 - d.paddle.h &&
          pu.y - 12 < H - 58 &&
          Math.abs(pu.x - d.paddle.x) < d.paddle.w / 2 + 14
        ) {
          d.powerups.splice(p, 1);
          applyPower(g, pu.kind);
        }
      }

      d.stuck = d.balls.some(function (b) {
        return b.stuck;
      });

      if (d.bricks.every(function (br) { return br.hp <= 0; })) {
        d.level++;
        g.addScore(250);
        g.sfx.win();
        buildLevel(g);
        resetBall(g);
      }
    },

    draw: function (g, ctx) {
      var d = g.data;
      var bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#101a34");
      bg.addColorStop(1, "#0a0f20");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      if (!d.bricks) return;

      // Bricks
      d.bricks.forEach(function (b) {
        if (b.hp <= 0) return;
        var tier = TIER[b.tier];
        ctx.globalAlpha = b.hp < tier.hp ? 0.62 : 1;
        PG.draw.roundRect(ctx, b.x, b.y, BW, BH, 5);
        ctx.fillStyle = tier.color;
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(b.x + 5, b.y + BH - 5);
        ctx.lineTo(b.x + 5, b.y + 4);
        ctx.lineTo(b.x + BW - 6, b.y + 4);
        ctx.strokeStyle = "rgba(255,255,255,0.38)";
        ctx.lineWidth = 2;
        ctx.stroke();
        if (tier.hp > 1) {
          PG.draw.text(ctx, String(b.hp), b.x + BW / 2, b.y + BH / 2, 12, "rgba(0,0,0,0.5)", "center", 800);
        }
        ctx.globalAlpha = 1;
      });

      // Power-ups
      d.powerups.forEach(function (pu) {
        var meta = POWERS.filter(function (x) { return x.id === pu.kind; })[0];
        ctx.save();
        ctx.translate(pu.x, pu.y);
        ctx.scale(Math.cos(pu.spin) * 0.35 + 0.75, 1);
        PG.draw.roundRect(ctx, -14, -11, 28, 22, 6);
        ctx.fillStyle = meta.color;
        ctx.fill();
        PG.draw.text(ctx, meta.label, 0, 1, 13, "#0b1120", "center", 800);
        ctx.restore();
      });

      // Paddle
      var py = H - 58;
      PG.draw.roundRect(ctx, d.paddle.x - d.paddle.w / 2, py - d.paddle.h, d.paddle.w, d.paddle.h, 8);
      var pg = ctx.createLinearGradient(0, py - d.paddle.h, 0, py);
      pg.addColorStop(0, d.effects.sticky ? "#7dd3fc" : "#dbe6ff");
      pg.addColorStop(1, d.effects.sticky ? "#0ea5e9" : "#6d4bd8");
      ctx.fillStyle = pg;
      ctx.fill();

      // Balls
      d.balls.forEach(function (b) {
        var glow = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r * 4);
        glow.addColorStop(0, "rgba(255,255,255,0.35)");
        glow.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r * 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      });

      g.fx.draw(ctx);

      // HUD
      PG.draw.text(ctx, "LEVEL " + d.level, 18, 26, 14, "#9fabc6", "left", 700);
      PG.draw.text(ctx, g.score.toLocaleString(), W / 2, 26, 20, "#f0f8ff", "center", 800);
      for (var i = 0; i < d.lives; i++) {
        ctx.fillStyle = "#f472b6";
        ctx.beginPath();
        ctx.arc(W - 24 - i * 22, 26, 7, 0, Math.PI * 2);
        ctx.fill();
      }
      if (d.stuck) {
        PG.draw.text(ctx, "Press Space or tap to launch", W / 2, H - 22, 15, "rgba(159,171,198,0.9)", "center", 600);
      }
    }
  });

  /* ------------------------------------------------------------- level -- */
  function buildLevel(g) {
    var d = g.data;
    var lv = d.level;
    d.bricks = [];
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        // A few woven patterns keep later levels from feeling identical.
        var keep;
        var mode = (lv - 1) % 4;
        if (mode === 0) keep = true;
        else if (mode === 1) keep = (r + c) % 2 === 0 || r < 2;
        else if (mode === 2) keep = Math.abs(c - (COLS - 1) / 2) <= r;
        else keep = r % 2 === 0 || c % 3 !== 1;
        if (!keep) continue;

        var tier = Math.min(TIER.length - 1, Math.floor(r / 2) + (lv > 3 ? 1 : 0));
        d.bricks.push({
          x: OX + c * (BW + BGAP),
          y: OY + r * (BH + BGAP),
          tier: tier,
          hp: TIER[tier].hp
        });
      }
    }
    d.powerups = [];
  }

  function resetBall(g) {
    var d = g.data;
    d.balls = [{ x: d.paddle.x, y: H - 80, vx: 0, vy: 0, r: 8, stuck: true, offset: 0, speed: 380 + d.level * 14 }];
    d.stuck = true;
  }

  function launch(g) {
    g.data.balls.forEach(function (b) {
      if (!b.stuck) return;
      b.stuck = false;
      var a = -Math.PI / 2 + (Math.random() - 0.5) * 0.7;
      b.vx = Math.cos(a) * b.speed;
      b.vy = Math.sin(a) * b.speed;
    });
    g.data.stuck = false;
    g.sfx.zap();
  }

  function loseLife(g) {
    var d = g.data;
    d.lives--;
    d.effects = {};
    d.paddle.w = 130;
    g.sfx.bad();
    if (d.lives <= 0) {
      g.over({ text: "Cleared " + (d.level - 1) + " level" + (d.level === 2 ? "" : "s") + "." });
      return;
    }
    resetBall(g);
  }

  function applyPower(g, kind) {
    var d = g.data;
    g.sfx.good();
    if (kind === "wide") {
      d.paddle.w = 200;
      d.effects.wide = 14;
    } else if (kind === "slow") {
      d.effects.slow = 10;
    } else if (kind === "sticky") {
      d.effects.sticky = 14;
    } else if (kind === "multi") {
      var src = d.balls[0];
      if (!src) return;
      for (var i = 0; i < 2; i++) {
        var a = Math.atan2(src.vy, src.vx) + (i ? 0.5 : -0.5);
        d.balls.push({
          x: src.x, y: src.y, r: src.r, speed: src.speed, stuck: false, offset: 0,
          vx: Math.cos(a) * src.speed, vy: Math.sin(a) * src.speed
        });
      }
    }
    g.addScore(30);
  }

  /* -------------------------------------------------------------- ball -- */
  function stepBall(g, b, dt) {
    var d = g.data;
    // Sub-stepped so a fast ball cannot tunnel through a brick.
    var steps = Math.max(1, Math.ceil((Math.abs(b.vx) + Math.abs(b.vy)) * dt / 8));
    var sdt = dt / steps;

    for (var s = 0; s < steps; s++) {
      b.x += b.vx * sdt;
      b.y += b.vy * sdt;

      if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx); g.sfx.blip(); }
      if (b.x + b.r > W) { b.x = W - b.r; b.vx = -Math.abs(b.vx); g.sfx.blip(); }
      if (b.y - b.r < 0) { b.y = b.r; b.vy = Math.abs(b.vy); g.sfx.blip(); }

      // Paddle
      var py = H - 58;
      if (
        b.vy > 0 &&
        b.y + b.r >= py - d.paddle.h &&
        b.y - b.r <= py &&
        Math.abs(b.x - d.paddle.x) < d.paddle.w / 2 + b.r
      ) {
        b.y = py - d.paddle.h - b.r;
        var rel = PG.clamp((b.x - d.paddle.x) / (d.paddle.w / 2), -1, 1);
        var angle = -Math.PI / 2 + rel * 1.05;
        b.speed = Math.min(760, b.speed + 4);
        if (d.effects.sticky) {
          b.stuck = true;
          b.offset = b.x - d.paddle.x;
          d.stuck = true;
        } else {
          b.vx = Math.cos(angle) * b.speed;
          b.vy = Math.sin(angle) * b.speed;
        }
        g.sfx.tone(420, 0.05, "square", 0.06);
        continue;
      }

      // Bricks
      for (var i = 0; i < d.bricks.length; i++) {
        var br = d.bricks[i];
        if (br.hp <= 0) continue;
        if (b.x + b.r < br.x || b.x - b.r > br.x + BW || b.y + b.r < br.y || b.y - b.r > br.y + BH) continue;

        // Decide the bounce axis by the shallower overlap.
        var ox = Math.min(b.x + b.r - br.x, br.x + BW - (b.x - b.r));
        var oy = Math.min(b.y + b.r - br.y, br.y + BH - (b.y - b.r));
        if (ox < oy) {
          b.vx = -b.vx;
          b.x += b.vx > 0 ? ox : -ox;
        } else {
          b.vy = -b.vy;
          b.y += b.vy > 0 ? oy : -oy;
        }

        br.hp--;
        var tier = TIER[br.tier];
        g.sfx.tone(660 + br.tier * 90, 0.05, "square", 0.05);

        if (br.hp <= 0) {
          g.addScore(tier.pts);
          g.fx.burst(br.x + BW / 2, br.y + BH / 2, 12, {
            color: [tier.color, "#ffffff"], speed: 190, life: 0.5, size: 4
          });
          if (Math.random() < 0.12) {
            d.powerups.push({
              x: br.x + BW / 2,
              y: br.y + BH / 2,
              spin: 0,
              kind: POWERS[(Math.random() * POWERS.length) | 0].id
            });
          }
        }
        break;
      }
    }
  }
})();
