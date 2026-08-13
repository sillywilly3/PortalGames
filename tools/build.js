/* Portal Games — static site generator.
 *
 * Every HTML page on the site is written from here, so the header, footer and
 * per-game markup can never drift apart. Run after editing assets/js/data.js:
 *
 *   node tools/build.js
 */
"use strict";

var fs = require("fs");
var path = require("path");
var DATA = require("../assets/js/data.js");

var ROOT = path.join(__dirname, "..");
var SITE = DATA.SITE;
var GAMES = DATA.GAMES;
var CATS = DATA.CATEGORIES;
var BUILD = "8"; // bump to invalidate caches

function esc(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

function write(rel, body) {
  var file = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body);
}

/* ------------------------------------------------------------- fragments -- */

/* Applies the saved theme and tab cloak before first paint, so there is no
   flash of the wrong colours or of the real page title. */
var HEAD_SCRIPT =
  '<script>(function(){try{var d=document.documentElement,s=localStorage;' +
  "var t=s.getItem('pg:theme');d.setAttribute('data-theme',t?JSON.parse(t):'dark');" +
  "var c=s.getItem('pg:cloakTitle');if(c&&JSON.parse(c))document.title=JSON.parse(c);" +
  "var i=s.getItem('pg:cloakIcon');if(i&&JSON.parse(i)){var l=document.createElement('link');" +
  "l.rel='icon';l.href=JSON.parse(i);d.querySelector('head').appendChild(l);}}catch(e){}})();</script>";

function head(opts) {
  var title = opts.title;
  var desc = opts.description || SITE.description;
  var canonical = SITE.url + opts.path;
  return [
    "<!DOCTYPE html>",
    '<html lang="en" data-theme="dark">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
    "<title>" + esc(title) + "</title>",
    '<meta name="description" content="' + esc(desc) + '">',
    '<meta name="theme-color" content="#090e29">',
    '<meta name="color-scheme" content="dark light">',
    '<link rel="canonical" href="' + esc(canonical) + '">',
    '<link rel="icon" href="/assets/img/logo.svg" type="image/svg+xml">',
    '<link rel="manifest" href="/manifest.webmanifest">',
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="' + esc(SITE.name) + '">',
    '<meta property="og:title" content="' + esc(title) + '">',
    '<meta property="og:description" content="' + esc(desc) + '">',
    '<meta property="og:url" content="' + esc(canonical) + '">',
    '<meta property="og:image" content="' + SITE.url + (opts.image || "/assets/img/logo.svg") + '">',
    '<meta name="twitter:card" content="summary_large_image">',
    '<link rel="stylesheet" href="/assets/css/style.css?v=' + BUILD + '">',
    HEAD_SCRIPT,
    opts.extraHead || "",
    "</head>"
  ].join("\n");
}

function wordmark(cls) {
  return (
    '<span class="wordmark' + (cls ? " " + cls : "") + '">P' +
    '<img class="ring" src="/assets/img/logo.svg" alt="o" width="24" height="24">' +
    "rtal Games</span>"
  );
}

function header(active) {
  function link(href, label, id) {
    return '<a href="' + href + '"' + (active === id ? ' aria-current="page"' : "") + ">" + label + "</a>";
  }
  return [
    '<a class="skip-link" href="#main">Skip to content</a>',
    '<header class="site-header">',
    '<div class="container">',
    '<a class="brand" href="/" aria-label="' + esc(SITE.name) + ' home">' +
      wordmark() + '<span class="tm">&trade;</span></a>',
    '<nav class="nav" aria-label="Main">',
    link("/", "Home", "home"),
    link("/games/", "All games", "games"),
    link("/games/?cat=fav", "Favourites", "favs"),
    "</nav>",
    '<div class="header-spacer"></div>',
    '<div class="search" role="search">',
    '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></svg>',
    '<label class="sr-only" for="q">Search games</label>',
    '<input id="q" type="search" data-search placeholder="Search games" autocomplete="off" spellcheck="false">',
    "<kbd>/</kbd>",
    '<button class="clear" type="button" aria-label="Clear search"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg></button>',
    "</div>",
    '<div class="header-tools">',
    '<button class="btn btn-icon btn-ghost" data-cloak-open title="Tab cloak" aria-label="Tab cloak"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M3 8.5c3-1.5 6-1.5 9 0 3-1.5 6-1.5 9 0v3.2c0 3-2.4 5.3-5.2 5.3-1.9 0-3.1-1-3.8-2.4-.7 1.4-1.9 2.4-3.8 2.4C5.4 17 3 14.7 3 11.7z"/></svg></button>',
    '<button class="btn btn-icon btn-ghost" data-theme-toggle aria-label="Switch theme"></button>',
    "</div>",
    "</div>",
    "</header>"
  ].join("\n");
}

function tabbar(active) {
  var items = [
    ["/", "Home", "home", '<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>'],
    ["/games/", "Games", "games", '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>'],
    ["/games/?cat=fav", "Favourites", "favs", '<path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8L3.5 9.7l5.9-.9z"/>']
  ];
  return (
    '<nav class="tabbar" aria-label="Mobile">' +
    items
      .map(function (i) {
        return (
          '<a href="' + i[0] + '"' + (active === i[2] ? ' aria-current="page"' : "") + ">" +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round">' + i[3] + "</svg>" +
          "<span>" + i[1] + "</span></a>"
        );
      })
      .join("") +
    "</nav>"
  );
}

function footer() {
  var byCat = CATS.map(function (c) {
    return '<li><a href="/games/?cat=' + c.id + '">' + esc(c.label) + "</a></li>";
  }).join("");

  var popular = GAMES.slice(0, 6)
    .map(function (g) {
      return '<li><a href="/games/' + g.id + '.html">' + esc(g.title) + "</a></li>";
    })
    .join("");

  var extra = (SITE.links || [])
    .map(function (l) {
      return '<li><a href="' + esc(l.href) + '" rel="noopener">' + esc(l.label) + "</a></li>";
    })
    .join("");
  if (SITE.discord) {
    extra = '<li><a href="' + esc(SITE.discord) + '" rel="noopener">Discord</a></li>' + extra;
  }

  return [
    '<footer class="site-footer">',
    '<div class="container">',
    '<div class="footer-grid">',
    '<div class="footer-about">',
    '<a class="brand" href="/">' + wordmark() + '<span class="tm">&trade;</span></a>',
    "<p>" + esc(SITE.description) + "</p>",
    "</div>",
    "<div><h3>Browse</h3><ul>" + byCat + "</ul></div>",
    "<div><h3>Games</h3><ul>" + popular + "</ul></div>",
    "<div><h3>More</h3><ul>" +
      '<li><a href="/games/">All games</a></li>' +
      '<li><a href="#" data-shortcuts-open>Keyboard shortcuts</a></li>' +
      '<li><a href="#" data-cloak-open>Tab cloak</a></li>' +
      extra +
      "</ul></div>",
    "</div>",
    '<div class="footer-bottom">',
    "<span>&copy; " + new Date().getFullYear() + " " + esc(SITE.name) + "</span>",
    '<span class="spacer"></span>',
    "<span>No ads &middot; no trackers &middot; no third-party requests</span>",
    "</div>",
    "</div>",
    "</footer>"
  ].join("\n");
}

function scripts(extra) {
  return (
    '<script src="/assets/js/data.js?v=' + BUILD + '"></script>\n' +
    '<script src="/assets/js/app.js?v=' + BUILD + '"></script>\n' +
    (extra || "")
  );
}

function page(opts) {
  return [
    head(opts),
    '<body' + (opts.bodyAttrs || "") + ">",
    header(opts.active),
    '<main id="main">',
    opts.body,
    "</main>",
    footer(),
    tabbar(opts.active),
    scripts(opts.scripts),
    "</body>",
    "</html>",
    ""
  ].join("\n");
}

/* ------------------------------------------------------------- home page -- */
function cardPlaceholder(g, feature) {
  // Static markup so cards are present without JavaScript and paint instantly;
  // app.js only decorates them (favourite state, personal bests).
  var cat = CATS.filter(function (c) {
    return c.id === g.cats[0];
  })[0];
  var badge = g.hot ? '<span class="badge hot">Popular</span>' : "";
  return (
    '<article class="card' + (feature ? " feature" : "") + '" data-game="' + g.id + '">' +
    '<div class="card-thumb">' + badge +
    '<img src="/assets/img/covers/' + g.id + '.svg" alt="" width="480" height="360" loading="lazy" decoding="async">' +
    '<div class="card-play"><span><svg viewBox="0 0 24 24" width="17" height="17"><path d="M7 4.5v15l12-7.5z" fill="currentColor"/></svg>Play</span></div>' +
    "</div>" +
    '<div class="card-body"><div class="t">' +
    '<h3 class="card-title">' + esc(g.title) + "</h3>" +
    '<p class="card-meta"><span>' + esc(cat ? cat.label : "") + '</span><span class="dot"></span><span>' + esc(g.tagline) + "</span></p>" +
    "</div>" +
    '<button class="fav" data-fav="' + g.id + '" data-fav-title="' + esc(g.title) +
    '" aria-pressed="false" aria-label="Add to favourites"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8L3.5 9.7l5.9-.9z"/></svg></button>' +
    "</div>" +
    '<a class="card-link" href="/games/' + g.id + '.html" aria-label="Play ' + esc(g.title) + '"></a>' +
    "</article>"
  );
}

function buildHome() {
  var featured = GAMES.filter(function (g) {
    return g.featured;
  });
  var rest = GAMES.filter(function (g) {
    return !g.featured;
  });

  var body = [
    '<section class="hero">',
    '<div class="container">',
    '<p class="hero-badge"><b>New</b> ' + GAMES.length + " games, rebuilt from scratch</p>",
    "<h1>Free games that " + '<span class="grad-text">actually load</span>.</h1>',
    '<p class="lede">' + esc(SITE.description) + "</p>",
    '<div class="hero-actions">',
    '<a class="btn btn-primary btn-lg" href="/games/"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M7 4.5v15l12-7.5z" fill="currentColor"/></svg>Browse all games</a>',
    '<a class="btn btn-lg" href="/games/' + GAMES[0].id + '.html">Play ' + esc(GAMES[0].title) + "</a>",
    "</div>",
    '<dl class="hero-stats">',
    "<div><dt>" + GAMES.length + "</dt><dd>Games</dd></div>",
    "<div><dt>0</dt><dd>Ads</dd></div>",
    "<div><dt>0</dt><dd>Trackers</dd></div>",
    "<div><dt>0</dt><dd>Sign-ups</dd></div>",
    "</dl>",
    "</div>",
    "</section>",

    '<section class="section" data-recent hidden>',
    '<div class="container">',
    '<div class="section-head"><div><h2>Jump back in</h2><p>Picked up where you left off.</p></div>' +
      '<div class="spacer"></div><button class="btn btn-ghost" data-clear-recent>Clear</button></div>',
    '<div class="rail" data-recent-rail></div>',
    "</div></section>",

    '<section class="section" data-favs hidden>',
    '<div class="container">',
    '<div class="section-head"><div><h2>Your favourites</h2></div></div>',
    '<div class="grid" data-favs-grid></div>',
    "</div></section>",

    '<section class="section">',
    '<div class="container">',
    '<div class="section-head"><div><h2>Featured</h2><p>Start here.</p></div></div>',
    '<div class="grid">' + featured.map(function (g) { return cardPlaceholder(g, true); }).join("") + "</div>",
    "</div></section>",

    '<section class="section">',
    '<div class="container">',
    '<div class="section-head"><div><h2>Everything else</h2></div><div class="spacer"></div>' +
      '<a class="btn btn-ghost" href="/games/">All games &rarr;</a></div>',
    '<div class="grid">' + rest.map(function (g) { return cardPlaceholder(g); }).join("") + "</div>",
    "</div></section>"
  ].join("\n");

  write(
    "index.html",
    page({
      title: SITE.name + " — " + SITE.tagline,
      description: SITE.description,
      path: "/",
      active: "home",
      body: body
    })
  );
}

/* ---------------------------------------------------------- library page -- */
function buildLibrary() {
  var chips = [{ id: "all", label: "All" }]
    .concat(CATS)
    .concat([{ id: "fav", label: "Favourites" }])
    .map(function (c) {
      return (
        '<button class="chip" data-filter="' + c.id + '" aria-pressed="' + (c.id === "all" ? "true" : "false") + '">' +
        esc(c.label) + '<span class="count">0</span></button>'
      );
    })
    .join("");

  var body = [
    '<div class="library-bar">',
    '<div class="container">',
    '<div class="row"><div class="chips">' + chips + "</div></div>",
    '<div class="row">',
    '<span class="result-count" data-count>' + GAMES.length + " games</span>",
    '<div class="spacer" style="flex:1"></div>',
    '<label class="sr-only" for="sort">Sort games</label>',
    '<div class="select"><select id="sort" data-sort>' +
      '<option value="featured">Featured first</option>' +
      '<option value="az">A – Z</option>' +
      '<option value="played">Recently played</option>' +
      "</select></div>",
    "</div>",
    "</div>",
    "</div>",

    '<section class="section">',
    '<div class="container">',
    '<h1 class="sr-only">All games</h1>',
    '<div class="grid" data-library>' + GAMES.map(function (g) { return cardPlaceholder(g); }).join("") + "</div>",
    '<div class="empty" data-empty hidden>',
    "<h3>Nothing here</h3>",
    "<p data-empty-msg></p>",
    '<a class="btn" href="/games/">Show all games</a>',
    "</div>",
    "</div></section>"
  ].join("\n");

  write(
    "games/index.html",
    page({
      title: "All games — " + SITE.name,
      description: "Browse all " + GAMES.length + " games. Search, filter by category, and save favourites.",
      path: "/games/",
      active: "games",
      body: body
    })
  );
}

/* ------------------------------------------------------------- game page -- */
function aspectNumber(ratio) {
  var parts = String(ratio).split("/");
  return (Number(parts[0]) / Number(parts[1])).toFixed(4);
}

function buildGame(g) {
  var cats = g.cats
    .map(function (c) {
      var f = CATS.filter(function (x) { return x.id === c; })[0];
      return '<a class="tag" href="/games/?cat=' + c + '">' + esc(f ? f.label : c) + "</a>";
    })
    .join("");

  var controls = g.controls
    .map(function (row) {
      return (
        '<li><span class="keys">' +
        row[0].map(function (k) { return "<kbd>" + esc(k) + "</kbd>"; }).join("") +
        "</span><span>" + esc(row[1]) + "</span></li>"
      );
    })
    .join("");

  var readouts = "";
  if (g.score) {
    readouts =
      '<div class="readout"><span>' + esc(g.scoreLabel || "Score") + '</span><b data-score>0</b></div>' +
      '<div class="readout"><span>Best</span><b data-best>&mdash;</b></div>';
  }

  var body = [
    '<div class="container play">',
    '<nav class="crumbs" aria-label="Breadcrumb">',
    '<a href="/">Home</a>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m9 5 7 7-7 7"/></svg>',
    '<a href="/games/">Games</a>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m9 5 7 7-7 7"/></svg>',
    "<span>" + esc(g.title) + "</span>",
    "</nav>",

    '<div class="play-head">',
    "<h1>" + esc(g.title) + "</h1>",
    cats,
    '<div class="spacer"></div>',
    '<button class="fav btn btn-icon" data-fav="' + g.id + '" data-fav-title="' + esc(g.title) +
      '" aria-pressed="false" aria-label="Add to favourites"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8L3.5 9.7l5.9-.9z"/></svg></button>',
    "</div>",

    // --stage-ar is the ratio as a plain number, which CSS calc() needs in
    // order to turn the spare viewport height back into a width.
    '<div class="stage-shell" style="--stage-ar:' + aspectNumber(g.ratio) + '">',
    '<div class="stage" id="stage" style="--stage-ratio:' + g.ratio + ';--stage-ar:' + aspectNumber(g.ratio) + '"></div>',
    '<div class="stage-bar">',
    readouts,
    '<div class="spacer"></div>',
    '<button class="btn" data-act-pause hidden>Pause</button>',
    '<button class="btn" data-act-restart><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v4.5h-4.5"/></svg><span class="lbl">Restart</span></button>',
    '<button class="btn btn-icon" data-act-mute aria-label="Mute" aria-pressed="false"></button>',
    '<button class="btn btn-icon" data-act-fullscreen aria-label="Fullscreen"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M8 3.5H3.5V8M16 3.5h4.5V8M8 20.5H3.5V16M16 20.5h4.5V16"/></svg></button>',
    "</div>",
    "</div>",

    '<div class="play-grid">',
    '<section class="panel">',
    "<h2>How to play</h2>",
    "<p>" + esc(g.howto) + "</p>",
    "</section>",
    '<section class="panel">',
    "<h2>Controls</h2>",
    '<ul class="keylist">' + controls + "</ul>",
    "</section>",
    "</div>",

    '<section class="section">',
    '<div class="section-head"><div><h2>More like this</h2></div></div>',
    '<div class="grid" data-related></div>',
    "</section>",
    "</div>"
  ].join("\n");

  var jsonld = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: g.title,
    description: g.blurb,
    url: SITE.url + "/games/" + g.id + ".html",
    image: SITE.url + "/assets/img/covers/" + g.id + ".svg",
    genre: g.cats.map(function (c) {
      var f = CATS.filter(function (x) { return x.id === c; })[0];
      return f ? f.label : c;
    }),
    applicationCategory: "Game",
    operatingSystem: "Any (web browser)",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }
  };

  write(
    "games/" + g.id + ".html",
    page({
      title: g.title + " — play free on " + SITE.name,
      description: g.blurb,
      path: "/games/" + g.id + ".html",
      image: "/assets/img/covers/" + g.id + ".svg",
      active: "games",
      bodyAttrs: ' data-game-id="' + g.id + '"',
      extraHead: '<script type="application/ld+json">' + JSON.stringify(jsonld) + "</script>",
      body: body,
      scripts:
        '<script src="/assets/js/engine.js?v=' + BUILD + '"></script>\n' +
        '<script src="/assets/games/' + g.id + ".js?v=" + BUILD + '"></script>\n'
    })
  );
}

/* ------------------------------------------------------------ extra pages -- */
function build404() {
  var body = [
    '<section class="hero"><div class="container">',
    '<p class="hero-badge">404</p>',
    "<h1>That page went through a portal.</h1>",
    '<p class="lede">The link is broken or the page has moved. Everything worth playing is one click away.</p>',
    '<div class="hero-actions">',
    '<a class="btn btn-primary btn-lg" href="/games/">Browse all games</a>',
    '<a class="btn btn-lg" href="/">Back home</a>',
    "</div>",
    "</div></section>",
    '<section class="section"><div class="container">',
    '<div class="section-head"><div><h2>Popular right now</h2></div></div>',
    '<div class="grid">' + GAMES.slice(0, 4).map(function (g) { return cardPlaceholder(g); }).join("") + "</div>",
    "</div></section>"
  ].join("\n");

  write(
    "404.html",
    page({ title: "Page not found — " + SITE.name, path: "/404.html", active: "", body: body })
  );
}

/* The old site bounced every phone to this page. Mobile is supported now, so
   it only exists to catch stale bookmarks and send them home. */
function buildLegacyRedirect() {
  write(
    "device-not-supported.html",
    [
      "<!DOCTYPE html>",
      '<html lang="en"><head><meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
      '<title>Redirecting — ' + esc(SITE.name) + "</title>",
      '<link rel="canonical" href="' + SITE.url + '/">',
      '<meta http-equiv="refresh" content="0; url=/">',
      '<link rel="stylesheet" href="/assets/css/style.css?v=' + BUILD + '">',
      "</head><body>",
      '<section class="hero"><div class="container">',
      "<h1>Mobile works now</h1>",
      '<p class="lede">This page used to block phones. Every game on the site is playable on a touchscreen, so you are being sent to the homepage.</p>',
      '<div class="hero-actions"><a class="btn btn-primary btn-lg" href="/">Continue</a></div>',
      "</div></section>",
      "</body></html>",
      ""
    ].join("\n")
  );
}

/* The original site's game pages were third-party iframes. Two of them are
   dead upstream (Slowroads now refuses to be framed, and the 1v1 gadget URL
   404s), and none of them could be kept ad-free. The URLs still resolve so old
   links and bookmarks land somewhere useful instead of on a 404. */
var LEGACY = {
  "games/1v1.html": { to: "/games/", label: "the games library" },
  "games/driver.html": { to: "/games/slope.html", label: "Slope" },
  "games/slowroads.html": { to: "/games/slope.html", label: "Slope" }
};

function buildLegacyGameRedirects() {
  Object.keys(LEGACY).forEach(function (file) {
    var r = LEGACY[file];
    write(
      file,
      [
        "<!DOCTYPE html>",
        '<html lang="en"><head><meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
        "<title>Moved — " + esc(SITE.name) + "</title>",
        '<meta name="robots" content="noindex">',
        '<link rel="canonical" href="' + SITE.url + r.to + '">',
        '<meta http-equiv="refresh" content="0; url=' + r.to + '">',
        '<link rel="stylesheet" href="/assets/css/style.css?v=' + BUILD + '">',
        "</head><body>",
        '<section class="hero"><div class="container">',
        "<h1>This game has moved on</h1>",
        '<p class="lede">It was an embed from another site that no longer works here. ' +
          "Taking you to " + esc(r.label) + ".</p>",
        '<div class="hero-actions"><a class="btn btn-primary btn-lg" href="' + r.to + '">Continue</a></div>',
        "</div></section>",
        "</body></html>",
        ""
      ].join("\n")
    );
  });
}

function buildMeta() {
  var urls = ["/", "/games/"].concat(
    GAMES.map(function (g) {
      return "/games/" + g.id + ".html";
    })
  );

  write(
    "sitemap.xml",
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      urls
        .map(function (u) {
          return (
            "  <url><loc>" + SITE.url + u + "</loc><changefreq>weekly</changefreq>" +
            "<priority>" + (u === "/" ? "1.0" : u === "/games/" ? "0.9" : "0.8") + "</priority></url>"
          );
        })
        .join("\n") +
      "\n</urlset>\n"
  );

  write("robots.txt", "User-agent: *\nAllow: /\n\nSitemap: " + SITE.url + "/sitemap.xml\n");

  write(
    "manifest.webmanifest",
    JSON.stringify(
      {
        name: SITE.name,
        short_name: "Portal",
        description: SITE.description,
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "any",
        background_color: "#141d31",
        theme_color: "#090e29",
        icons: [
          { src: "/assets/img/logo.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }
        ],
        shortcuts: GAMES.slice(0, 4).map(function (g) {
          return { name: g.title, url: "/games/" + g.id + ".html" };
        })
      },
      null,
      2
    ) + "\n"
  );
}

/* ------------------------------------------------------------------- run -- */
buildHome();
buildLibrary();
GAMES.forEach(buildGame);
build404();
buildLegacyRedirect();
buildLegacyGameRedirects();
buildMeta();

console.log("built " + (GAMES.length + 5) + " pages + sitemap, robots, manifest");
