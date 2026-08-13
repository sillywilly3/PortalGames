/* Match — memory pairs against a move counter.
 * Fewer moves is better, so this game reports "low" scores like the timed ones.
 * Only the 4x4 board feeds the site-wide best.
 */
(function () {
  "use strict";

  var SIZES = {
    small: { cols: 4, rows: 4, label: "4 × 4" },
    medium: { cols: 6, rows: 4, label: "6 × 4" },
    large: { cols: 6, rows: 6, label: "6 × 6" }
  };

  /* Drawn as text glyphs so there are no image requests. */
  var FACES = [
    ["★", "#facc15"], ["●", "#38bdf8"], ["◆", "#f472b6"], ["▲", "#34d399"],
    ["■", "#a855f7"], ["✦", "#fb7185"], ["♥", "#ef4444"], ["♠", "#e2e8f0"],
    ["♣", "#22d3ee"], ["♦", "#f97316"], ["✶", "#c084fc"], ["◈", "#4ade80"],
    ["☾", "#fde68a"], ["☀", "#fbbf24"], ["⚑", "#60a5fa"], ["✿", "#f9a8d4"],
    ["⬟", "#2dd4bf"], ["⬢", "#818cf8"]
  ];

  var style = document.createElement("style");
  style.textContent =
    ".mt{display:flex;flex-direction:column;align-items:center;gap:10px;padding:8px}" +
    ".mt-bar{display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:center}" +
    ".mt-opt{height:27px;padding:0 11px;border-radius:999px;border:1px solid var(--border);" +
    "background:var(--surface);color:var(--muted);font-size:12px;font-weight:650}" +
    ".mt-opt[aria-pressed=true]{background:var(--brand-grad);color:#fff;border-color:transparent}" +
    ".mt-stat{font-size:13px;font-weight:700;color:var(--muted);font-variant-numeric:tabular-nums}" +
    ".mt-grid{display:grid;gap:8px}" +
    ".mt-card{position:relative;perspective:700px;background:none;border:none;padding:0;cursor:pointer}" +
    ".mt-in{position:absolute;inset:0;transition:transform .32s cubic-bezier(.4,.9,.4,1);" +
    "transform-style:preserve-3d}" +
    ".mt-card.up .mt-in,.mt-card.done .mt-in{transform:rotateY(180deg)}" +
    ".mt-f,.mt-b{position:absolute;inset:0;border-radius:10px;display:grid;place-items:center;" +
    "backface-visibility:hidden;-webkit-backface-visibility:hidden}" +
    ".mt-b{background:linear-gradient(140deg,#7aa7ff,#6d4bd8 60%,#8b2fd6);" +
    "box-shadow:inset 0 0 0 1px rgba(255,255,255,.2)}" +
    ".mt-b::after{content:'';width:38%;height:38%;border-radius:50%;border:2px solid rgba(255,255,255,.45)}" +
    ".mt-f{background:#101a30;transform:rotateY(180deg);box-shadow:inset 0 0 0 1px rgba(255,255,255,.12);" +
    "font-weight:700;line-height:1}" +
    ".mt-card.done .mt-f{box-shadow:inset 0 0 0 2px #34d399;background:#0e2119}" +
    ".mt-card.done{cursor:default}" +
    "@media (prefers-reduced-motion:reduce){.mt-in{transition:none}}";
  document.head.appendChild(style);

  PG.mount({
    id: "match",
    mode: "dom",
    autoStart: true,
    pauseable: false,
    pauseOnBlur: false,
    rKeyRestarts: false,
    swipe: false,

    setup: function (g) {
      var wrap = document.createElement("div");
      wrap.className = "mt";
      wrap.innerHTML =
        '<div class="mt-bar">' +
        Object.keys(SIZES)
          .map(function (k) {
            return '<button class="mt-opt" data-size="' + k + '">' + SIZES[k].label + "</button>";
          })
          .join("") +
        '<span class="mt-stat" data-stat></span>' +
        "</div>" +
        '<div class="mt-grid" data-grid></div>';
      g.root.appendChild(wrap);
      g.data.wrap = wrap;
      g.data.gridEl = wrap.querySelector("[data-grid]");
      g.data.size = PG.store.get("mt:size", "small");

      wrap.addEventListener("click", function (e) {
        var s = e.target.closest("[data-size]");
        if (s) {
          g.data.size = s.getAttribute("data-size");
          PG.store.set("mt:size", g.data.size);
          return g.start();
        }
        var c = e.target.closest("[data-i]");
        if (c) flip(g, +c.getAttribute("data-i"));
      });
    },

    start: function (g) {
      var d = g.data;
      var cfg = SIZES[d.size];
      d.cfg = cfg;
      var pairs = (cfg.cols * cfg.rows) / 2;

      var deck = [];
      for (var i = 0; i < pairs; i++) {
        deck.push(i % FACES.length, i % FACES.length);
      }
      for (var k = deck.length - 1; k > 0; k--) {
        var j = (Math.random() * (k + 1)) | 0;
        var t = deck[k];
        deck[k] = deck[j];
        deck[j] = t;
      }

      d.deck = deck;
      d.up = [];
      d.done = {};
      d.moves = 0;
      d.locked = false;
      d.finished = false;
      g.setScore(0);
      build(g);
      stat(g);
      Array.prototype.forEach.call(d.wrap.querySelectorAll("[data-size]"), function (b) {
        b.setAttribute("aria-pressed", b.getAttribute("data-size") === d.size ? "true" : "false");
      });
    },

    onKey: function (g, k) {
      if (k === "r") g.start();
    },

    onResize: function (g) {
      if (g.data.deck) size(g);
    }
  });

  function build(g) {
    var d = g.data;
    var el = d.gridEl;
    el.innerHTML = "";
    for (var i = 0; i < d.deck.length; i++) {
      var face = FACES[d.deck[i]];
      var b = document.createElement("button");
      b.className = "mt-card";
      b.setAttribute("data-i", i);
      b.setAttribute("aria-label", "face-down card");
      b.innerHTML =
        '<div class="mt-in"><div class="mt-b"></div>' +
        '<div class="mt-f" style="color:' + face[1] + '">' + face[0] + "</div></div>";
      el.appendChild(b);
    }
    size(g);
  }

  function size(g) {
    var d = g.data;
    var host = g.root.getBoundingClientRect();
    var gap = 8;
    var cw = (host.width - 40 - gap * (d.cfg.cols - 1)) / d.cfg.cols;
    var ch = (host.height - 90 - gap * (d.cfg.rows - 1)) / d.cfg.rows;
    var w = Math.max(38, Math.floor(Math.min(cw, ch / 1.3)));
    var h = Math.floor(w * 1.3);
    d.gridEl.style.gridTemplateColumns = "repeat(" + d.cfg.cols + ", " + w + "px)";
    Array.prototype.forEach.call(d.gridEl.children, function (c) {
      c.style.width = w + "px";
      c.style.height = h + "px";
      var f = c.querySelector(".mt-f");
      if (f) f.style.fontSize = Math.round(w * 0.5) + "px";
    });
  }

  function stat(g) {
    var d = g.data;
    var el = d.wrap.querySelector("[data-stat]");
    var best = PG.store.get("mt:best:" + d.size, null);
    if (el) el.textContent = d.moves + " moves   ·   Best " + (best === null ? "—" : best);
  }

  function flip(g, i) {
    var d = g.data;
    if (d.locked || d.finished || d.done[i] || d.up.indexOf(i) !== -1) return;

    var card = d.gridEl.children[i];
    card.classList.add("up");
    card.setAttribute("aria-label", "showing " + FACES[d.deck[i]][0]);
    d.up.push(i);
    g.sfx.tone(520, 0.04, "triangle", 0.05);

    if (d.up.length < 2) return;

    d.moves++;
    g.setScore(d.moves);
    stat(g);
    var a = d.up[0],
      b = d.up[1];

    if (d.deck[a] === d.deck[b]) {
      d.done[a] = d.done[b] = true;
      d.up = [];
      [a, b].forEach(function (x) {
        d.gridEl.children[x].classList.remove("up");
        d.gridEl.children[x].classList.add("done");
      });
      g.sfx.good();
      if (Object.keys(d.done).length === d.deck.length) win(g);
    } else {
      d.locked = true;
      setTimeout(function () {
        [a, b].forEach(function (x) {
          d.gridEl.children[x].classList.remove("up");
          d.gridEl.children[x].setAttribute("aria-label", "face-down card");
        });
        d.up = [];
        d.locked = false;
      }, 700);
      g.sfx.tone(220, 0.09, "square", 0.04);
    }
  }

  function win(g) {
    var d = g.data;
    d.finished = true;
    var key = "mt:best:" + d.size;
    var prev = PG.store.get(key, null);
    if (prev === null || d.moves < prev) PG.store.set(key, d.moves);
    stat(g);

    var perfect = d.deck.length / 2;
    if (d.size === "small") {
      g.over({
        won: true,
        title: "Board cleared",
        score: d.moves,
        text: d.moves + " moves (a perfect run is " + perfect + ")."
      });
    } else {
      g.over({
        won: true,
        title: "Board cleared",
        text: d.moves + " moves on " + d.cfg.label + ". Clear a 4 × 4 board to set the site record."
      });
    }
  }
})();
