/* Flap — one-button flyer with parallax scenery and a day/night drift. */
(function () {
  "use strict";

  var W = 450,
    H = 600;
  var GRAV = 1500;
  var FLAP_V = -430;
  var SPEED = 168;
  var PIPE_W = 74;
  var GROUND = 74;

  PG.mount({
    id: "flap",
    width: W,
    height: H,
    letterbox: "#0b1120",
    swipe: false,

    setup: function (g) {
      g.data.clouds = [];
      for (var i = 0; i < 7; i++) {
        g.data.clouds.push({ x: Math.random() * W, y: 40 + Math.random() * 240, s: 0.5 + Math.random(), d: 0.2 + Math.random() * 0.4 });
      }
      g.data.hills = [];
      for (var j = 0; j < 9; j++) g.data.hills.push({ x: j * 90, h: 60 + Math.random() * 70 });
    },

    start: function (g) {
      var d = g.data;
      d.y = H / 2;
      d.vy = 0;
      d.rot = 0;
      d.pipes = [];
      d.dist = 0;
      d.passed = 0;
      d.flapAnim = 0;
      for (var i = 0; i < 4; i++) addPipe(d, W + 160 + i * 200);
    },

    onKey: function (g, k) {
      if (k === "space" || k === "arrowup" || k === "w") flap(g);
    },

    onPointerDown: function (g) {
      if (g.state === "playing") flap(g);
    },

    update: function (g, dt) {
      var d = g.data;
      d.dist += SPEED * dt;

      d.vy += GRAV * dt;
      d.y += d.vy * dt;
      d.rot = PG.clamp(d.vy / 620, -0.55, 1.25);
      d.flapAnim = Math.max(0, d.flapAnim - dt * 4);

      d.clouds.forEach(function (c) {
        c.x -= SPEED * c.d * dt;
        if (c.x < -70) {
          c.x = W + 60;
          c.y = 40 + Math.random() * 240;
        }
      });

      var bx = 118,
        br = 15;

      for (var i = d.pipes.length - 1; i >= 0; i--) {
        var p = d.pipes[i];
        p.x -= SPEED * dt;

        if (!p.scored && p.x + PIPE_W < bx - br) {
          p.scored = true;
          d.passed++;
          g.setScore(d.passed);
          g.sfx.tone(720 + Math.min(600, d.passed * 12), 0.08, "triangle", 0.07);
        }

        if (p.x < -PIPE_W - 40) {
          d.pipes.splice(i, 1);
          addPipe(d, Math.max.apply(null, d.pipes.map(function (q) { return q.x; })) + gapX(d.passed));
          continue;
        }

        // Circle vs the two rectangles.
        if (bx + br > p.x && bx - br < p.x + PIPE_W) {
          if (d.y - br < p.gapY || d.y + br > p.gapY + p.gap) return die(g, bx);
        }
      }

      if (d.y + br > H - GROUND) return die(g, bx);
      if (d.y - br < 0) {
        d.y = br;
        d.vy = 0;
      }
    },

    draw: function (g, ctx) {
      var d = g.data;
      var dist = d.dist || 0;

      // Sky drifts from day to dusk to night over a long run.
      var cycle = (Math.sin(dist / 2600) + 1) / 2;
      var sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, mix("#4ea8de", "#131c3a", cycle));
      sky.addColorStop(0.65, mix("#9bd7f0", "#26304f", cycle));
      sky.addColorStop(1, mix("#dff1f7", "#39405f", cycle));
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      if (cycle > 0.45) {
        ctx.globalAlpha = (cycle - 0.45) * 1.8;
        for (var s = 0; s < 40; s++) {
          ctx.fillStyle = "#fff";
          ctx.fillRect((s * 137) % W, (s * 89) % (H - GROUND - 120), 1.6, 1.6);
        }
        ctx.globalAlpha = 1;
      }

      // Sun / moon
      ctx.fillStyle = cycle > 0.5 ? "#e8eefc" : "#fff3b0";
      ctx.beginPath();
      ctx.arc(W - 78, 86, 26, 0, Math.PI * 2);
      ctx.fill();

      (d.clouds || []).forEach(function (c) {
        ctx.globalAlpha = 0.75;
        ctx.fillStyle = cycle > 0.5 ? "#38406a" : "#ffffff";
        [[0, 0, 26], [22, 6, 20], [-22, 6, 18]].forEach(function (o) {
          ctx.beginPath();
          ctx.arc(c.x + o[0] * c.s, c.y + o[1] * c.s, o[2] * c.s, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
      });

      // Parallax hills
      ctx.fillStyle = cycle > 0.5 ? "#1d2745" : "#5f9c6b";
      ctx.beginPath();
      ctx.moveTo(0, H - GROUND);
      for (var hx = -1; hx < 8; hx++) {
        var ox = ((hx * 90 - dist * 0.28) % (9 * 90) + 9 * 90) % (9 * 90) - 90;
        ctx.moveTo(ox, H - GROUND);
        ctx.quadraticCurveTo(ox + 45, H - GROUND - 95, ox + 90, H - GROUND);
      }
      ctx.fill();

      if (!d.pipes) return;

      d.pipes.forEach(function (p) {
        drawPipe(ctx, p.x, 0, p.gapY, true);
        drawPipe(ctx, p.x, p.gapY + p.gap, H - GROUND - (p.gapY + p.gap), false);
      });

      // Ground
      ctx.fillStyle = "#c8a267";
      ctx.fillRect(0, H - GROUND, W, GROUND);
      ctx.fillStyle = "#6bbf59";
      ctx.fillRect(0, H - GROUND, W, 14);
      ctx.fillStyle = "rgba(0,0,0,0.09)";
      for (var i = -1; i < 20; i++) {
        var gx = ((i * 34 - dist) % 680 + 680) % 680 - 34;
        ctx.fillRect(gx, H - GROUND + 16, 17, GROUND - 16);
      }

      drawBird(ctx, 118, d.y, d.rot, d.flapAnim, g.time);
      g.fx.draw(ctx);

      PG.draw.text(ctx, String(d.passed), W / 2, 74, 54, "rgba(255,255,255,0.95)", "center", 800);
    }
  });

  function gapX(passed) {
    return Math.max(150, 205 - passed * 1.4);
  }

  function addPipe(d, x) {
    var gap = Math.max(132, 186 - d.passed * 1.6);
    var margin = 60;
    var gapY = margin + Math.random() * (H - GROUND - gap - margin * 2);
    d.pipes.push({ x: x, gapY: gapY, gap: gap, scored: false });
  }

  function flap(g) {
    if (g.state !== "playing") return;
    g.data.vy = FLAP_V;
    g.data.flapAnim = 1;
    g.sfx.tone(520, 0.06, "square", 0.05, 760);
  }

  function die(g, bx) {
    g.fx.burst(bx, g.data.y, 24, { color: ["#facc15", "#f97316", "#ffffff"], speed: 240, life: 0.7, size: 5 });
    g.sfx.thud();
    g.over({ text: g.data.passed === 0 ? "Not a single pipe. Brutal." : "Cleared " + g.data.passed + " pipes." });
  }

  function drawPipe(ctx, x, y, h, top) {
    if (h <= 0) return;
    var grad = ctx.createLinearGradient(x, 0, x + PIPE_W, 0);
    grad.addColorStop(0, "#3f9d3f");
    grad.addColorStop(0.35, "#67c767");
    grad.addColorStop(1, "#2f7a2f");
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, PIPE_W, h);
    ctx.fillStyle = "#357f35";
    var capY = top ? y + h - 26 : y;
    ctx.fillRect(x - 7, capY, PIPE_W + 14, 26);
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.fillRect(x + 8, y, 8, h);
  }

  function drawBird(ctx, x, y, rot, flapAmt, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);

    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.ellipse(0, 0, 17, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wing flaps with the input, idles with a slow sine.
    var wing = flapAmt > 0 ? -0.9 * flapAmt : Math.sin(t * 7) * 0.25;
    ctx.save();
    ctx.rotate(wing);
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.ellipse(-3, 2, 11, 7, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(7, -5, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#101828";
    ctx.beginPath();
    ctx.arc(9, -5, 2.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f97316";
    ctx.beginPath();
    ctx.moveTo(15, -1);
    ctx.lineTo(26, 3);
    ctx.lineTo(15, 7);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function mix(a, b, t) {
    function h(c) {
      return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
    }
    var A = h(a),
      B = h(b);
    return (
      "rgb(" +
      Math.round(A[0] + (B[0] - A[0]) * t) + "," +
      Math.round(A[1] + (B[1] - A[1]) * t) + "," +
      Math.round(A[2] + (B[2] - A[2]) * t) + ")"
    );
  }
})();
