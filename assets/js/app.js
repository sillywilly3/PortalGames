/* Portal Games — application shell.
 * Handles theme, favourites, recently played, high scores, search/filtering,
 * the tab cloak, toasts and global keyboard shortcuts.
 * No external requests, no analytics, no ad code. Ever.
 */
(function () {
  "use strict";

  var DATA = window.PG_DATA || { SITE: {}, CATEGORIES: [], GAMES: [] };
  var GAMES = DATA.GAMES;
  var byId = {};
  GAMES.forEach(function (g) {
    byId[g.id] = g;
  });

  /* ----------------------------------------------------------- storage -- */
  var NS = "pg:";

  var store = {
    get: function (key, fallback) {
      try {
        var raw = localStorage.getItem(NS + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },
    set: function (key, value) {
      try {
        localStorage.setItem(NS + key, JSON.stringify(value));
        return true;
      } catch (e) {
        return false; // private mode / quota — degrade quietly
      }
    },
    remove: function (key) {
      try {
        localStorage.removeItem(NS + key);
      } catch (e) {
        /* ignore */
      }
    }
  };

  /* ------------------------------------------------------------- utils -- */
  function $(sel, ctx) {
    return (ctx || document).querySelector(sel);
  }

  function $$(sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function icon(name, cls) {
    var p = ICONS[name] || "";
    return (
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' +
      (cls ? ' class="' + cls + '"' : "") +
      ">" +
      p +
      "</svg>"
    );
  }

  var ICONS = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/>',
    star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8L3.5 9.7l5.9-.9z"/>',
    play: '<path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none"/>',
    home: '<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>',
    grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
    mask: '<path d="M3 8.5c3-1.5 6-1.5 9 0 3-1.5 6-1.5 9 0v3.2c0 3-2.4 5.3-5.2 5.3-1.9 0-3.1-1-3.8-2.4-.7 1.4-1.9 2.4-3.8 2.4C5.4 17 3 14.7 3 11.7z"/>',
    sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    chev: '<path d="m9 5 7 7-7 7"/>',
    refresh: '<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v4.5h-4.5"/>',
    expand: '<path d="M8 3.5H3.5V8M16 3.5h4.5V8M8 20.5H3.5V16M16 20.5h4.5V16"/>',
    volume: '<path d="M11 5 6.5 8.5H3.5v7h3L11 19z"/><path d="M15.5 9.2a4 4 0 0 1 0 5.6"/><path d="M18 6.7a7.5 7.5 0 0 1 0 10.6"/>',
    mute: '<path d="M11 5 6.5 8.5H3.5v7h3L11 19z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/>',
    pause: '<path d="M9 5v14M15 5v14"/>',
    keyboard:
      '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M7 10h.01M11 10h.01M15 10h.01M17 10h.01M7 14h10"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    trash: '<path d="M4 7h16M9.5 7V4.5h5V7M6 7l1 13h10l1-13"/>'
  };

  /* -------------------------------------------------------- preferences -- */
  var Theme = {
    get: function () {
      return store.get("theme", "dark");
    },
    apply: function (t) {
      document.documentElement.setAttribute("data-theme", t);
      var btn = $("[data-theme-toggle]");
      if (btn) {
        btn.innerHTML = icon(t === "light" ? "moon" : "sun");
        btn.setAttribute("aria-label", "Switch to " + (t === "light" ? "dark" : "light") + " theme");
        btn.title = btn.getAttribute("aria-label");
      }
    },
    toggle: function () {
      var next = Theme.get() === "light" ? "dark" : "light";
      store.set("theme", next);
      Theme.apply(next);
    }
  };

  /* --------------------------------------------------------- favourites -- */
  var Favs = {
    all: function () {
      var v = store.get("favs", []);
      return Array.isArray(v) ? v : [];
    },
    has: function (id) {
      return Favs.all().indexOf(id) !== -1;
    },
    toggle: function (id) {
      var list = Favs.all();
      var i = list.indexOf(id);
      if (i === -1) list.push(id);
      else list.splice(i, 1);
      store.set("favs", list);
      syncFavButtons();
      return i === -1;
    }
  };

  function syncFavButtons() {
    var favs = Favs.all();
    $$("[data-fav]").forEach(function (b) {
      var on = favs.indexOf(b.getAttribute("data-fav")) !== -1;
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.setAttribute("aria-label", (on ? "Remove " : "Add ") + b.dataset.favTitle + (on ? " from" : " to") + " favourites");
    });
    var chip = $('[data-filter="fav"] .count');
    if (chip) chip.textContent = favs.length;
  }

  /* ------------------------------------------------------------ recents -- */
  var Recents = {
    all: function () {
      var v = store.get("recents", []);
      return Array.isArray(v) ? v.filter(function (id) { return byId[id]; }) : [];
    },
    push: function (id) {
      var list = Recents.all().filter(function (x) {
        return x !== id;
      });
      list.unshift(id);
      store.set("recents", list.slice(0, 12));
    },
    clear: function () {
      store.remove("recents");
    }
  };

  /* ------------------------------------------------------------- scores -- */
  var Scores = {
    key: function (id) {
      return "score:" + id;
    },
    get: function (id) {
      var v = store.get(Scores.key(id), null);
      return typeof v === "number" && isFinite(v) ? v : null;
    },
    /* Returns true when this run set a new personal best. */
    submit: function (id, value) {
      var game = byId[id];
      if (!game || !game.score || typeof value !== "number" || !isFinite(value)) return false;
      var prev = Scores.get(id);
      var better = prev === null || (game.score === "low" ? value < prev : value > prev);
      if (better) store.set(Scores.key(id), value);
      return better;
    },
    format: function (id, value) {
      if (value === null || value === undefined) return "—";
      var game = byId[id];
      if (game && game.score === "low") return formatTime(value);
      return value.toLocaleString();
    }
  };

  function formatTime(seconds) {
    var s = Math.max(0, seconds);
    var m = Math.floor(s / 60);
    var r = s - m * 60;
    return m + ":" + (r < 10 ? "0" : "") + r.toFixed(r % 1 ? 1 : 0).replace(/\.0$/, "");
  }

  /* ------------------------------------------------------------- toasts -- */
  var toastHost = null;

  function toast(message, iconName) {
    if (!toastHost) {
      toastHost = document.createElement("div");
      toastHost.className = "toasts";
      toastHost.setAttribute("role", "status");
      toastHost.setAttribute("aria-live", "polite");
      document.body.appendChild(toastHost);
    }
    var el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = (iconName ? icon(iconName) : "") + "<span>" + esc(message) + "</span>";
    toastHost.appendChild(el);
    setTimeout(function () {
      el.classList.add("out");
      setTimeout(function () {
        el.remove();
      }, 260);
    }, 2200);
  }

  /* --------------------------------------------------------- tab cloak -- */
  /* Favicons are inline SVG data URIs so nothing is fetched from a CDN. */
  function fav(bg, glyph, color) {
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
      '<rect width="64" height="64" rx="12" fill="' + bg + '"/>' +
      '<text x="32" y="45" font-family="Arial,Helvetica,sans-serif" font-size="38" ' +
      'font-weight="bold" text-anchor="middle" fill="' + color + '">' + glyph + "</text></svg>";
    return "data:image/svg+xml," + encodeURIComponent(svg);
  }

  var CLOAKS = [
    { id: "off", label: "Off (Portal Games)", title: null, icon: null },
    { id: "classroom", label: "Google Classroom", title: "Classes", icon: fav("#0f9d58", "▣", "#fff") },
    { id: "drive", label: "Google Drive", title: "My Drive - Google Drive", icon: fav("#ffffff", "▲", "#1a73e8") },
    { id: "docs", label: "Google Docs", title: "Untitled document - Google Docs", icon: fav("#1a73e8", "≡", "#fff") },
    { id: "gmail", label: "Gmail", title: "Inbox - Gmail", icon: fav("#ffffff", "M", "#ea4335") },
    { id: "canvas", label: "Canvas", title: "Dashboard", icon: fav("#e13223", "C", "#fff") },
    { id: "wikipedia", label: "Wikipedia", title: "Wikipedia, the free encyclopedia", icon: fav("#ffffff", "W", "#202122") },
    { id: "desmos", label: "Desmos", title: "Desmos | Graphing Calculator", icon: fav("#2d70b3", "f", "#fff") },
    { id: "khan", label: "Khan Academy", title: "Dashboard | Khan Academy", icon: fav("#14bf96", "K", "#fff") },
    { id: "schoology", label: "Schoology", title: "Home | Schoology", icon: fav("#0677ba", "S", "#fff") }
  ];

  var Cloak = {
    current: function () {
      return store.get("cloak", { id: "off" }) || { id: "off" };
    },
    /* The resolved title/icon are cached under their own keys so the tiny
       inline snippet in each page's <head> can apply them before first paint,
       without needing the preset table. */
    resolve: function (cfg) {
      var preset = null;
      for (var i = 0; i < CLOAKS.length; i++) if (CLOAKS[i].id === cfg.id) preset = CLOAKS[i];
      return {
        title: cfg.id === "custom" ? cfg.title || "" : (preset && preset.title) || "",
        icon: cfg.id === "custom" ? fav("#5f6368", "●", "#fff") : (preset && preset.icon) || ""
      };
    },
    apply: function () {
      var r = Cloak.resolve(Cloak.current());
      if (r.title) document.title = r.title;
      if (r.icon) setFavicon(r.icon);
    },
    set: function (cfg) {
      var r = Cloak.resolve(cfg);
      store.set("cloak", cfg);
      store.set("cloakTitle", r.title);
      store.set("cloakIcon", r.icon);
      location.reload();
    }
  };

  function setFavicon(href) {
    $$('link[rel~="icon"]').forEach(function (l) {
      l.remove();
    });
    var link = document.createElement("link");
    link.rel = "icon";
    link.href = href;
    document.head.appendChild(link);
  }

  function openCloakDialog() {
    var cur = Cloak.current();
    var dlg = document.createElement("dialog");
    dlg.className = "modal";
    dlg.innerHTML =
      '<form method="dialog" class="modal-head">' +
      "<h2>Tab cloak</h2>" +
      '<button class="btn btn-icon btn-ghost" value="cancel" aria-label="Close">' + icon("close") + "</button>" +
      "</form>" +
      '<div class="modal-body">' +
      "<p>Change the tab title and icon on every page of the site. Stored on this " +
      "device only — nothing is sent anywhere.</p>" +
      '<div class="cloak-grid">' +
      CLOAKS.map(function (c) {
        return (
          '<button class="cloak-opt" data-cloak="' + c.id + '" aria-pressed="' +
          (cur.id === c.id ? "true" : "false") + '">' +
          (c.icon ? '<img src="' + c.icon + '" alt="" width="20" height="20">' : icon("close")) +
          "<span>" + esc(c.label) + "</span></button>"
        );
      }).join("") +
      "</div>" +
      '<div class="field">' +
      '<label for="cloak-custom">Custom tab title</label>' +
      '<input id="cloak-custom" type="text" maxlength="80" placeholder="e.g. Unit 4 Review" value="' +
      esc(cur.id === "custom" ? cur.title || "" : "") + '">' +
      "</div>" +
      '<div class="field">' +
      '<label for="panic-url">Panic key — press <kbd>`</kbd> to jump to this URL</label>' +
      '<input id="panic-url" type="url" placeholder="https://classroom.google.com  (leave blank to disable)" value="' +
      esc(store.get("panic", "")) + '">' +
      "</div>" +
      "</div>" +
      '<div class="modal-foot">' +
      '<button class="btn" data-act="cancel">Cancel</button>' +
      '<button class="btn btn-primary" data-act="save">Save</button>' +
      "</div>";

    document.body.appendChild(dlg);
    dlg.showModal();

    var chosen = cur.id;
    dlg.addEventListener("click", function (e) {
      var opt = e.target.closest("[data-cloak]");
      if (opt) {
        chosen = opt.getAttribute("data-cloak");
        $$("[data-cloak]", dlg).forEach(function (b) {
          b.setAttribute("aria-pressed", b === opt ? "true" : "false");
        });
        $("#cloak-custom", dlg).value = "";
      }
      var act = e.target.closest("[data-act]");
      if (!act) return;
      if (act.dataset.act === "cancel") {
        dlg.close();
        return;
      }
      var custom = $("#cloak-custom", dlg).value.trim();
      var panic = $("#panic-url", dlg).value.trim();
      store.set("panic", panic);
      Cloak.set(custom ? { id: "custom", title: custom } : { id: chosen });
    });

    dlg.addEventListener("close", function () {
      dlg.remove();
    });
  }

  function openShortcutsDialog() {
    var rows = [
      ["/", "Focus search"],
      ["?", "Show this list"],
      ["Esc", "Close dialogs / leave fullscreen"],
      ["F", "Fullscreen (on a game page)"],
      ["R", "Restart (on a game page)"],
      ["M", "Mute or unmute (on a game page)"],
      ["P", "Pause (on a game page)"],
      ["`", "Panic key, if you set a URL in the cloak dialog"]
    ];
    var dlg = document.createElement("dialog");
    dlg.className = "modal";
    dlg.innerHTML =
      '<form method="dialog" class="modal-head"><h2>Keyboard shortcuts</h2>' +
      '<button class="btn btn-icon btn-ghost" value="cancel" aria-label="Close">' + icon("close") + "</button></form>" +
      '<div class="modal-body">' +
      rows
        .map(function (r) {
          return '<div class="shortcut-row"><kbd>' + esc(r[0]) + '</kbd><span class="d">' + esc(r[1]) + "</span></div>";
        })
        .join("") +
      "</div>";
    document.body.appendChild(dlg);
    dlg.showModal();
    dlg.addEventListener("close", function () {
      dlg.remove();
    });
  }

  /* -------------------------------------------------------- card markup -- */
  function cardHTML(game, opts) {
    opts = opts || {};
    var best = Scores.get(game.id);
    var cats = game.cats
      .map(function (c) {
        var found = DATA.CATEGORIES.filter(function (x) {
          return x.id === c;
        })[0];
        return found ? found.label : c;
      })
      .slice(0, 1)
      .join("");

    var badge = "";
    if (game.hot) badge = '<span class="badge hot">Popular</span>';
    else if (game.isNew) badge = '<span class="badge new">New</span>';

    return (
      '<article class="card' + (opts.feature ? " feature" : "") + '" data-game="' + game.id + '">' +
      '<div class="card-thumb">' +
      badge +
      '<img src="/assets/img/covers/' + game.id + '.svg" alt="" width="480" height="360" loading="' +
      (opts.eager ? "eager" : "lazy") + '" decoding="async">' +
      '<div class="card-play"><span>' + icon("play") + "Play</span></div>" +
      "</div>" +
      '<div class="card-body">' +
      '<div class="t">' +
      '<h3 class="card-title">' + esc(game.title) + "</h3>" +
      '<p class="card-meta"><span>' + esc(cats) + "</span>" +
      (best !== null
        ? '<span class="dot"></span><span class="best">' + esc(Scores.format(game.id, best)) + "</span>"
        : '<span class="dot"></span><span>' + esc(game.tagline) + "</span>") +
      "</p>" +
      "</div>" +
      '<button class="fav" data-fav="' + game.id + '" data-fav-title="' + esc(game.title) +
      '" aria-pressed="false" aria-label="Add to favourites">' + icon("star") + "</button>" +
      "</div>" +
      '<a class="card-link" href="/games/' + game.id + '.html" aria-label="Play ' + esc(game.title) + '"></a>' +
      "</article>"
    );
  }

  /* ------------------------------------------------------------- search -- */
  /* Small subsequence scorer: matches "snk" to "Neon Snake" but ranks exact
     prefix hits highest. Enough for a catalogue this size, and instant. */
  function score(game, q) {
    if (!q) return 1;
    var hay = (game.title + " " + game.tagline + " " + game.cats.join(" ")).toLowerCase();
    var title = game.title.toLowerCase();
    if (title === q) return 1000;
    if (title.indexOf(q) === 0) return 500;
    if (title.indexOf(q) !== -1) return 300;
    if (hay.indexOf(q) !== -1) return 150;
    var qi = 0;
    for (var i = 0; i < title.length && qi < q.length; i++) {
      if (title[i] === q[qi]) qi++;
    }
    return qi === q.length ? 60 : 0;
  }

  function wireSearch(input, onChange) {
    if (!input) return;
    var wrap = input.closest(".search");
    function update() {
      if (wrap) wrap.classList.toggle("has-value", input.value.length > 0);
      onChange(input.value.trim().toLowerCase());
    }
    input.addEventListener("input", update);
    var clear = wrap && $(".clear", wrap);
    if (clear) {
      clear.addEventListener("click", function () {
        input.value = "";
        update();
        input.focus();
      });
    }
    input.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        input.value = "";
        update();
        input.blur();
      }
    });
    update();
  }

  /* ---------------------------------------------------- page: home page -- */
  function initHome() {
    var recentHost = $("[data-recent]");
    if (recentHost) {
      var recents = Recents.all();
      if (recents.length) {
        recentHost.hidden = false;
        $("[data-recent-rail]").innerHTML = recents
          .slice(0, 8)
          .map(function (id) {
            return cardHTML(byId[id]);
          })
          .join("");
      }
    }

    var favHost = $("[data-favs]");
    if (favHost) {
      var favs = Favs.all().filter(function (id) {
        return byId[id];
      });
      if (favs.length) {
        favHost.hidden = false;
        $("[data-favs-grid]").innerHTML = favs
          .map(function (id) {
            return cardHTML(byId[id]);
          })
          .join("");
      }
    }

    // Header search on the home page jumps to the library.
    var input = $("[data-search]");
    if (input) {
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && input.value.trim()) {
          location.href = "/games/?q=" + encodeURIComponent(input.value.trim());
        }
      });
    }
  }

  /* ------------------------------------------------------ page: library -- */
  function initLibrary() {
    var gridEl = $("[data-library]");
    if (!gridEl) return;

    var params = new URLSearchParams(location.search);
    var state = {
      q: (params.get("q") || "").toLowerCase(),
      cat: params.get("cat") || "all",
      sort: store.get("sort", "featured")
    };

    var input = $("[data-search]");
    if (input && state.q) input.value = state.q;

    var sortSel = $("[data-sort]");
    if (sortSel) sortSel.value = state.sort;

    function render() {
      var favs = Favs.all();
      var list = GAMES.filter(function (g) {
        if (state.cat === "fav") return favs.indexOf(g.id) !== -1;
        if (state.cat !== "all" && g.cats.indexOf(state.cat) === -1) return false;
        return true;
      })
        .map(function (g) {
          return { g: g, s: score(g, state.q) };
        })
        .filter(function (r) {
          return r.s > 0;
        });

      if (state.q) {
        list.sort(function (a, b) {
          return b.s - a.s || a.g.title.localeCompare(b.g.title);
        });
      } else if (state.sort === "az") {
        list.sort(function (a, b) {
          return a.g.title.localeCompare(b.g.title);
        });
      } else if (state.sort === "played") {
        var rec = Recents.all();
        list.sort(function (a, b) {
          var ai = rec.indexOf(a.g.id),
            bi = rec.indexOf(b.g.id);
          return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
        });
      } else {
        list.sort(function (a, b) {
          return (b.g.featured ? 1 : 0) - (a.g.featured ? 1 : 0) || (b.g.hot ? 1 : 0) - (a.g.hot ? 1 : 0);
        });
      }

      gridEl.innerHTML = list.length
        ? list
            .map(function (r, i) {
              return cardHTML(r.g, { eager: i < 6 });
            })
            .join("")
        : "";

      var empty = $("[data-empty]");
      if (empty) {
        empty.hidden = list.length > 0;
        if (!list.length) {
          $("[data-empty-msg]").textContent = state.cat === "fav" && !state.q
            ? "Tap the star on any game to keep it here."
            : 'Nothing matched “' + state.q + "”.";
        }
      }

      var count = $("[data-count]");
      if (count) count.textContent = list.length + (list.length === 1 ? " game" : " games");

      syncFavButtons();

      // Keep the URL shareable without adding history entries per keystroke.
      var qs = new URLSearchParams();
      if (state.q) qs.set("q", state.q);
      if (state.cat !== "all") qs.set("cat", state.cat);
      var str = qs.toString();
      history.replaceState(null, "", str ? "?" + str : location.pathname);
    }

    wireSearch(input, function (q) {
      state.q = q;
      render();
    });

    $$("[data-filter]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.cat = btn.getAttribute("data-filter");
        $$("[data-filter]").forEach(function (b) {
          b.setAttribute("aria-pressed", b === btn ? "true" : "false");
        });
        render();
      });
      if (btn.getAttribute("data-filter") === state.cat) btn.setAttribute("aria-pressed", "true");
    });

    if (sortSel) {
      sortSel.addEventListener("change", function () {
        state.sort = sortSel.value;
        store.set("sort", state.sort);
        render();
      });
    }

    // Category counts
    $$("[data-filter]").forEach(function (btn) {
      var id = btn.getAttribute("data-filter");
      var c = $(".count", btn);
      if (!c) return;
      if (id === "all") c.textContent = GAMES.length;
      else if (id === "fav") c.textContent = Favs.all().length;
      else
        c.textContent = GAMES.filter(function (g) {
          return g.cats.indexOf(id) !== -1;
        }).length;
    });

    render();
  }

  /* ----------------------------------------------------- page: one game -- */
  function initGamePage() {
    var id = document.body.getAttribute("data-game-id");
    if (!id || !byId[id]) return;
    Recents.push(id);

    var best = Scores.get(id);
    var bestEl = $("[data-best]");
    if (bestEl) bestEl.textContent = Scores.format(id, best);

    var related = $("[data-related]");
    if (related) {
      var game = byId[id];
      var pool = GAMES.filter(function (g) {
        return g.id !== id;
      });
      pool.sort(function (a, b) {
        var sa = a.cats.filter(function (c) { return game.cats.indexOf(c) !== -1; }).length;
        var sb = b.cats.filter(function (c) { return game.cats.indexOf(c) !== -1; }).length;
        return sb - sa;
      });
      related.innerHTML = pool
        .slice(0, 4)
        .map(function (g) {
          return cardHTML(g);
        })
        .join("");
    }
  }

  /* ------------------------------------------------- global interaction -- */
  function initGlobal() {
    Theme.apply(Theme.get());
    Cloak.apply();

    document.documentElement.classList.remove("no-js");
    if (window.matchMedia("(hover: none) and (pointer: coarse)").matches) {
      document.body.classList.add("is-touch");
    }

    document.addEventListener("click", function (e) {
      var favBtn = e.target.closest("[data-fav]");
      if (favBtn) {
        e.preventDefault();
        e.stopPropagation();
        var gid = favBtn.getAttribute("data-fav");
        var added = Favs.toggle(gid);
        toast(byId[gid].title + (added ? " added to favourites" : " removed from favourites"), "star");
        return;
      }
      if (e.target.closest("[data-theme-toggle]")) Theme.toggle();

      // These triggers exist as both header buttons and footer links; the
      // links carry href="#" for keyboard access, so stop the hash jump.
      var cloakBtn = e.target.closest("[data-cloak-open]");
      if (cloakBtn) {
        e.preventDefault();
        openCloakDialog();
      }
      var shortcutBtn = e.target.closest("[data-shortcuts-open]");
      if (shortcutBtn) {
        e.preventDefault();
        openShortcutsDialog();
      }
      if (e.target.closest("[data-clear-recent]")) {
        Recents.clear();
        location.reload();
      }
    });

    document.addEventListener("keydown", function (e) {
      var t = e.target;
      var typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);

      // Panic key works even while typing — that's the whole point of it.
      if (e.key === "`" && !e.ctrlKey && !e.metaKey) {
        var url = store.get("panic", "");
        if (url) {
          location.replace(url);
          return;
        }
      }
      if (typing || e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === "/") {
        var s = $("[data-search]");
        if (s) {
          e.preventDefault();
          s.focus();
          s.select();
        }
      } else if (e.key === "?") {
        e.preventDefault();
        openShortcutsDialog();
      }
    });

    syncFavButtons();
  }

  /* --------------------------------------------------------------- boot -- */
  function boot() {
    initGlobal();
    initHome();
    initLibrary();
    initGamePage();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  /* Exposed for the game engine and per-game modules. */
  window.PG = window.PG || {};
  window.PG.store = store;
  window.PG.icon = icon;
  window.PG.toast = toast;
  window.PG.Scores = Scores;
  window.PG.formatTime = formatTime;
  window.PG.games = byId;
  window.PG.esc = esc;
})();
