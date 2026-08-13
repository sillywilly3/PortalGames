/* Slope — endless pseudo-3D descent.
 *
 * The world is one dimension of distance. Everything (track centre, width,
 * obstacles) is a function of z, projected to the screen with a simple
 * pinhole camera, so there is no scene graph and no 3D library involved.
 */
(function () {
  "use strict";

  var W = 900,
    H = 562;

  /* Camera constants are derived, not guessed. With FOCAL/d as the projection
     scale: at the near plane the road edge lands near the bottom of the frame,
     and at the ball's distance the track spans a little over half the width. */
  var FOCAL = 300;
  var CAM_H = 6.0; // camera height above the road, in world units
  var HORIZON = 170;
  var NEAR = 2.2; // nearest drawn depth; closer slabs run off the bottom edge
  var SEG = 2; // world length of one road slab
  var SLABS = 62;
  var BALL_D = 6.0; // how far ahead of the camera the ball sits
  var BALL_R = 0.52; // ≈26 px on screen, roughly a tenth of the track width

  /* Smooth, non-repeating track centreline built from incommensurable sines.
     Amplitudes and frequencies are capped so the steepest lateral slope
     (~0.062 units sideways per unit forward) stays inside what the ball can
     out-steer at top speed — otherwise late runs would be unwinnable. */
  function centreAt(z) {
    return (
      5.0 * Math.sin(z * 0.0092) +
      3.0 * Math.sin(z * 0.0041 + 1.3) +
      1.8 * Math.sin(z * 0.0021 + 2.2)
    );
  }

  /* Lateral slope of the track, used to yaw the camera along the tangent. */
  function slopeAt(z) {
    return (centreAt(z + 0.5) - centreAt(z - 0.5)) / 1;
  }

  function halfWidthAt(z) {
    return Math.max(3.2, 5.5 - z / 3000);
  }

  function speedAt(z) {
    return Math.min(58, 22 + z / 150);
  }

  PG.mount({
    id: "slope",
    width: W,
    height: H,
    letterbox: "#080d1c",

    setup: function (g) {
      g.data.stars = [];
      for (var i = 0; i < 90; i++) {
        g.data.stars.push({
          x: Math.random() * W,
          y: Math.random() * HORIZON,
          r: Math.random() < 0.85 ? 1 : 1.8,
          a: 0.2 + Math.random() * 0.6
        });
      }
    },

    start: function (g) {
      var d = g.data;
      d.dist = 0;
      d.camX = centreAt(BALL_D);
      d.ballX = d.camX;
      d.vx = 0;
      d.obstacles = [];
      d.nextObstacleZ = 220; // a calm opening stretch
      d.shake = 0;
      d.speed = speedAt(0);
    },

    update: function (g, dt) {
      var d = g.data;

      d.speed = speedAt(d.dist);
      d.dist += d.speed * dt;

      /* Steering: acceleration with drag, so the ball has weight. */
      var input = 0;
      if (g.keys.arrowleft || g.keys.a) input -= 1;
      if (g.keys.arrowright || g.keys.d) input += 1;
      // Dragging a finger or the mouse across the stage also steers.
      if (g.pointer.down && !input) {
        input = PG.clamp((g.pointer.x - W / 2) / (W * 0.25), -1, 1);
      }

      d.vx += input * 15 * dt;
      d.vx *= Math.pow(0.0016, dt); // frame-rate independent drag
      d.vx = PG.clamp(d.vx, -7, 7);
      d.ballX += d.vx * dt;

      d.camX = PG.lerp(d.camX, d.ballX, Math.min(1, 9 * dt));

      var ballZ = d.dist + BALL_D;
      // Yawing the camera along the track tangent is what makes a curve read
      // as a bend rather than the whole road sliding sideways.
      d.yaw = slopeAt(ballZ);
      d.ballZ = ballZ;

      /* Leave the road and the run is over. */
      var off = Math.abs(d.ballX - centreAt(ballZ));
      if (off > halfWidthAt(ballZ) + BALL_R * 0.35) {
        return crash(g, "Off the edge");
      }

      /* Spawn obstacles further ahead as speed climbs. */
      while (d.nextObstacleZ < d.dist + SLABS * SEG) {
        spawn(d, d.nextObstacleZ);
        var gap = Math.max(26, 92 - d.dist / 90);
        d.nextObstacleZ += gap * (0.7 + Math.random() * 0.7);
      }

      for (var i = d.obstacles.length - 1; i >= 0; i--) {
        var o = d.obstacles[i];
        if (o.z < d.dist - 8) {
          d.obstacles.splice(i, 1);
          continue;
        }
        if (Math.abs(o.z - ballZ) < 1.2 + BALL_R && Math.abs(o.x - d.ballX) < o.w / 2 + BALL_R * 0.8) {
          return crash(g, "Hit a block");
        }
      }

      if (d.shake > 0) d.shake = Math.max(0, d.shake - dt * 3);

      g.setScore(Math.floor(d.dist));
      if (Math.floor(d.dist) % 500 === 0 && Math.floor(d.dist) > 0 && d.lastMilestone !== Math.floor(d.dist)) {
        d.lastMilestone = Math.floor(d.dist);
        g.sfx.pick();
      }
    },

    draw: function (g, ctx) {
      var d = g.data;
      var dist = d.dist || 0;
      var camX = d.camX || 0;

      ctx.save();
      if (d.shake > 0) {
        ctx.translate((Math.random() - 0.5) * d.shake * 16, (Math.random() - 0.5) * d.shake * 16);
      }

      drawSky(g, ctx, dist);
      drawRoad(g, ctx, dist, camX);
      drawObstacles(g, ctx, dist, camX);
      drawBall(g, ctx, dist, camX);
      g.fx.draw(ctx);
      drawHud(g, ctx, dist);

      ctx.restore();
    }
  });

  /* ------------------------------------------------------------ helpers -- */
  function spawn(d, z) {
    var half = halfWidthAt(z);
    var count = d.dist > 1800 ? (Math.random() < 0.35 ? 2 : 1) : 1;
    for (var i = 0; i < count; i++) {
      var w = 0.7 + Math.random() * 1.2;
      var lane = (Math.random() * 2 - 1) * (half - w / 2 - 0.3);
      d.obstacles.push({
        z: z + i * 4,
        x: centreAt(z) + lane,
        w: w,
        h: 0.6 + Math.random() * 0.6
      });
    }
  }

  function crash(g, reason) {
    var d = g.data;
    var p = project(BALL_D, d.ballX - d.camX, BALL_R);
    g.fx.burst(p.x, p.y, 34, {
      color: ["#7aa7ff", "#8b2fd6", "#ffffff", "#22d3ee"],
      speed: 320,
      life: 0.85,
      size: 5,
      gravity: 420
    });
    d.shake = 1;
    g.sfx.thud();
    g.over({ text: reason + " at " + Math.floor(d.dist) + " m." });
  }

  /* Lateral screen-space offset of a world point, with the camera's yaw
     removed. At the ball's own distance the tangent term is zero, so the track
     is always centred under the ball. */
  function lateral(g, worldX, z, camX) {
    return worldX - camX - (g.data.yaw || 0) * (z - (g.data.ballZ || 0));
  }

  /* Project a point: d = distance ahead of camera, x = lateral offset from
     camera, y = height above the road. */
  function project(dz, x, y) {
    var s = FOCAL / Math.max(0.6, dz);
    return { x: W / 2 + x * s, y: HORIZON + (CAM_H - y) * s, s: s };
  }

  function drawSky(g, ctx, dist) {
    var grad = ctx.createLinearGradient(0, 0, 0, HORIZON + 60);
    grad.addColorStop(0, "#070b1c");
    grad.addColorStop(0.6, "#101a3a");
    grad.addColorStop(1, "#1d2a55");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, HORIZON + 60);

    var stars = g.data.stars || [];
    for (var i = 0; i < stars.length; i++) {
      var st = stars[i];
      ctx.globalAlpha = st.a * (0.6 + 0.4 * Math.sin(dist * 0.02 + i));
      ctx.fillStyle = "#cfe0ff";
      ctx.fillRect(st.x, st.y, st.r, st.r);
    }
    ctx.globalAlpha = 1;

    // Distant glow where the track vanishes.
    var glow = ctx.createRadialGradient(W / 2, HORIZON, 0, W / 2, HORIZON, 260);
    glow.addColorStop(0, "rgba(122,167,255,0.34)");
    glow.addColorStop(1, "rgba(122,167,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, HORIZON - 260, W, 320);

    ctx.fillStyle = "#0a1024";
    ctx.fillRect(0, HORIZON + 60, W, H - HORIZON - 60);
  }

  function drawRoad(g, ctx, dist, camX) {
    var base = Math.floor(dist / SEG) * SEG;

    for (var k = SLABS; k >= 1; k--) {
      var zFar = base + k * SEG;
      var zNear = base + (k - 1) * SEG;
      var dFar = zFar - dist;
      var dNear = zNear - dist;
      if (dNear < NEAR) continue;

      var cFar = lateral(g, centreAt(zFar), zFar, camX);
      var cNear = lateral(g, centreAt(zNear), zNear, camX);
      var wFar = halfWidthAt(zFar);
      var wNear = halfWidthAt(zNear);

      var fl = project(dFar, cFar - wFar, 0);
      var fr = project(dFar, cFar + wFar, 0);
      var nl = project(dNear, cNear - wNear, 0);
      var nr = project(dNear, cNear + wNear, 0);

      var idx = Math.floor(zFar / SEG);
      var fade = PG.clamp(1 - dFar / (SLABS * SEG), 0, 1);

      ctx.beginPath();
      ctx.moveTo(fl.x, fl.y);
      ctx.lineTo(fr.x, fr.y);
      ctx.lineTo(nr.x, nr.y);
      ctx.lineTo(nl.x, nl.y);
      ctx.closePath();
      ctx.fillStyle = idx % 2 ? "rgba(30,42,80," + (0.35 + fade * 0.6) + ")" : "rgba(22,32,64," + (0.35 + fade * 0.6) + ")";
      ctx.fill();

      // Glowing rails.
      ctx.strokeStyle = "rgba(122,167,255," + (0.15 + fade * 0.75) + ")";
      ctx.lineWidth = Math.max(1, 2.5 * fade);
      ctx.beginPath();
      ctx.moveTo(fl.x, fl.y);
      ctx.lineTo(nl.x, nl.y);
      ctx.moveTo(fr.x, fr.y);
      ctx.lineTo(nr.x, nr.y);
      ctx.stroke();

      // Every fourth slab gets a cross-stripe, which is what sells the speed.
      if (idx % 6 === 0) {
        ctx.strokeStyle = "rgba(139,47,214," + (0.1 + fade * 0.5) + ")";
        ctx.lineWidth = Math.max(1, 2 * fade);
        ctx.beginPath();
        ctx.moveTo(fl.x, fl.y);
        ctx.lineTo(fr.x, fr.y);
        ctx.stroke();
      }
    }
  }

  function drawObstacles(g, ctx, dist, camX) {
    var list = (g.data.obstacles || []).slice().sort(function (a, b) {
      return b.z - a.z;
    });

    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      var dz = o.z - dist;
      if (dz < NEAR || dz > SLABS * SEG) continue;

      var fade = PG.clamp(1 - dz / (SLABS * SEG), 0, 1);
      var backD = dz + 1.1;
      var frontD = Math.max(NEAR, dz - 1.1);
      var lx = lateral(g, o.x - o.w / 2, o.z, camX);
      var rx = lateral(g, o.x + o.w / 2, o.z, camX);

      var bl = project(backD, lx, 0),
        br = project(backD, rx, 0),
        blt = project(backD, lx, o.h),
        brt = project(backD, rx, o.h);
      var fl = project(frontD, lx, 0),
        fr = project(frontD, rx, 0),
        flt = project(frontD, lx, o.h),
        frt = project(frontD, rx, o.h);

      // Top face
      ctx.beginPath();
      ctx.moveTo(blt.x, blt.y);
      ctx.lineTo(brt.x, brt.y);
      ctx.lineTo(frt.x, frt.y);
      ctx.lineTo(flt.x, flt.y);
      ctx.closePath();
      ctx.fillStyle = "rgba(180,70,220," + (0.35 + fade * 0.55) + ")";
      ctx.fill();

      // Front face
      ctx.beginPath();
      ctx.moveTo(flt.x, flt.y);
      ctx.lineTo(frt.x, frt.y);
      ctx.lineTo(fr.x, fr.y);
      ctx.lineTo(fl.x, fl.y);
      ctx.closePath();
      ctx.fillStyle = "rgba(120,35,170," + (0.45 + fade * 0.5) + ")";
      ctx.fill();
      ctx.strokeStyle = "rgba(240,190,255," + (0.2 + fade * 0.7) + ")";
      ctx.lineWidth = Math.max(1, 1.8 * fade);
      ctx.stroke();
      void bl;
      void br;
    }
  }

  function drawBall(g, ctx, dist, camX) {
    var d = g.data;
    var lateral = (d.ballX || 0) - camX;
    var p = project(BALL_D, lateral, BALL_R);
    var r = BALL_R * p.s;

    // Contact shadow
    var ground = project(BALL_D, lateral, 0);
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(ground.x, ground.y, r * 1.05, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    var grad = ctx.createRadialGradient(p.x - r * 0.35, p.y - r * 0.4, r * 0.1, p.x, p.y, r);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.35, "#bcd4ff");
    grad.addColorStop(1, "#5f7fd8");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function drawHud(g, ctx, dist) {
    PG.draw.text(ctx, Math.floor(dist) + " m", W / 2, 44, 40, "rgba(240,248,255,0.95)", "center", 800);
    PG.draw.text(
      ctx,
      Math.round((g.data.speed || 0) * 3.6) + " km/h",
      W / 2,
      76,
      15,
      "rgba(159,171,198,0.85)",
      "center",
      600
    );
  }
})();
