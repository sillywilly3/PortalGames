/* Sky Hop — endless upward platformer.
 * The camera only ever rises; falling below it ends the run.
 */
(function () {
  "use strict";

  var W = 450,
    H = 600;
  var GRAV = 1500;
  var BOUNCE = -720;
  var SPRING = -1180;
  var MOVE = 480;
  var PW = 84,
    PH = 15;
  var R = 19;
  var START_Y = H - 120;

  var KIND = { NORMAL: 0, BREAK: 1, SPRING: 2, MOVING: 3 };

  PG.mount({
    id: "skyhop",
    width: W,
    height: H,
    letterbox: "#0a1020",
    swipe: false,

    start: function (g) {
      var d = g.data;
      d.plats = [];
      d.cam = 0;
      d.x = W / 2;
      d.y = START_Y;
      d.vx = 0;
      d.vy = 0;
      d.squash = 0;
      d.highest = d.y;

      // A guaranteed platform under the player, then a ladder upward.
      d.plats.push({ x: W / 2 - PW / 2, y: H - 80, kind: KIND.NORMAL, dead: false });
      var y = H - 80;
      while (y > -400) {
        y -= 62 + Math.random() * 34;
        d.plats.push(makePlat(y, 0));
      }
      d.topY = y;
    },

    update: function (g, dt) {
      var d = g.data;

      var input = 0;
      if (g.keys.arrowleft || g.keys.a) input -= 1;
      if (g.keys.arrowright || g.keys.d) input += 1;
      if (!input && g.pointer.down) input = PG.clamp((g.pointer.x - d.x) / 90, -1, 1);

      d.vx = PG.lerp(d.vx, input * MOVE, Math.min(1, 14 * dt));
      d.x += d.vx * dt;
      if (d.x < -R) d.x = W + R;
      if (d.x > W + R) d.x = -R;

      d.vy += GRAV * dt;

      // Sub-step so a fast fall cannot pass straight through a platform.
      var steps = Math.max(1, Math.ceil(Math.abs(d.vy) * dt / 8));
      var sdt = dt / steps;
      for (var s = 0; s < steps; s++) {
        var prevY = d.y;
        d.y += d.vy * sdt;
        if (d.vy > 0) landCheck(g, prevY);
      }

      d.squash = Math.max(0, d.squash - dt * 5);

      // Moving platforms
      d.plats.forEach(function (p) {
        if (p.kind !== KIND.MOVING) return;
        p.x += p.dir * 90 * dt;
        if (p.x < 6 || p.x + PW > W - 6) p.dir *= -1;
      });

      // Camera only ever rises, keeping the player in the upper third.
      var target = d.y - H * 0.42;
      if (target < d.cam) d.cam = target;

      // Height is measured upward from where the run started, in metres.
      var metres = Math.max(0, Math.floor((START_Y - d.y) / 10));
      if (metres > g.score) g.setScore(metres);

      // Generate new platforms above the camera.
      while (d.topY > d.cam - 200) {
        d.topY -= 58 + Math.random() * 36;
        d.plats.push(makePlat(d.topY, g.score));
      }

      // Retire platforms that have scrolled well below.
      for (var i = d.plats.length - 1; i >= 0; i--) {
        if (d.plats[i].y > d.cam + H + 120) d.plats.splice(i, 1);
      }

      if (d.y - R > d.cam + H) {
        g.fx.burst(d.x, d.cam + H, 20, { color: ["#34d399", "#7aa7ff"], speed: 200, life: 0.6, size: 4 });
        g.over({ text: "Fell from " + g.score + " m." });
      }
    },

    draw: function (g, ctx) {
      var d = g.data;
      var cam = d.cam || 0;

      var sky = ctx.createLinearGradient(0, 0, 0, H);
      var deep = PG.clamp(g.score / 3000, 0, 1);
      sky.addColorStop(0, "#0a1020");
      sky.addColorStop(1, deep > 0.5 ? "#131c3a" : "#1b2a4d");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      // Star field parallaxes with the camera.
      for (var i = 0; i < 46; i++) {
        var sx = (i * 149) % W;
        var sy = ((i * 211 - cam * 0.25) % H + H) % H;
        ctx.globalAlpha = 0.16 + ((i * 37) % 60) / 160;
        ctx.fillStyle = "#dbeafe";
        ctx.fillRect(sx, sy, i % 7 === 0 ? 2 : 1.3, i % 7 === 0 ? 2 : 1.3);
      }
      ctx.globalAlpha = 1;

      if (!d.plats) return;

      d.plats.forEach(function (p) {
        var y = p.y - cam;
        if (y < -30 || y > H + 30) return;
        if (p.dead) return;

        var color =
          p.kind === KIND.BREAK ? "#a16207" : p.kind === KIND.SPRING ? "#38bdf8" : p.kind === KIND.MOVING ? "#c084fc" : "#34d399";
        PG.draw.roundRect(ctx, p.x, y, PW, PH, 7);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        PG.draw.roundRect(ctx, p.x + 6, y + 3, PW - 12, 4, 2);
        ctx.fill();

        if (p.kind === KIND.SPRING) {
          ctx.fillStyle = "#e0f2fe";
          ctx.fillRect(p.x + PW / 2 - 9, y - 9, 18, 9);
          ctx.fillStyle = "#0284c7";
          ctx.fillRect(p.x + PW / 2 - 9, y - 5, 18, 3);
        }
      });

      // Player
      var py = d.y - cam;
      var sq = 1 + d.squash * 0.35;
      ctx.save();
      ctx.translate(d.x, py);
      ctx.scale(2 - sq, sq);
      var grad = ctx.createRadialGradient(-R * 0.3, -R * 0.35, R * 0.1, 0, 0, R);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.4, "#a5d8ff");
      grad.addColorStop(1, "#3b82f6");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0b1120";
      ctx.beginPath();
      ctx.arc(-5, -3, 2.6, 0, Math.PI * 2);
      ctx.arc(6, -3, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      g.fx.draw(ctx);

      PG.draw.text(ctx, g.score + " m", W / 2, 46, 34, "rgba(240,248,255,0.92)", "center", 800);
    }
  });

  function makePlat(y, score) {
    var r = Math.random();
    var kind = KIND.NORMAL;
    var difficulty = PG.clamp(score / 1400, 0, 1);
    if (r < 0.09 + difficulty * 0.06) kind = KIND.SPRING;
    else if (r < 0.09 + difficulty * 0.28) kind = KIND.BREAK;
    else if (r < 0.2 + difficulty * 0.34) kind = KIND.MOVING;

    return {
      x: 8 + Math.random() * (W - PW - 16),
      y: y,
      kind: kind,
      dir: Math.random() < 0.5 ? -1 : 1,
      dead: false
    };
  }

  function landCheck(g, prevY) {
    var d = g.data;
    for (var i = 0; i < d.plats.length; i++) {
      var p = d.plats[i];
      if (p.dead) continue;
      var top = p.y;
      // Only land when crossing the top edge downward this sub-step.
      if (prevY + R <= top && d.y + R >= top && d.x + R * 0.7 > p.x && d.x - R * 0.7 < p.x + PW) {
        d.y = top - R;
        d.squash = 1;

        if (p.kind === KIND.SPRING) {
          d.vy = SPRING;
          g.sfx.tone(400, 0.16, "triangle", 0.09, 1400);
          g.fx.burst(d.x, top, 12, { color: ["#38bdf8", "#ffffff"], speed: 200, life: 0.5, size: 3 });
        } else {
          d.vy = BOUNCE;
          g.sfx.tone(520, 0.05, "square", 0.05);
        }

        if (p.kind === KIND.BREAK) {
          p.dead = true;
          g.fx.burst(p.x + PW / 2, top, 10, { color: ["#a16207", "#78350f"], speed: 130, life: 0.5, size: 4 });
        }
        return;
      }
    }
  }
})();
