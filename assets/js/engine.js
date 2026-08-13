/* Portal Games — game harness.
 *
 * Gives every game the same shell: a fitted render surface (canvas or DOM),
 * a ready/playing/paused/over state machine, DOM overlays, high-score
 * persistence, WebAudio sound effects, fullscreen, and touch controls that
 * synthesise the same keys the keyboard produces — so no game needs to know
 * whether it is being played with a thumb or a keyboard.
 */
(function () {
  "use strict";

  var PG = (window.PG = window.PG || {});

  /* Normalise a KeyboardEvent to a short lowercase name. */
  function keyName(e) {
    var k = e.key;
    if (k === " " || k === "Spacebar") return "space";
    if (k === "Escape") return "escape";
    if (k.length === 1) return k.toLowerCase();
    return k.toLowerCase(); // arrowleft, shift, enter, backspace, ...
  }

  var ARROW = { up: "arrowup", down: "arrowdown", left: "arrowleft", right: "arrowright" };

  /* ------------------------------------------------------------- audio -- */
  function makeAudio() {
    var ctx = null;
    var muted = PG.store ? PG.store.get("mute", false) : false;

    function ac() {
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
      }
      if (ctx.state === "suspended") ctx.resume();
      return ctx;
    }

    var api = {
      get muted() {
        return muted;
      },
      toggle: function () {
        muted = !muted;
        if (PG.store) PG.store.set("mute", muted);
        return muted;
      },
      /* A short synthesised tone. Everything in the site's sound design is
         built from this plus `noise`, which keeps the payload at zero bytes. */
      tone: function (freq, dur, type, vol, slideTo) {
        if (muted) return;
        var c = ac();
        if (!c) return;
        var o = c.createOscillator();
        var g = c.createGain();
        o.type = type || "square";
        o.frequency.setValueAtTime(freq, c.currentTime);
        if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), c.currentTime + dur);
        g.gain.setValueAtTime(0.0001, c.currentTime);
        g.gain.exponentialRampToValueAtTime(vol == null ? 0.09 : vol, c.currentTime + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
        o.connect(g).connect(c.destination);
        o.start();
        o.stop(c.currentTime + dur + 0.02);
      },
      noise: function (dur, vol, filterFreq) {
        if (muted) return;
        var c = ac();
        if (!c) return;
        var n = Math.floor(c.sampleRate * dur);
        var buf = c.createBuffer(1, n, c.sampleRate);
        var d = buf.getChannelData(0);
        for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
        var src = c.createBufferSource();
        src.buffer = buf;
        var f = c.createBiquadFilter();
        f.type = "lowpass";
        f.frequency.value = filterFreq || 1200;
        var g = c.createGain();
        g.gain.value = vol == null ? 0.14 : vol;
        src.connect(f).connect(g).connect(c.destination);
        src.start();
      }
    };

    // Named effects so games read declaratively.
    api.blip = function () { api.tone(660, 0.06, "square", 0.06); };
    api.pick = function () { api.tone(880, 0.09, "triangle", 0.1, 1400); };
    api.good = function () { api.tone(523, 0.09, "triangle", 0.1); setTimeout(function () { api.tone(784, 0.13, "triangle", 0.1); }, 80); };
    api.bad = function () { api.tone(180, 0.28, "sawtooth", 0.09, 60); };
    api.thud = function () { api.noise(0.14, 0.1, 700); };
    api.zap = function () { api.tone(1200, 0.07, "square", 0.05, 300); };
    api.win = function () {
      [523, 659, 784, 1047].forEach(function (f, i) {
        setTimeout(function () { api.tone(f, 0.16, "triangle", 0.1); }, i * 95);
      });
    };
    return api;
  }

  /* --------------------------------------------------------- particles -- */
  function makeParticles() {
    var list = [];
    return {
      list: list,
      burst: function (x, y, count, opts) {
        opts = opts || {};
        for (var i = 0; i < count; i++) {
          var a = opts.angle == null ? Math.random() * Math.PI * 2 : opts.angle + (Math.random() - 0.5) * (opts.spread || 1);
          var sp = (opts.speed || 140) * (0.35 + Math.random() * 0.9);
          list.push({
            x: x, y: y,
            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
            life: (opts.life || 0.6) * (0.6 + Math.random() * 0.7),
            age: 0,
            size: opts.size || 3,
            color: Array.isArray(opts.color) ? opts.color[(Math.random() * opts.color.length) | 0] : opts.color || "#fff",
            gravity: opts.gravity == null ? 260 : opts.gravity
          });
        }
      },
      update: function (dt) {
        for (var i = list.length - 1; i >= 0; i--) {
          var p = list[i];
          p.age += dt;
          if (p.age >= p.life) { list.splice(i, 1); continue; }
          p.vy += p.gravity * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
        }
      },
      draw: function (ctx) {
        for (var i = 0; i < list.length; i++) {
          var p = list[i];
          var t = 1 - p.age / p.life;
          ctx.globalAlpha = t;
          ctx.fillStyle = p.color;
          var s = p.size * t;
          ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
        }
        ctx.globalAlpha = 1;
      },
      clear: function () { list.length = 0; }
    };
  }

  /* ------------------------------------------------- touch control sets -- */
  var PAD = {
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 15 6-6 6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 6-6 6 6 6"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>',
    rotate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v4.5h-4.5"/></svg>'
  };

  /* Each layout is [leftGroupButtons, rightGroupButtons]; a button is
     [key, label-or-icon, extraClass]. */
  var LAYOUTS = {
    steer: [[["arrowleft", PAD.left], ["arrowright", PAD.right]], []],
    dpad: [[["arrowup", PAD.up, "tc-up"], ["arrowleft", PAD.left, "tc-left"], ["arrowdown", PAD.down, "tc-down"], ["arrowright", PAD.right, "tc-right"]], []],
    ship: [[["arrowleft", PAD.left], ["arrowright", PAD.right]], [["arrowup", PAD.up], ["space", "FIRE", "wide"]]],
    stacks: [[["arrowleft", PAD.left], ["arrowdown", PAD.down], ["arrowright", PAD.right]], [["c", "HOLD"], ["arrowup", PAD.rotate], ["space", "DROP", "wide"]]]
  };

  function buildTouch(stage, cfg, press, release) {
    var layout = LAYOUTS[cfg];
    if (!layout) return;
    var host = document.createElement("div");
    host.className = "touch-controls";

    layout.forEach(function (group, gi) {
      var g = document.createElement("div");
      g.className = "tc-group" + (cfg === "dpad" && gi === 0 ? " tc-pad" : "");
      if (cfg !== "dpad") g.style.gridAutoFlow = "column";
      group.forEach(function (b) {
        var el = document.createElement("button");
        el.className = "tc-btn" + (b[2] ? " " + b[2] : "");
        el.innerHTML = b[1];
        el.setAttribute("aria-label", b[0]);
        el.setAttribute("tabindex", "-1");
        var key = b[0];
        var down = function (e) {
          e.preventDefault();
          el.classList.add("on");
          press(key);
        };
        var up = function (e) {
          e.preventDefault();
          el.classList.remove("on");
          release(key);
        };
        el.addEventListener("pointerdown", down);
        el.addEventListener("pointerup", up);
        el.addEventListener("pointercancel", up);
        el.addEventListener("pointerleave", up);
        el.addEventListener("contextmenu", function (e) { e.preventDefault(); });
        g.appendChild(el);
      });
      host.appendChild(g);
    });

    // Keep the DOM order (left group, right group) even when one is empty.
    if (layout[1].length === 0) host.style.justifyContent = "center";
    stage.appendChild(host);
  }

  /* --------------------------------------------------------- the mount -- */
  PG.mount = function (config) {
    var stage = document.getElementById("stage");
    if (!stage) return null;

    var W = config.width || 800;
    var H = config.height || 500;
    var mode = config.mode === "dom" ? "dom" : "canvas";
    var id = config.id || document.body.getAttribute("data-game-id") || "game";
    var meta = (PG.games && PG.games[id]) || {};

    var g = {
      id: id,
      w: W,
      h: H,
      mode: mode,
      stage: stage,
      state: "ready",
      score: 0,
      best: PG.Scores ? PG.Scores.get(id) : null,
      time: 0,
      dt: 0,
      keys: Object.create(null),
      justPressed: Object.create(null),
      pointer: { x: 0, y: 0, down: false, justDown: false, inside: false },
      sfx: makeAudio(),
      fx: makeParticles(),
      data: {} // free scratch space for the game module
    };

    /* --- surface ------------------------------------------------------- */
    var ctx = null;
    var canvas = null;
    var scale = 1,
      offX = 0,
      offY = 0;

    if (mode === "canvas") {
      canvas = document.createElement("canvas");
      canvas.setAttribute("aria-label", (meta.title || "Game") + " play area");
      canvas.setAttribute("role", "img");
      stage.appendChild(canvas);
      ctx = canvas.getContext("2d", { alpha: false });
      g.canvas = canvas;
      g.ctx = ctx;
    } else {
      var root = document.createElement("div");
      root.className = "dom-stage";
      root.style.cssText =
        "position:absolute;inset:0;display:grid;place-items:center;overflow:hidden;";
      stage.appendChild(root);
      g.root = root;
    }

    function resize() {
      var r = stage.getBoundingClientRect();
      if (mode === "canvas") {
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var cw = Math.max(1, Math.round(r.width * dpr));
        var ch = Math.max(1, Math.round(r.height * dpr));
        if (canvas.width !== cw || canvas.height !== ch) {
          canvas.width = cw;
          canvas.height = ch;
        }
        scale = Math.min(cw / W, ch / H);
        offX = (cw - W * scale) / 2;
        offY = (ch - H * scale) / 2;
      }
      g.viewW = r.width;
      g.viewH = r.height;
      if (config.onResize) config.onResize(g);
    }

    /* --- overlay ------------------------------------------------------- */
    var overlay = document.createElement("div");
    overlay.className = "overlay";
    overlay.hidden = true;
    stage.appendChild(overlay);

    function fmt(v) {
      return PG.Scores ? PG.Scores.format(id, v) : String(v);
    }

    function showOverlay(o) {
      var html = "";
      if (o.eyebrow) html += '<p class="eyebrow">' + PG.esc(o.eyebrow) + "</p>";
      if (o.title) html += "<h2>" + PG.esc(o.title) + "</h2>";
      if (o.newBest) html += '<p class="newbest">' + PG.icon("star") + "New personal best</p>";
      if (o.text) html += "<p>" + PG.esc(o.text) + "</p>";
      if (o.scores) {
        html +=
          '<div class="scores">' +
          o.scores
            .map(function (s) {
              return "<div><b>" + PG.esc(s[1]) + "</b><span>" + PG.esc(s[0]) + "</span></div>";
            })
            .join("") +
          "</div>";
      }
      if (o.button) html += '<button class="btn btn-primary btn-lg" data-overlay-action>' + PG.esc(o.button) + "</button>";
      if (o.hint) html += '<p class="keyhint">' + o.hint + "</p>";
      overlay.innerHTML = html;
      overlay.hidden = false;
      var b = overlay.querySelector("[data-overlay-action]");
      if (b) setTimeout(function () { b.focus(); }, 30);
    }

    function hideOverlay() {
      overlay.hidden = true;
      overlay.innerHTML = "";
    }

    g.showOverlay = showOverlay;
    g.hideOverlay = hideOverlay;

    /* --- HUD ----------------------------------------------------------- */
    var scoreEl = document.querySelector("[data-score]");
    var bestEl = document.querySelector("[data-best]");

    function paintHud() {
      if (scoreEl) scoreEl.textContent = typeof g.score === "number" ? fmt(g.score) : g.score;
      if (bestEl) bestEl.textContent = g.best === null || g.best === undefined ? "—" : fmt(g.best);
    }

    g.setScore = function (v) {
      g.score = v;
      paintHud();
    };

    g.addScore = function (v) {
      g.score += v;
      paintHud();
    };

    /* --- state machine -------------------------------------------------- */
    function readyScreen() {
      g.state = "ready";
      showOverlay({
        eyebrow: meta.tagline || "",
        title: meta.title || "Ready?",
        text: config.readyText || meta.howto,
        button: "Play",
        // Checked directly rather than via the body class, because a game can
        // mount before the shell's DOMContentLoaded handler has run.
        hint: window.matchMedia("(hover: none) and (pointer: coarse)").matches
          ? "Tap to begin"
          : "or press <kbd>Space</kbd>"
      });
    }

    g.start = function () {
      hideOverlay();
      g.fx.clear();
      g.score = config.startScore == null ? 0 : config.startScore;
      g.time = 0;
      g.state = "playing";
      paintHud();
      if (config.start) config.start(g);
      updatePauseBtn();
    };

    g.restart = function () {
      g.start();
    };

    g.pause = function () {
      if (g.state !== "playing") return;
      g.state = "paused";
      showOverlay({
        eyebrow: "Paused",
        title: "Take your time",
        button: "Resume",
        hint: "or press <kbd>P</kbd>"
      });
      updatePauseBtn();
    };

    g.resume = function () {
      if (g.state !== "paused") return;
      hideOverlay();
      g.state = "playing";
      updatePauseBtn();
    };

    g.togglePause = function () {
      if (g.state === "playing") g.pause();
      else if (g.state === "paused") g.resume();
      else if (g.state === "ready" || g.state === "over") g.start();
    };

    /* End a run. `opts.score` overrides g.score for the leaderboard (used by
       timed games where the tracked value is not the running score). */
    g.over = function (opts) {
      if (g.state === "over") return;
      opts = opts || {};
      g.state = "over";
      var final = opts.score == null ? g.score : opts.score;
      var isBest = false;
      var hadPrevious = false;
      if (meta.score && typeof final === "number") {
        hadPrevious = PG.Scores.get(id) !== null;
        isBest = PG.Scores.submit(id, final);
        if (isBest) g.best = final;
      }
      paintHud();
      if (opts.won) g.sfx.win();
      else g.sfx.bad();

      var scores = [];
      if (meta.score) {
        scores.push([meta.scoreLabel || "Score", fmt(final)]);
        scores.push(["Best", g.best == null ? "—" : fmt(g.best)]);
      }
      showOverlay({
        eyebrow: opts.won ? "Complete" : "Game over",
        title: opts.title || (opts.won ? "Nice." : "Run ended"),
        text: opts.text,
        // Only a run that beats an earlier one is a "new best" — the first
        // run of all is just the first run.
        newBest: isBest && hadPrevious && !opts.won,
        scores: scores.length ? scores : null,
        button: opts.button || "Play again",
        hint: "or press <kbd>Space</kbd>"
      });
      updatePauseBtn();
    };

    /* --- input ---------------------------------------------------------- */
    function press(k) {
      if (!g.keys[k]) g.justPressed[k] = true;
      g.keys[k] = true;
      handleKey(k);
    }

    function release(k) {
      g.keys[k] = false;
      if (config.onKeyUp) config.onKeyUp(g, k);
    }

    function handleKey(k) {
      if (k === "space" || k === "enter") {
        if (g.state === "ready" || g.state === "over") {
          g.start();
          return;
        }
        if (g.state === "paused") {
          g.resume();
          return;
        }
      }
      if (k === "p" && config.pauseable !== false) {
        g.togglePause();
        return;
      }
      if (config.onKey) config.onKey(g, k);
    }

    g.press = press;

    var keyHandler = function (e) {
      var t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      var k = keyName(e);
      // Stop the page scrolling out from under an arrow-key game.
      if (k === "space" || k.indexOf("arrow") === 0) e.preventDefault();
      if (e.repeat) {
        if (config.onKeyRepeat) config.onKeyRepeat(g, k);
        return;
      }
      press(k);
    };

    var keyUpHandler = function (e) {
      release(keyName(e));
    };

    window.addEventListener("keydown", keyHandler);
    window.addEventListener("keyup", keyUpHandler);

    /* Pointer, reported in logical game coordinates. */
    function toLocal(e) {
      var r = stage.getBoundingClientRect();
      if (mode === "canvas") {
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        return {
          x: ((e.clientX - r.left) * dpr - offX) / scale,
          y: ((e.clientY - r.top) * dpr - offY) / scale
        };
      }
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    var swipeStart = null;

    stage.addEventListener("pointerdown", function (e) {
      if (e.target.closest(".tc-btn") || e.target.closest("[data-overlay-action]")) return;
      var p = toLocal(e);
      g.pointer.x = p.x;
      g.pointer.y = p.y;
      g.pointer.down = true;
      g.pointer.justDown = true;
      swipeStart = { x: e.clientX, y: e.clientY, t: performance.now() };
      if (stage.setPointerCapture) {
        try { stage.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      }
      if (config.onPointerDown) config.onPointerDown(g, g.pointer);
      if (config.tapToAct !== false && (g.state === "ready" || g.state === "over")) {
        // A tap on the stage starts or restarts, matching the Space key.
        if (overlay.hidden) g.start();
      }
    });

    stage.addEventListener("pointermove", function (e) {
      var p = toLocal(e);
      g.pointer.x = p.x;
      g.pointer.y = p.y;
      g.pointer.inside = true;
      if (config.onPointerMove) config.onPointerMove(g, g.pointer);
    });

    stage.addEventListener("pointerleave", function () {
      g.pointer.inside = false;
    });

    var endPointer = function (e) {
      g.pointer.down = false;
      if (config.onPointerUp) config.onPointerUp(g, g.pointer);
      if (swipeStart && config.swipe !== false) {
        var dx = e.clientX - swipeStart.x;
        var dy = e.clientY - swipeStart.y;
        var adx = Math.abs(dx),
          ady = Math.abs(dy);
        if (Math.max(adx, ady) > 28 && performance.now() - swipeStart.t < 700) {
          var dir = adx > ady ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
          if (config.onSwipe) config.onSwipe(g, dir);
          else {
            press(ARROW[dir]);
            release(ARROW[dir]);
          }
        }
      }
      swipeStart = null;
    };

    stage.addEventListener("pointerup", endPointer);
    stage.addEventListener("pointercancel", function () {
      g.pointer.down = false;
      swipeStart = null;
    });

    stage.addEventListener("contextmenu", function (e) {
      if (config.allowContextMenu) return;
      e.preventDefault();
    });

    overlay.addEventListener("click", function (e) {
      if (e.target.closest("[data-overlay-action]")) {
        if (g.state === "paused") g.resume();
        else g.start();
      }
    });

    if (meta.touch) buildTouch(stage, meta.touch, press, release);

    /* --- toolbar buttons ------------------------------------------------ */
    var pauseBtn = document.querySelector("[data-act-pause]");

    function updatePauseBtn() {
      if (!pauseBtn) return;
      pauseBtn.hidden = g.state !== "playing" && g.state !== "paused";
      pauseBtn.textContent = g.state === "paused" ? "Resume" : "Pause";
    }

    document.addEventListener("click", function (e) {
      if (e.target.closest("[data-act-restart]")) {
        g.start();
      } else if (e.target.closest("[data-act-pause]")) {
        g.togglePause();
      } else if (e.target.closest("[data-act-mute]")) {
        var m = g.sfx.toggle();
        var btn = e.target.closest("[data-act-mute]");
        btn.innerHTML = PG.icon(m ? "mute" : "volume");
        btn.setAttribute("aria-label", m ? "Unmute" : "Mute");
        btn.setAttribute("aria-pressed", m ? "true" : "false");
      } else if (e.target.closest("[data-act-fullscreen]")) {
        toggleFullscreen();
      }
    });

    var muteBtn = document.querySelector("[data-act-mute]");
    if (muteBtn) {
      muteBtn.innerHTML = PG.icon(g.sfx.muted ? "mute" : "volume");
      muteBtn.setAttribute("aria-pressed", g.sfx.muted ? "true" : "false");
    }

    function toggleFullscreen() {
      var shell = stage.closest(".stage-shell") || stage;
      if (document.fullscreenElement) document.exitFullscreen();
      else if (shell.requestFullscreen) shell.requestFullscreen().catch(function () {});
    }

    window.addEventListener("keydown", function (e) {
      var t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      var k = keyName(e);
      if (k === "f") toggleFullscreen();
      else if (k === "m" && muteBtn) muteBtn.click();
      else if (k === "r" && config.rKeyRestarts !== false) g.start();
    });

    /* Pause rather than let a game run on in a hidden tab. */
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) g.pause();
    });
    window.addEventListener("blur", function () {
      if (config.pauseOnBlur !== false) g.pause();
    });

    /* --- loop ------------------------------------------------------------ */
    var last = 0;
    var ro = null;

    function frame(now) {
      var dt = last ? Math.min((now - last) / 1000, 1 / 20) : 0;
      last = now;
      g.dt = dt;

      if (g.state === "playing") {
        g.time += dt;
        if (config.update) config.update(g, dt);
        g.fx.update(dt);
      }

      if (mode === "canvas") {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = config.letterbox || "#0c1425";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.setTransform(scale, 0, 0, scale, offX, offY);
        ctx.beginPath();
        ctx.rect(0, 0, W, H);
        ctx.clip();
        if (config.draw) config.draw(g, ctx);
      }

      // Clear one-frame input latches after the game has seen them.
      for (var k in g.justPressed) g.justPressed[k] = false;
      g.pointer.justDown = false;

      requestAnimationFrame(frame);
    }

    /* --- go -------------------------------------------------------------- */
    resize();
    if (window.ResizeObserver) {
      ro = new ResizeObserver(resize);
      ro.observe(stage);
    }
    window.addEventListener("resize", resize);
    document.addEventListener("fullscreenchange", function () {
      setTimeout(resize, 60);
    });

    paintHud();
    if (config.setup) config.setup(g);

    if (config.autoStart) {
      g.start();
    } else {
      readyScreen();
    }
    updatePauseBtn();
    requestAnimationFrame(frame);

    return g;
  };

  /* -------------------------------------------------- drawing helpers -- */
  PG.draw = {
    roundRect: function (ctx, x, y, w, h, r) {
      var rr = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + rr, y);
      ctx.arcTo(x + w, y, x + w, y + h, rr);
      ctx.arcTo(x + w, y + h, x, y + h, rr);
      ctx.arcTo(x, y + h, x, y, rr);
      ctx.arcTo(x, y, x + w, y, rr);
      ctx.closePath();
    },
    text: function (ctx, str, x, y, size, color, align, weight) {
      ctx.font = (weight || 700) + " " + size + "px " + "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
      ctx.fillStyle = color;
      ctx.textAlign = align || "center";
      ctx.textBaseline = "middle";
      ctx.fillText(str, x, y);
    }
  };

  /* Deterministic small PRNG — used where a game wants a repeatable world. */
  PG.rng = function (seed) {
    var s = seed >>> 0 || 1;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  };

  PG.clamp = function (v, a, b) {
    return v < a ? a : v > b ? b : v;
  };

  PG.lerp = function (a, b, t) {
    return a + (b - a) * t;
  };
})();
