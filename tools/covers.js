/* Generates the site's artwork as SVG: the portal logo and one cover per game.
 * Keeping it generated means every cover shares the same lighting, grain and
 * framing, so the library grid reads as one set instead of scraped thumbnails.
 *
 *   node tools/covers.js
 */
"use strict";

var fs = require("fs");
var path = require("path");
var DATA = require("../assets/js/data.js");

var OUT = path.join(__dirname, "..", "assets", "img");
var COVERS = path.join(OUT, "covers");
var W = 480;
var H = 360;

var NAVY = "#0f1728";
var NAVY_2 = "#090e29";

function mkdir(d) {
  fs.mkdirSync(d, { recursive: true });
}

/* Shared frame: gradient wash in the game's accent colours over the site navy,
   a faint grid for texture, and a vignette. */
function frame(id, accent, motif) {
  var a = accent[0];
  var b = accent[1];
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + " " + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="">',
    "<defs>",
    '<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">',
    '<stop offset="0" stop-color="' + NAVY + '"/>',
    '<stop offset="1" stop-color="' + NAVY_2 + '"/>',
    "</linearGradient>",
    '<radialGradient id="g1" cx="0.22" cy="0.12" r="0.85">',
    '<stop offset="0" stop-color="' + a + '" stop-opacity="0.55"/>',
    '<stop offset="1" stop-color="' + a + '" stop-opacity="0"/>',
    "</radialGradient>",
    '<radialGradient id="g2" cx="0.85" cy="0.9" r="0.8">',
    '<stop offset="0" stop-color="' + b + '" stop-opacity="0.5"/>',
    '<stop offset="1" stop-color="' + b + '" stop-opacity="0"/>',
    "</radialGradient>",
    '<linearGradient id="acc" x1="0" y1="0" x2="1" y2="1">',
    '<stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/>',
    "</linearGradient>",
    '<radialGradient id="vig" cx="0.5" cy="0.45" r="0.75">',
    '<stop offset="0.55" stop-color="#000" stop-opacity="0"/>',
    '<stop offset="1" stop-color="#000" stop-opacity="0.45"/>',
    "</radialGradient>",
    '<pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">',
    '<path d="M24 0H0v24" fill="none" stroke="#ffffff" stroke-opacity="0.045" stroke-width="1"/>',
    "</pattern>",
    "</defs>",
    '<rect width="' + W + '" height="' + H + '" fill="url(#bg)"/>',
    '<rect width="' + W + '" height="' + H + '" fill="url(#grid)"/>',
    '<rect width="' + W + '" height="' + H + '" fill="url(#g1)"/>',
    '<rect width="' + W + '" height="' + H + '" fill="url(#g2)"/>',
    motif,
    '<rect width="' + W + '" height="' + H + '" fill="url(#vig)"/>',
    "</svg>"
  ].join("");
}

/* ------------------------------------------------------------- motifs -- */
function rect(x, y, w, h, fill, r, op) {
  return (
    '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h +
    '" rx="' + (r || 0) + '" fill="' + fill + '"' + (op != null ? ' fill-opacity="' + op + '"' : "") + "/>"
  );
}

function circle(cx, cy, r, fill, op) {
  return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + fill + '"' + (op != null ? ' fill-opacity="' + op + '"' : "") + "/>";
}

function line(x1, y1, x2, y2, stroke, w, op) {
  return (
    '<path d="M' + x1 + " " + y1 + "L" + x2 + " " + y2 + '" stroke="' + stroke +
    '" stroke-width="' + w + '" stroke-linecap="round"' + (op != null ? ' stroke-opacity="' + op + '"' : "") + "/>"
  );
}

function text(x, y, s, size, fill, weight, anchor) {
  return (
    '<text x="' + x + '" y="' + y + '" font-family="Arial,Helvetica,sans-serif" font-size="' + size +
    '" font-weight="' + (weight || 700) + '" fill="' + fill + '" text-anchor="' + (anchor || "middle") + '">' + s + "</text>"
  );
}

var MOTIFS = {
  /* Perspective tunnel converging on a vanishing point, with the ball. */
  slope: function () {
    var s = "";
    var vx = 240,
      vy = 128;
    for (var i = -6; i <= 6; i++) {
      s += line(vx, vy, vx + i * 78, H + 20, "#ffffff", 2, 0.16);
    }
    for (var j = 1; j <= 7; j++) {
      var t = j / 7;
      var y = vy + Math.pow(t, 2.1) * (H - vy + 30);
      var halfw = Math.pow(t, 2.1) * 330;
      s += line(vx - halfw, y, vx + halfw, y, "#ffffff", 2, 0.13 + t * 0.16);
    }
    s += circle(240, 262, 30, "url(#acc)");
    s += circle(231, 252, 10, "#ffffff", 0.65);
    s += '<ellipse cx="240" cy="300" rx="34" ry="7" fill="#000" fill-opacity="0.35"/>';
    return s;
  },

  stacks: function () {
    var s = "";
    var c = 34,
      ox = 156,
      oy = 82;
    var cells = [
      [1, 0, "#7aa7ff"], [2, 0, "#7aa7ff"], [1, 1, "#7aa7ff"], [2, 1, "#7aa7ff"],
      [0, 2, "#f472b6"], [1, 2, "#f472b6"], [2, 2, "#f472b6"], [3, 2, "#f472b6"],
      [0, 3, "#facc15"], [1, 3, "#facc15"], [2, 3, "#a855f7"], [3, 3, "#a855f7"],
      [0, 4, "#34d399"], [1, 4, "#34d399"], [2, 4, "#34d399"], [3, 4, "#facc15"]
    ];
    cells.forEach(function (p) {
      s += rect(ox + p[0] * c, oy + p[1] * c, c - 4, c - 4, p[2], 5, 0.92);
      s += rect(ox + p[0] * c + 4, oy + p[1] * c + 4, c - 12, c - 12, "#ffffff", 3, 0.18);
    });
    return s;
  },

  "2048": function () {
    var s = "";
    var vals = [["2", "#eee4da", "#776e65"], ["4", "#ede0c8", "#776e65"], ["8", "#f2b179", "#fff"], ["16", "#f59563", "#fff"]];
    var size = 74,
      gap = 12;
    var totalW = vals.length * size + (vals.length - 1) * gap;
    var x0 = (W - totalW) / 2;
    vals.forEach(function (v, i) {
      var x = x0 + i * (size + gap);
      var y = 143 + (i % 2 === 0 ? -8 : 8);
      s += rect(x, y, size, size, v[1], 10);
      s += text(x + size / 2, y + size / 2 + 12, v[0], 34, v[2], 800);
    });
    return s;
  },

  snake: function () {
    var s = "";
    var pts = [[110, 250], [110, 190], [170, 190], [170, 130], [250, 130], [250, 200], [320, 200]];
    var d = pts
      .map(function (p, i) {
        return (i ? "L" : "M") + p[0] + " " + p[1];
      })
      .join("");
    s += '<path d="' + d + '" fill="none" stroke="url(#acc)" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>';
    s += '<path d="' + d + '" fill="none" stroke="#ffffff" stroke-opacity="0.22" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>';
    s += circle(320, 200, 16, "#22c55e");
    s += circle(326, 195, 3.4, "#06110a");
    s += circle(370, 258, 14, "#ef4444");
    s += line(370, 244, 374, 234, "#22c55e", 4);
    return s;
  },

  brickwave: function () {
    var s = "";
    var colors = ["#f472b6", "#c084fc", "#8b5cf6", "#6366f1"];
    for (var r = 0; r < 4; r++) {
      for (var c = 0; c < 7; c++) {
        s += rect(66 + c * 51, 66 + r * 25, 45, 19, colors[r], 4, 0.9);
      }
    }
    s += circle(210, 232, 10, "#ffffff");
    s += rect(180, 288, 96, 13, "url(#acc)", 7);
    s += line(210, 222, 236, 190, "#ffffff", 2, 0.35);
    return s;
  },

  flap: function () {
    var s = "";
    s += rect(96, 0, 62, 118, "#3f9d3f", 8, 0.95);
    s += rect(88, 100, 78, 26, "#357f35", 6);
    s += rect(96, 246, 62, 114, "#3f9d3f", 8, 0.95);
    s += rect(88, 236, 78, 26, "#357f35", 6);
    s += rect(330, 0, 62, 62, "#3f9d3f", 8, 0.95);
    s += rect(322, 46, 78, 26, "#357f35", 6);
    s += rect(330, 192, 62, 168, "#3f9d3f", 8, 0.95);
    s += rect(322, 182, 78, 26, "#357f35", 6);
    s += circle(240, 176, 26, "#facc15");
    s += '<path d="M222 176q-16-14-26 2 14 14 26 6z" fill="#f59e0b"/>';
    s += circle(250, 168, 6, "#ffffff");
    s += circle(252, 168, 3, "#101828");
    s += '<path d="M264 178l20 6-20 6z" fill="#f97316"/>';
    return s;
  },

  minesweeper: function () {
    var s = "";
    var c = 46,
      ox = 125,
      oy = 65;
    var faces = [
      ["1", "#3b82f6"], ["2", "#22c55e"], ["", ""], ["3", "#ef4444"],
      ["", ""], ["mine", ""], ["2", "#22c55e"], ["1", "#3b82f6"],
      ["flag", ""], ["1", "#3b82f6"], ["", ""], ["1", "#3b82f6"],
      ["", ""], ["1", "#3b82f6"], ["1", "#3b82f6"], ["", ""]
    ];
    for (var i = 0; i < 16; i++) {
      var x = ox + (i % 4) * c;
      var y = oy + Math.floor(i / 4) * c;
      var f = faces[i];
      var open = f[0] !== "";
      s += rect(x, y, c - 5, c - 5, open ? "#ffffff" : "#7aa7ff", 5, open ? 0.1 : 0.28);
      if (f[0] === "mine") {
        s += circle(x + 20, y + 20, 11, "#0f1728");
        s += line(x + 20, y + 6, x + 20, y + 34, "#0f1728", 3.5);
        s += line(x + 6, y + 20, x + 34, y + 20, "#0f1728", 3.5);
      } else if (f[0] === "flag") {
        s += '<path d="M' + (x + 14) + " " + (y + 9) + "l16 7-16 7z" + '" fill="#ef4444"/>';
        s += line(x + 14, y + 9, x + 14, y + 33, "#e2e8f0", 3);
      } else if (open) {
        s += text(x + 20, y + 28, f[0], 22, f[1], 800);
      }
    }
    return s;
  },

  fourinarow: function () {
    var s = "";
    var c = 44,
      ox = 130,
      oy = 62;
    s += rect(ox - 12, oy - 12, 4 * c + 24, 5 * c + 24, "#1e3a8a", 14, 0.85);
    var discs = {
      "3,0": "#ef4444", "2,1": "#facc15", "3,1": "#facc15",
      "1,2": "#ef4444", "2,2": "#ef4444", "3,2": "#ef4444",
      "0,3": "#facc15", "1,3": "#facc15", "2,3": "#ef4444", "3,3": "#facc15",
      "0,4": "#ef4444", "1,4": "#ef4444", "2,4": "#facc15", "3,4": "#ef4444"
    };
    for (var r = 0; r < 5; r++) {
      for (var col = 0; col < 4; col++) {
        var fill = discs[col + "," + r];
        s += circle(ox + col * c + c / 2 - 2, oy + r * c + c / 2 - 2, 17, fill || "#0f1728", fill ? 1 : 0.92);
        if (fill) s += circle(ox + col * c + c / 2 - 7, oy + r * c + c / 2 - 8, 5, "#ffffff", 0.3);
      }
    }
    return s;
  },

  driftfield: function () {
    var s = "";
    for (var i = 0; i < 26; i++) {
      var x = (i * 97) % W;
      var y = (i * 173) % H;
      s += circle(x, y, i % 5 === 0 ? 1.8 : 1, "#ffffff", 0.5);
    }
    s += '<path d="M300 92l44 26-44 24 8-26z" fill="none" stroke="#94a3b8" stroke-width="3" stroke-linejoin="round" transform="rotate(-14 322 118)"/>';
    s += '<path d="M120 214l30-24 34 12 12 34-26 28-36-6-18-28z" fill="none" stroke="#cbd5e1" stroke-width="3" stroke-linejoin="round"/>';
    s += '<path d="M330 236l18-14 22 8 6 22-18 18-22-6z" fill="none" stroke="#94a3b8" stroke-width="2.6" stroke-linejoin="round"/>';
    s += '<path d="M240 60l12-9 14 5 3 14-11 11-14-4z" fill="none" stroke="#94a3b8" stroke-width="2.2" stroke-linejoin="round"/>';
    s += '<path d="M240 130l58 30" stroke="url(#acc)" stroke-width="3" stroke-linecap="round" stroke-opacity="0.9"/>';
    return s;
  },

  sudoku: function () {
    var s = "";
    var c = 62,
      ox = 147,
      oy = 87;
    s += rect(ox - 6, oy - 6, 3 * c + 12, 3 * c + 12, "#ffffff", 10, 0.07);
    var nums = ["5", "", "8", "", "3", "", "7", "", "1"];
    for (var i = 0; i < 9; i++) {
      var x = ox + (i % 3) * c;
      var y = oy + Math.floor(i / 3) * c;
      s += rect(x + 2, y + 2, c - 4, c - 4, "#ffffff", 4, 0.05);
      if (nums[i]) s += text(x + c / 2, y + c / 2 + 13, nums[i], 34, i % 4 === 0 ? "#2dd4bf" : "#e2e8f0", 700);
    }
    for (var k = 0; k <= 3; k++) {
      s += line(ox + k * c, oy - 6, ox + k * c, oy + 3 * c + 6, "#2dd4bf", 2.5, 0.55);
      s += line(ox - 6, oy + k * c, ox + 3 * c + 6, oy + k * c, "#2dd4bf", 2.5, 0.55);
    }
    return s;
  },

  paddle: function () {
    var s = "";
    for (var y = 24; y < H - 12; y += 34) s += rect(237, y, 6, 18, "#ffffff", 3, 0.22);
    s += rect(58, 118, 14, 96, "#ffffff", 7);
    s += rect(408, 158, 14, 96, "#ffffff", 7);
    s += circle(210, 168, 12, "url(#acc)");
    s += line(224, 176, 300, 214, "#ffffff", 2, 0.28);
    s += text(160, 74, "07", 44, "#ffffff", 800);
    s += text(322, 74, "05", 44, "#ffffff", 800);
    return s;
  },

  skyhop: function () {
    var s = "";
    var plats = [[70, 300, "#34d399"], [220, 262, "#34d399"], [130, 214, "#a16207"], [300, 178, "#34d399"], [180, 132, "#38bdf8"], [70, 92, "#34d399"], [310, 62, "#34d399"]];
    plats.forEach(function (p) {
      s += rect(p[0], p[1], 84, 15, p[2], 7, 0.95);
      s += rect(p[0] + 6, p[1] + 3, 72, 4, "#ffffff", 2, 0.3);
    });
    s += circle(222, 232, 20, "url(#acc)");
    s += circle(216, 226, 6, "#ffffff", 0.75);
    s += line(222, 254, 222, 268, "#ffffff", 3, 0.3);
    return s;
  },

  penta: function () {
    var s = "";
    var row = [["P", "#22c55e"], ["E", "#3a4358"], ["N", "#eab308"], ["T", "#3a4358"], ["A", "#22c55e"]];
    var size = 66,
      gap = 9;
    var x0 = (W - (row.length * size + (row.length - 1) * gap)) / 2;
    row.forEach(function (t, i) {
      var x = x0 + i * (size + gap);
      s += rect(x, 116, size, size, t[1], 8);
      s += text(x + size / 2, 116 + size / 2 + 14, t[0], 38, "#ffffff", 800);
    });
    for (var i = 0; i < 5; i++) {
      s += rect(x0 + i * (size + gap), 200, size, size, "#ffffff", 8, 0.07);
    }
    return s;
  },

  match: function () {
    var s = "";
    var c = 84,
      ox = 96,
      oy = 74;
    var faces = ["★", "", "", "★", "", "◆", "●", ""];
    for (var i = 0; i < 8; i++) {
      var x = ox + (i % 4) * c;
      var y = oy + Math.floor(i / 4) * (c + 24);
      var up = faces[i] !== "";
      s += rect(x, y, c - 12, c + 8, up ? "#ffffff" : "url(#acc)", 10, up ? 0.94 : 1);
      if (up) s += text(x + (c - 12) / 2, y + (c + 8) / 2 + 14, faces[i], 38, "#6366f1", 700);
      else s += circle(x + (c - 12) / 2, y + (c + 8) / 2, 15, "#ffffff", 0.28);
    }
    return s;
  }
};

/* ---------------------------------------------------------- the logo -- */
function logo() {
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">',
    "<defs>",
    '<radialGradient id="core" cx="0.5" cy="0.5" r="0.5">',
    '<stop offset="0" stop-color="#dbeafe" stop-opacity="0.95"/>',
    '<stop offset="0.45" stop-color="#7aa7ff" stop-opacity="0.55"/>',
    '<stop offset="1" stop-color="#6d4bd8" stop-opacity="0.05"/>',
    "</radialGradient>",
    '<linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">',
    '<stop offset="0" stop-color="#a5c8ff"/>',
    '<stop offset="0.5" stop-color="#7aa7ff"/>',
    '<stop offset="1" stop-color="#8b2fd6"/>',
    "</linearGradient>",
    "</defs>",
    '<ellipse cx="32" cy="32" rx="21" ry="27" fill="url(#core)"/>',
    '<ellipse cx="32" cy="32" rx="21" ry="27" fill="none" stroke="url(#ring)" stroke-width="6"/>',
    '<ellipse cx="32" cy="32" rx="21" ry="27" fill="none" stroke="#e0efff" stroke-width="1.6" stroke-opacity="0.9"/>',
    "</svg>"
  ].join("");
}

/* ------------------------------------------------------------- write -- */
mkdir(COVERS);
mkdir(OUT);

fs.writeFileSync(path.join(OUT, "logo.svg"), logo());

var made = 0;
DATA.GAMES.forEach(function (g) {
  var motif = MOTIFS[g.id];
  if (!motif) {
    console.warn("! no motif for " + g.id);
    return;
  }
  fs.writeFileSync(path.join(COVERS, g.id + ".svg"), frame(g.id, g.accent, motif()));
  made++;
});

console.log("artwork: logo.svg + " + made + " covers");
