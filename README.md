# Portal Games

Free browser games at **[portalgames.org](https://portalgames.org)**.

No ads, no trackers, no sign-ups, and **no requests to any other server** — no CDN
fonts, no analytics, no third-party embeds. Every game is built in-house and served
from this repo, so the site loads instantly and still works on networks that block
everything else.

## What's here

14 games, all original implementations:

| Game | Type | Notes |
| --- | --- | --- |
| Slope | Arcade | Endless pseudo-3D descent, procedurally generated |
| Stacks | Puzzle | 7-bag randomiser, SRS wall kicks, hold, ghost piece |
| 2048 | Puzzle | Animated tiles, undo, board persists between visits |
| Neon Snake | Arcade | Interpolated movement, queued turns, gold apples |
| Brickwave | Arcade | Power-ups, multi-ball, procedural level patterns |
| Flap | Arcade | One-button, parallax scenery, day/night drift |
| Minesweeper | Puzzle | Safe first click, chording, 3 difficulties |
| Four in a Row | Board | Minimax + alpha-beta engine, or local 2-player |
| Driftfield | Arcade | Asteroids with momentum, saucers, hyperspace |
| Sudoku | Puzzle | Generated and verified unique, pencil marks, hints |
| Paddle | Arcade | Pong, 3 CPU levels or local 2-player |
| Sky Hop | Arcade | Endless upward platformer, springs and breakables |
| Penta | Word | Daily word plus unlimited practice |
| Match | Puzzle | Memory pairs, 3 grid sizes |

Every game runs on desktop and touch, keeps a local high score, and supports
fullscreen, pause, and mute.

## Site features

- **Search and filters** — instant search (`/` to focus), category chips, sorting
- **Favourites and recently played**, stored on the device
- **Tab cloak** — change the tab title and favicon, with an optional panic key
- **Light and dark themes**
- **Full mobile support** — the old site redirected phones to a "not supported"
  page; every game now has touch controls

## How it's built

Plain HTML, CSS and JavaScript. No framework, no bundler, no dependencies at
runtime. Node is used only to generate the static pages.

```
assets/css/style.css     design system (all site styling)
assets/js/data.js        the game catalog — single source of truth
assets/js/app.js         shell: theme, favourites, search, cloak, toasts
assets/js/engine.js      shared game harness (loop, input, overlays, audio, scores)
assets/games/<id>.js     one file per game
assets/img/covers/       generated cover art
tools/build.js           generates every HTML page, sitemap, robots, manifest
tools/covers.js          generates the logo and cover art
games/<id>.html          generated — do not edit by hand
index.html, 404.html     generated — do not edit by hand
```

### Making changes

Edit `assets/js/data.js` (to add or change a game) or the templates in
`tools/build.js`, then regenerate:

```sh
node tools/covers.js   # only when adding a game or changing cover art
node tools/build.js
```

To add a game: add an entry to `GAMES` in `data.js`, add a motif to
`tools/covers.js`, write `assets/games/<id>.js` against the `PG.mount()` API in
`assets/js/engine.js`, then run both scripts.

Bump `BUILD` in `tools/build.js` when shipping CSS or JS changes — it is the
cache-busting query string on asset URLs.

### Local preview

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>. Paths are root-relative, so opening the files
directly with `file://` will not work.

## Notes on the rebuild

The previous version embedded four games from other sites in iframes. Two had
broken upstream — Slowroads now refuses to be framed (`X-Frame-Options:
SAMEORIGIN`) and the 1v1.lol gadget URL returns 404 — and none of them could be
kept ad-free, since their ads were served by the other site. They were replaced
with games built here. The old URLs (`/games/1v1.html`, `/games/driver.html`,
`/games/slowroads.html`, `/device-not-supported.html`) still resolve and redirect,
so existing links don't break.

There is deliberately no service worker. The site is small and fully static, so
offline caching would add a stale-content failure mode for very little gain.

`CNAME` must stay in the repo root — it is what points portalgames.org at GitHub
Pages.
