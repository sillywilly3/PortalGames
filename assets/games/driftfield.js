/* Driftfield — vector survival in a wrapping asteroid field. */
(function () {
  "use strict";

  var W = 900,
    H = 562;

  var SHIP_R = 13;
  var TURN = 3.9; // rad/s
  var THRUST = 330;
  var FRICTION = 0.62; // per second
  var BULLET_SPEED = 520;
  var BULLET_LIFE = 0.95;
  var FIRE_RATE = 0.18;

  var SIZES = { 3: { r: 46, pts: 20 }, 2: { r: 26, pts: 50 }, 1: { r: 14, pts: 100 } };

  PG.mount({
    id: "driftfield",
    width: W,
    height: H,
    letterbox: "#05070f",
    swipe: false,

    setup: function (g) {
      g.data.stars = [];
      for (var i = 0; i < 130; i++) {
        g.data.stars.push({ x: Math.random() * W, y: Math.random() * H, a: 0.15 + Math.random() * 0.6, r: Math.random() < 0.9 ? 1 : 1.7 });
      }
    },

    start: function (g) {
      var d = g.data;
      d.ship = { x: W / 2, y: H / 2, a: -Math.PI / 2, vx: 0, vy: 0, alive: true, invuln: 2.5 };
      d.bullets = [];
      d.rocks = [];
      d.saucers = [];
      d.saucerBullets = [];
      d.lives = 3;
      d.wave = 0;
      d.cool = 0;
      d.respawn = 0;
      d.saucerTimer = 22;
      nextWave(g);
    },

    onKey: function (g, k) {
      var d = g.data;
      if (g.state !== "playing" || !d.ship.alive) return;
      if (k === "shift") hyperspace(g);
    },

    update: function (g, dt) {
      var d = g.data;
      var s = d.ship;

      if (d.respawn > 0) {
        d.respawn -= dt;
        if (d.respawn <= 0) {
          s.x = W / 2;
          s.y = H / 2;
          s.vx = s.vy = 0;
          s.a = -Math.PI / 2;
          s.alive = true;
          s.invuln = 2.5;
        }
      }

      if (s.alive) {
        if (g.keys.arrowleft || g.keys.a) s.a -= TURN * dt;
        if (g.keys.arrowright || g.keys.d) s.a += TURN * dt;

        s.thrusting = !!(g.keys.arrowup || g.keys.w);
        if (s.thrusting) {
          s.vx += Math.cos(s.a) * THRUST * dt;
          s.vy += Math.sin(s.a) * THRUST * dt;
          if (Math.random() < 0.6) {
            g.fx.burst(s.x - Math.cos(s.a) * SHIP_R, s.y - Math.sin(s.a) * SHIP_R, 1, {
              color: ["#fbbf24", "#f97316"], speed: 90, life: 0.3, size: 3, gravity: 0,
              angle: s.a + Math.PI, spread: 0.7
            });
          }
        }

        var drag = Math.pow(FRICTION, dt);
        s.vx *= drag;
        s.vy *= drag;
        s.x = wrap(s.x + s.vx * dt, W);
        s.y = wrap(s.y + s.vy * dt, H);

        if (s.invuln > 0) s.invuln -= dt;

        d.cool -= dt;
        if (g.keys.space && d.cool <= 0) {
          d.cool = FIRE_RATE;
          d.bullets.push({
            x: s.x + Math.cos(s.a) * SHIP_R,
            y: s.y + Math.sin(s.a) * SHIP_R,
            vx: Math.cos(s.a) * BULLET_SPEED + s.vx * 0.4,
            vy: Math.sin(s.a) * BULLET_SPEED + s.vy * 0.4,
            life: BULLET_LIFE
          });
          g.sfx.zap();
        }
      }

      stepList(d.bullets, dt);
      stepList(d.saucerBullets, dt);

      d.rocks.forEach(function (r) {
        r.x = wrap(r.x + r.vx * dt, W);
        r.y = wrap(r.y + r.vy * dt, H);
        r.spin += r.spinRate * dt;
      });

      // Saucers
      d.saucerTimer -= dt;
      if (d.saucerTimer <= 0 && d.saucers.length < 2) {
        d.saucerTimer = 26 + Math.random() * 18;
        var fromLeft = Math.random() < 0.5;
        d.saucers.push({
          x: fromLeft ? -30 : W + 30,
          y: 60 + Math.random() * (H - 120),
          vx: (fromLeft ? 1 : -1) * (70 + Math.random() * 40),
          vy: 0,
          drift: 0,
          fire: 1.4,
          r: 18
        });
      }

      for (var si = d.saucers.length - 1; si >= 0; si--) {
        var uc = d.saucers[si];
        uc.drift += dt;
        uc.y += Math.sin(uc.drift * 1.3) * 42 * dt;
        uc.x += uc.vx * dt;
        if (uc.x < -60 || uc.x > W + 60) {
          d.saucers.splice(si, 1);
          continue;
        }
        uc.fire -= dt;
        if (uc.fire <= 0 && s.alive) {
          uc.fire = 1.5 + Math.random();
          // Aims loosely at the player, more accurately in later waves.
          var aim = Math.atan2(s.y - uc.y, s.x - uc.x) + (Math.random() - 0.5) * Math.max(0.1, 0.9 - d.wave * 0.08);
          d.saucerBullets.push({
            x: uc.x, y: uc.y,
            vx: Math.cos(aim) * 300, vy: Math.sin(aim) * 300,
            life: 2.2
          });
          g.sfx.tone(240, 0.09, "sawtooth", 0.05);
        }
      }

      collide(g);

      if (!d.rocks.length && !d.saucers.length) nextWave(g);
    },

    draw: function (g, ctx) {
      var d = g.data;
      ctx.fillStyle = "#05070f";
      ctx.fillRect(0, 0, W, H);

      (d.stars || []).forEach(function (st) {
        ctx.globalAlpha = st.a;
        ctx.fillStyle = "#dbeafe";
        ctx.fillRect(st.x, st.y, st.r, st.r);
      });
      ctx.globalAlpha = 1;

      if (!d.rocks) return;

      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      d.rocks.forEach(function (r) {
        drawRock(ctx, r);
      });

      ctx.fillStyle = "#f0f8ff";
      d.bullets.forEach(function (b) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 2.6, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.fillStyle = "#fb7185";
      d.saucerBullets.forEach(function (b) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      d.saucers.forEach(function (u) {
        drawSaucer(ctx, u);
      });

      if (d.ship.alive) drawShip(ctx, d.ship, g.time);

      g.fx.draw(ctx);

      PG.draw.text(ctx, g.score.toLocaleString(), 22, 28, 22, "#f0f8ff", "left", 800);
      PG.draw.text(ctx, "WAVE " + d.wave, W - 22, 28, 14, "#9fabc6", "right", 700);
      for (var i = 0; i < d.lives; i++) {
        ctx.save();
        ctx.translate(30 + i * 24, 56);
        ctx.scale(0.62, 0.62);
        ctx.rotate(-Math.PI / 2);
        shipPath(ctx);
        ctx.strokeStyle = "#7aa7ff";
        ctx.lineWidth = 2.6;
        ctx.stroke();
        ctx.restore();
      }
    }
  });

  /* ------------------------------------------------------------ helpers -- */
  function wrap(v, max) {
    return v < 0 ? v + max : v >= max ? v - max : v;
  }

  function stepList(list, dt) {
    for (var i = list.length - 1; i >= 0; i--) {
      var b = list[i];
      b.life -= dt;
      if (b.life <= 0) {
        list.splice(i, 1);
        continue;
      }
      b.x = wrap(b.x + b.vx * dt, W);
      b.y = wrap(b.y + b.vy * dt, H);
    }
  }

  function makeRock(x, y, size) {
    var pts = [];
    var n = 9 + ((Math.random() * 4) | 0);
    for (var i = 0; i < n; i++) {
      pts.push(0.68 + Math.random() * 0.42);
    }
    var speed = 22 + Math.random() * 46 + (3 - size) * 16;
    var a = Math.random() * Math.PI * 2;
    return {
      x: x, y: y, size: size, r: SIZES[size].r,
      vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
      spin: Math.random() * Math.PI, spinRate: (Math.random() - 0.5) * 1.4,
      pts: pts
    };
  }

  function nextWave(g) {
    var d = g.data;
    d.wave++;
    var count = Math.min(11, 3 + d.wave);
    for (var i = 0; i < count; i++) {
      // Spawn away from the centre so a new wave never lands on the ship.
      var x, y;
      do {
        x = Math.random() * W;
        y = Math.random() * H;
      } while (Math.hypot(x - W / 2, y - H / 2) < 170);
      d.rocks.push(makeRock(x, y, 3));
    }
    if (d.wave > 1) {
      g.sfx.good();
      g.addScore(100);
    }
  }

  function hyperspace(g) {
    var d = g.data;
    var s = d.ship;
    g.fx.burst(s.x, s.y, 18, { color: ["#7aa7ff", "#ffffff"], speed: 220, life: 0.5, size: 3, gravity: 0 });
    s.x = 40 + Math.random() * (W - 80);
    s.y = 40 + Math.random() * (H - 80);
    s.vx = s.vy = 0;
    s.invuln = Math.max(s.invuln, 1);
    g.sfx.tone(900, 0.16, "sine", 0.07, 200);
  }

  function splitRock(g, i) {
    var d = g.data;
    var r = d.rocks[i];
    d.rocks.splice(i, 1);
    g.addScore(SIZES[r.size].pts);
    g.fx.burst(r.x, r.y, 8 + r.size * 5, {
      color: ["#cbd5e1", "#94a3b8", "#ffffff"], speed: 130, life: 0.55, size: 3, gravity: 0
    });
    g.sfx.noise(0.16, 0.1, 500 + r.size * 300);
    if (r.size > 1) {
      for (var k = 0; k < 2; k++) {
        var child = makeRock(r.x, r.y, r.size - 1);
        child.vx += r.vx * 0.4;
        child.vy += r.vy * 0.4;
        d.rocks.push(child);
      }
    }
  }

  function collide(g) {
    var d = g.data;
    var s = d.ship;

    // Bullets vs rocks
    for (var b = d.bullets.length - 1; b >= 0; b--) {
      var bl = d.bullets[b];
      var hit = false;
      for (var i = d.rocks.length - 1; i >= 0; i--) {
        var r = d.rocks[i];
        if (Math.hypot(bl.x - r.x, bl.y - r.y) < r.r) {
          d.bullets.splice(b, 1);
          splitRock(g, i);
          hit = true;
          break;
        }
      }
      if (hit) continue;
      for (var u = d.saucers.length - 1; u >= 0; u--) {
        var uc = d.saucers[u];
        if (Math.hypot(bl.x - uc.x, bl.y - uc.y) < uc.r + 4) {
          d.bullets.splice(b, 1);
          d.saucers.splice(u, 1);
          g.addScore(200);
          g.fx.burst(uc.x, uc.y, 24, { color: ["#f472b6", "#ffffff"], speed: 220, life: 0.6, size: 4, gravity: 0 });
          g.sfx.noise(0.25, 0.13, 900);
          break;
        }
      }
    }

    if (!s.alive || s.invuln > 0) return;

    for (var j = 0; j < d.rocks.length; j++) {
      var rock = d.rocks[j];
      if (Math.hypot(s.x - rock.x, s.y - rock.y) < rock.r + SHIP_R * 0.7) return destroyShip(g);
    }
    for (var k = 0; k < d.saucerBullets.length; k++) {
      var sb = d.saucerBullets[k];
      if (Math.hypot(s.x - sb.x, s.y - sb.y) < SHIP_R) return destroyShip(g);
    }
    for (var m = 0; m < d.saucers.length; m++) {
      var sc = d.saucers[m];
      if (Math.hypot(s.x - sc.x, s.y - sc.y) < sc.r + SHIP_R) return destroyShip(g);
    }
  }

  function destroyShip(g) {
    var d = g.data;
    d.ship.alive = false;
    d.lives--;
    g.fx.burst(d.ship.x, d.ship.y, 34, {
      color: ["#7aa7ff", "#ffffff", "#f472b6"], speed: 260, life: 0.9, size: 4, gravity: 0
    });
    g.sfx.noise(0.4, 0.16, 700);
    if (d.lives <= 0) {
      g.over({ text: "Survived " + d.wave + " wave" + (d.wave === 1 ? "" : "s") + "." });
    } else {
      d.respawn = 1.6;
    }
  }

  /* ------------------------------------------------------------ drawing -- */
  function shipPath(ctx) {
    ctx.beginPath();
    ctx.moveTo(SHIP_R, 0);
    ctx.lineTo(-SHIP_R * 0.75, SHIP_R * 0.72);
    ctx.lineTo(-SHIP_R * 0.4, 0);
    ctx.lineTo(-SHIP_R * 0.75, -SHIP_R * 0.72);
    ctx.closePath();
  }

  function drawShip(ctx, s, t) {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.a);
    // Blink while the respawn shield is up.
    ctx.globalAlpha = s.invuln > 0 ? 0.35 + 0.65 * Math.abs(Math.sin(t * 12)) : 1;

    if (s.thrusting) {
      ctx.beginPath();
      ctx.moveTo(-SHIP_R * 0.5, SHIP_R * 0.34);
      ctx.lineTo(-SHIP_R * (1.1 + Math.random() * 0.5), 0);
      ctx.lineTo(-SHIP_R * 0.5, -SHIP_R * 0.34);
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 2.4;
      ctx.stroke();
    }

    shipPath(ctx);
    ctx.fillStyle = "rgba(122,167,255,0.13)";
    ctx.fill();
    ctx.strokeStyle = "#dbeafe";
    ctx.lineWidth = 2.6;
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawRock(ctx, r) {
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.rotate(r.spin);
    ctx.beginPath();
    for (var i = 0; i < r.pts.length; i++) {
      var a = (i / r.pts.length) * Math.PI * 2;
      var rad = r.r * r.pts[i];
      var x = Math.cos(a) * rad,
        y = Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(148,163,184,0.1)";
    ctx.fill();
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = r.size === 1 ? 1.8 : 2.4;
    ctx.stroke();
    ctx.restore();
  }

  function drawSaucer(ctx, u) {
    ctx.save();
    ctx.translate(u.x, u.y);
    ctx.strokeStyle = "#f9a8d4";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(0, 0, u.r, u.r * 0.42, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, -u.r * 0.3, u.r * 0.5, u.r * 0.36, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-u.r, 0);
    ctx.lineTo(u.r, 0);
    ctx.stroke();
    ctx.restore();
  }
})();
