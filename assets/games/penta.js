/* Penta — five letters, six guesses.
 * A daily word (same for everyone, derived from the date) plus unlimited
 * practice rounds. The answer list is embedded, so nothing is fetched.
 */
(function () {
  "use strict";

  var WORDS = (
    "about above abuse actor acute admit adopt adult after again agent agree ahead alarm album alert alike alive " +
    "allow alone along alter among anger angle angry ankle apart apple apply arena argue arise armor array arrow " +
    "aside asset audio audit avoid awake award aware badly baker bases basic basin batch beach beard beast began " +
    "begin begun being belly below bench berry birth black blade blame blank blast blaze bleak blend bless blind " +
    "block blood bloom blown blues blunt board boast bonus boost booth bound brain brake brand brass brave bread " +
    "break breed brick bride brief bring broad broke brook brown brush build built bunch burnt burst cabin cable " +
    "cache camel candy canal cargo carry carve catch cause cease chain chair chalk charm chart chase cheap check " +
    "cheek cheer chess chest chief child chill china choir chose civic civil claim clash class clean clear clerk " +
    "click cliff climb cling cloak clock close cloth cloud clown coach coast cocoa color comet comic coral corner " +
    "couch cough could count court cover crack craft crane crash crawl crazy cream creek crest cried crime crisp " +
    "cross crowd crown crude cruel crush crust curve cycle daily dairy dance dated dealt death debut decay decor " +
    "delay dense depth derby devil diary dirty ditch diver dizzy dodge doing donor doubt dough dozen draft drain " +
    "drama drank drawn dread dream dress dried drift drill drink drive drove drown dwell dying eager eagle early " +
    "earth eaten ebony edged eight elbow elder elect elite empty enemy enjoy enter entry equal error essay event " +
    "every exact exert exile exist extra fable faced faint fairy faith false fancy fatal fault favor feast fence " +
    "ferry fever fewer fiber field fiery fifth fifty fight final finch first flame flash fleet flesh flick fling " +
    "float flock flood floor flour fluid flush focal focus foggy force forge forth forty forum found frame fraud " +
    "fresh fried front frost frown fruit fully funny gauge ghost giant given giver glade gland glass gleam globe " +
    "gloom glory glove going grace grade grain grand grant grape graph grasp grass grave gravy graze great greed " +
    "green greet grief grill grind groan groom group grove growl grown guard guess guest guide guild guilt habit " +
    "hairy handy happy harsh haste hasty hatch haven havoc heard heart heavy hedge hefty hello hence herbs hilly " +
    "hinge hobby hoist holly honey honor horse hotel hound house hover human humid humor hurry ideal image imply " +
    "index inner input irony issue ivory jelly jewel joint jolly judge juice juicy jumbo knack knead kneel knife " +
    "knock known label labor laden lance large laser later laugh layer learn lease least leave ledge legal lemon " +
    "level lever light liked limit linen liner links lions liver lobby local lodge logic loose lorry loser lousy " +
    "lover lower loyal lucky lunar lunch lying magic major maker mango maple march marsh match maybe mayor meant " +
    "medal media medic melon mercy merge merit merry metal meter midst might miner minor minus mixed model moist " +
    "money month moral motor mount mourn mouse mouth movie muddy mummy music naked nasty naval needy nerve never " +
    "newly night noble noise north notch noted novel nurse nylon occur ocean offer often olive onion opera orbit " +
    "order organ other otter ought ounce outer owing owner oxide ozone paint panel panic paper parka party pasta " +
    "patch patio pause peace peach pearl pedal penny perch peril petal petty phase phone photo piano piece pilot " +
    "pinch pitch pivot pixel pizza place plaid plain plane plank plant plate plaza plead plumb plush poems point " +
    "polar porch pouch pound power press price pride prime print prior prize probe prone proof proud prove prune " +
    "pulse punch pupil puppy purse quart queen query quest queue quick quiet quilt quite quota quote radar radio " +
    "raise rally ranch range rapid ratio raven reach react ready realm rebel refer reign relax relay renew repay " +
    "reply rider ridge rifle right rigid rinse ripen risen risky rival river roast robin robot rocky rogue roman " +
    "rough round route royal rugby ruler rumor rural sadly saint salad salon salty sandy satin sauce scale scalp " +
    "scarf scene scent scoop scope score scout scrap screw scrub seize sense serve seven shade shady shaft shake " +
    "shall shame shape share shark sharp shave sheep sheer sheet shelf shell shift shine shiny shirt shock shoot " +
    "shore short shout shown shrub sight silly since siren sixth sixty skill skirt slate sleep sleet slice slide " +
    "slope small smart smash smell smile smoke snack snake sneak snowy sober solar solid solve sonic sorry sound " +
    "south space spare spark speak spear speed spell spend spent spice spike spill spine spiny spite split spoke " +
    "spoon sport spray spread spring squad squat stack staff stage stain stair stake stale stalk stall stamp stand " +
    "stare start state steam steel steep steer stern stick stiff still sting stock stole stone stood stool store " +
    "storm story stove strap straw strip stuck study stuff style sugar suite sunny super surge sweat sweep sweet " +
    "swift swing sword syrup table taken tally tango taste teach tempo tenth thank theft their theme there these " +
    "thick thief thigh thing think third thorn those three threw throw thumb tidal tiger tight timer tired title " +
    "toast today token tonic tooth topic torch total touch tough tower toxic trace track trade trail train trait " +
    "trash treat trend trial tribe trick tried tries troop trout truck truly trunk trust truth tulip tumor tutor " +
    "twice twist ultra uncle under union unite unity until upper upset urban usage usual vague valid value valve " +
    "vapor vault vegan venue verse video vigor villa vinyl viral virus visit vital vivid vocal voice voter wagon " +
    "waist waste watch water weary weave wedge weigh weird whale wheat wheel where which while white whole whose " +
    "widen wider widow width witch woman world worry worse worst worth would wound woven wrist write wrong wrote " +
    "yacht yeast yield young yours youth zebra"
  ).split(/\s+/);

  var ROWS = 6,
    LEN = 5;
  var KEYS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

  var style = document.createElement("style");
  style.textContent =
    ".pt{display:flex;flex-direction:column;align-items:center;gap:10px;padding:8px;height:100%;justify-content:center}" +
    ".pt-bar{display:flex;gap:6px}" +
    ".pt-opt{height:26px;padding:0 11px;border-radius:999px;border:1px solid var(--border);" +
    "background:var(--surface);color:var(--muted);font-size:12px;font-weight:650}" +
    ".pt-opt[aria-pressed=true]{background:var(--brand-grad);color:#fff;border-color:transparent}" +
    ".pt-grid{display:grid;gap:5px}" +
    ".pt-row{display:grid;grid-template-columns:repeat(5,var(--pt-cell));gap:5px}" +
    ".pt-t{display:grid;place-items:center;border:2px solid rgba(255,255,255,.14);border-radius:5px;" +
    "font-weight:800;text-transform:uppercase;color:#f0f8ff;transition:transform .1s}" +
    ".pt-t.filled{border-color:rgba(255,255,255,.38);animation:pt-pop .1s}" +
    ".pt-t.g{background:#22c55e;border-color:#22c55e}" +
    ".pt-t.y{background:#eab308;border-color:#eab308}" +
    ".pt-t.b{background:#3a4358;border-color:#3a4358}" +
    ".pt-row.bad{animation:pt-shake .4s}" +
    "@keyframes pt-pop{50%{transform:scale(1.1)}}" +
    "@keyframes pt-shake{25%{transform:translateX(-7px)}75%{transform:translateX(7px)}}" +
    ".pt-kb{display:grid;gap:5px;width:100%;max-width:460px}" +
    ".pt-kr{display:flex;gap:4px;justify-content:center}" +
    ".pt-k{flex:1;max-width:42px;height:44px;border-radius:6px;border:none;background:#5b6478;" +
    "color:#fff;font-weight:750;font-size:13px;text-transform:uppercase}" +
    ".pt-k.wide{max-width:64px;font-size:11px}" +
    ".pt-k.g{background:#22c55e}.pt-k.y{background:#eab308}.pt-k.b{background:#2c3345;color:#7b839a}" +
    "@media (prefers-reduced-motion:reduce){.pt-t,.pt-row.bad{animation:none}}";
  document.head.appendChild(style);

  PG.mount({
    id: "penta",
    mode: "dom",
    autoStart: true,
    pauseable: false,
    pauseOnBlur: false,
    rKeyRestarts: false,
    swipe: false,

    setup: function (g) {
      var wrap = document.createElement("div");
      wrap.className = "pt";
      wrap.innerHTML =
        '<div class="pt-bar">' +
        '<button class="pt-opt" data-mode="daily">Daily</button>' +
        '<button class="pt-opt" data-mode="practice">Practice</button>' +
        "</div>" +
        '<div class="pt-grid" data-grid></div>' +
        '<div class="pt-kb" data-kb></div>';
      g.root.appendChild(wrap);
      g.data.wrap = wrap;
      g.data.gridEl = wrap.querySelector("[data-grid]");
      g.data.kbEl = wrap.querySelector("[data-kb]");
      g.data.mode = PG.store.get("pt:mode", "daily");

      KEYS.forEach(function (row, i) {
        var r = document.createElement("div");
        r.className = "pt-kr";
        if (i === 2) r.appendChild(keyBtn("enter", "Enter", true));
        row.split("").forEach(function (c) {
          r.appendChild(keyBtn(c, c));
        });
        if (i === 2) r.appendChild(keyBtn("backspace", "Del", true));
        g.data.kbEl.appendChild(r);
      });

      wrap.addEventListener("click", function (e) {
        var m = e.target.closest("[data-mode]");
        if (m) {
          g.data.mode = m.getAttribute("data-mode");
          PG.store.set("pt:mode", g.data.mode);
          return g.start();
        }
        var k = e.target.closest("[data-k]");
        if (k) type(g, k.getAttribute("data-k"));
      });
    },

    start: function (g) {
      var d = g.data;
      d.answer = d.mode === "daily" ? dailyWord() : WORDS[(Math.random() * WORDS.length) | 0];
      d.guesses = [];
      d.current = "";
      d.finished = false;
      d.letterState = {};

      buildGrid(g);
      paintKeyboard(g);
      Array.prototype.forEach.call(d.wrap.querySelectorAll("[data-mode]"), function (b) {
        b.setAttribute("aria-pressed", b.getAttribute("data-mode") === d.mode ? "true" : "false");
      });

      // The daily puzzle resumes where you left off.
      if (d.mode === "daily") {
        var saved = PG.store.get("pt:daily", null);
        if (saved && saved.day === dayIndex() && Array.isArray(saved.guesses)) {
          saved.guesses.forEach(function (w) {
            d.guesses.push(w);
            scoreGuess(g, w);
          });
          paintGrid(g);
          paintKeyboard(g);
          if (d.guesses.indexOf(d.answer) !== -1) finish(g, true, true);
          else if (d.guesses.length >= ROWS) finish(g, false, true);
        }
      }
    },

    onKey: function (g, k) {
      if (k === "enter" || k === "backspace") return type(g, k);
      if (k.length === 1 && k >= "a" && k <= "z") type(g, k);
    },

    onResize: function (g) {
      if (g.data.gridEl) sizeGrid(g);
    }
  });

  function keyBtn(key, label, wide) {
    var b = document.createElement("button");
    b.className = "pt-k" + (wide ? " wide" : "");
    b.setAttribute("data-k", key);
    b.textContent = label;
    return b;
  }

  function dayIndex() {
    // Local midnight-to-midnight, so the puzzle turns over at the player's own
    // start of day rather than at some remote UTC hour.
    var now = new Date();
    var epoch = new Date(2024, 0, 1);
    return Math.floor((now - epoch) / 86400000);
  }

  function dailyWord() {
    var i = dayIndex();
    // Cheap deterministic scramble so consecutive days aren't adjacent words.
    var h = (i * 2654435761) % WORDS.length;
    return WORDS[((h % WORDS.length) + WORDS.length) % WORDS.length];
  }

  function buildGrid(g) {
    var el = g.data.gridEl;
    el.innerHTML = "";
    for (var r = 0; r < ROWS; r++) {
      var row = document.createElement("div");
      row.className = "pt-row";
      for (var c = 0; c < LEN; c++) {
        var t = document.createElement("div");
        t.className = "pt-t";
        row.appendChild(t);
      }
      el.appendChild(row);
    }
    sizeGrid(g);
  }

  function sizeGrid(g) {
    var host = g.root.getBoundingClientRect();
    var cell = Math.max(32, Math.min(62, Math.floor(Math.min((host.width - 40) / 5, (host.height - 290) / 6))));
    g.data.gridEl.style.setProperty("--pt-cell", cell + "px");
    Array.prototype.forEach.call(g.data.gridEl.querySelectorAll(".pt-t"), function (t) {
      t.style.width = cell + "px";
      t.style.height = cell + "px";
      t.style.fontSize = Math.round(cell * 0.5) + "px";
    });
  }

  function type(g, k) {
    var d = g.data;
    if (d.finished) return;
    if (k === "backspace") {
      d.current = d.current.slice(0, -1);
    } else if (k === "enter") {
      return submit(g);
    } else if (d.current.length < LEN) {
      d.current += k;
      g.sfx.tone(400, 0.02, "square", 0.03);
    }
    paintGrid(g);
  }

  function submit(g) {
    var d = g.data;
    if (d.current.length < LEN) {
      shake(g);
      PG.toast("Needs five letters");
      return;
    }
    var word = d.current;
    d.guesses.push(word);
    d.current = "";
    scoreGuess(g, word);
    paintGrid(g);
    paintKeyboard(g);

    if (d.mode === "daily") PG.store.set("pt:daily", { day: dayIndex(), guesses: d.guesses });

    if (word === d.answer) return finish(g, true);
    if (d.guesses.length >= ROWS) return finish(g, false);
    g.sfx.blip();
  }

  /* Two-pass marking so duplicate letters are counted correctly. */
  function mark(guess, answer) {
    var res = new Array(LEN).fill("b");
    var pool = {};
    for (var i = 0; i < LEN; i++) {
      if (guess[i] === answer[i]) res[i] = "g";
      else pool[answer[i]] = (pool[answer[i]] || 0) + 1;
    }
    for (var j = 0; j < LEN; j++) {
      if (res[j] === "g") continue;
      var c = guess[j];
      if (pool[c] > 0) {
        res[j] = "y";
        pool[c]--;
      }
    }
    return res;
  }

  var RANK = { b: 0, y: 1, g: 2 };

  function scoreGuess(g, word) {
    var d = g.data;
    var res = mark(word, d.answer);
    for (var i = 0; i < LEN; i++) {
      var c = word[i];
      if (!d.letterState[c] || RANK[res[i]] > RANK[d.letterState[c]]) d.letterState[c] = res[i];
    }
  }

  function paintGrid(g) {
    var d = g.data;
    var rows = d.gridEl.children;
    for (var r = 0; r < ROWS; r++) {
      var word = d.guesses[r];
      var res = word ? mark(word, d.answer) : null;
      var typing = r === d.guesses.length ? d.current : "";
      for (var c = 0; c < LEN; c++) {
        var t = rows[r].children[c];
        var ch = word ? word[c] : typing[c] || "";
        t.textContent = ch;
        t.className = "pt-t" + (res ? " " + res[c] : ch ? " filled" : "");
      }
    }
  }

  function paintKeyboard(g) {
    var d = g.data;
    Array.prototype.forEach.call(d.kbEl.querySelectorAll("[data-k]"), function (b) {
      var k = b.getAttribute("data-k");
      if (k.length !== 1) return;
      b.className = "pt-k" + (d.letterState[k] ? " " + d.letterState[k] : "");
    });
  }

  function shake(g) {
    var row = g.data.gridEl.children[g.data.guesses.length];
    if (!row) return;
    row.classList.remove("bad");
    void row.offsetWidth;
    row.classList.add("bad");
  }

  function finish(g, won, silent) {
    var d = g.data;
    d.finished = true;
    if (!silent) {
      if (won) g.sfx.win();
      else g.sfx.bad();
    }
    g.over({
      won: won,
      title: won ? "Got it" : "Out of guesses",
      text: won
        ? "“" + d.answer.toUpperCase() + "” in " + d.guesses.length + (d.guesses.length === 1 ? " guess." : " guesses.")
        : "The word was “" + d.answer.toUpperCase() + "”.",
      button: d.mode === "daily" ? "Play practice round" : "New word"
    });

    // "Play again" on the daily puzzle moves you to practice — replaying the
    // same daily word would be pointless.
    if (d.mode === "daily") {
      d.mode = "practice";
      PG.store.set("pt:mode", "practice");
    }
  }
})();
