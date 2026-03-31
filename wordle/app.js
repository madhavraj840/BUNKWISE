'use strict';

/* ═══════════════════════════════════════════════════════════════════
  WORD DATABASE — core curated list + optional extra common words file
   No external API needed. Self-contained for Poki compliance.
   ANSWERS  = pool of possible target words
   ALLOWED  = extra valid guesses (not used as targets)
═══════════════════════════════════════════════════════════════════ */
const ANSWERS = [
  "ABBEY","ABOUT","ABOVE","ABUSE","ACTOR","ACUTE","ADMIT","ADOPT","ADULT","AFTER",
  "AGAIN","AGENT","AGREE","AHEAD","ALARM","ALBUM","ALERT","ALIEN","ALIGN","ALIKE",
  "ALIVE","ALLEY","ALLOW","ALONE","ALONG","ALTER","AMBER","ANGEL","ANGER","ANGLE",
  "ANGRY","ANKLE","APART","APPLE","APPLY","ARENA","ARGUE","ARISE","ARMED","ARROW",
  "ATLAS","ATTIC","AUDIO","AVOID","AWAKE","AWFUL","BAKER","BASIC","BASIN","BATCH",
  "BEACH","BEARD","BEAST","BEGAN","BEGIN","BENCH","BIRTH","BLACK","BLADE","BLAME",
  "BLANK","BLAST","BLAZE","BLEED","BLESS","BLIND","BLOCK","BLOOD","BLOOM","BLOWN",
  "BOARD","BONUS","BOOST","BOUND","BRAIN","BRAKE","BRAND","BRAVE","BREAK","BREED",
  "BRICK","BRIEF","BRING","BROKE","BROOK","BROWN","BRUSH","BUILD","BUILT","BURST",
  "BUYER","CABLE","CABIN","CANDY","CARRY","CARVE","CAUSE","CHAIN","CHAIR","CHAOS",
  "CHARM","CHEAP","CHECK","CHEEK","CHESS","CHEST","CHIEF","CHILD","CHILL","CLAIM",
  "CLASH","CLASS","CLEAN","CLEAR","CLICK","CLIFF","CLIMB","CLING","CLOCK","CLOSE",
  "CLOUD","CLOWN","COAST","COLOR","COMIC","CORAL","COUNT","COURT","COVER","CRACK",
  "CRAFT","CRANE","CRASH","CRAZY","CREAM","CREEK","CRIME","CRISP","CROSS","CROWD",
  "CROWN","CRUEL","CRUSH","CURVE","DAILY","DANCE","DEALT","DECAY","DELTA","DENSE",
  "DEPTH","DEVIL","DIRTY","DISCO","DODGE","DOUBT","DRAFT","DRAIN","DRAMA","DRAWN",
  "DREAM","DRESS","DRIFT","DRILL","DRIVE","DROVE","DRYER","DWARF","DYING","EAGER",
  "EAGLE","EARLY","EARTH","EIGHT","ELITE","EMPTY","ENEMY","ENJOY","ENTER","ENTRY",
  "EQUAL","ERROR","ESSAY","EVENT","EVERY","EXACT","EXERT","EXILE","EXTRA","FAINT",
  "FAITH","FALSE","FANCY","FATAL","FAULT","FEAST","FENCE","FEVER","FIELD","FIFTH",
  "FIFTY","FIGHT","FINAL","FIRST","FIXED","FLAME","FLARE","FLASK","FLICK","FLOOD",
  "FLOOR","FLOUR","FOCUS","FORCE","FORGE","FORTH","FOUND","FRAME","FRANK","FRAUD",
  "FRONT","FROST","FRUIT","FULLY","FUNNY","GHOST","GIANT","GIVEN","GLASS","GLIDE",
  "GLOOM","GLORY","GLOVE","GRACE","GRADE","GRAIN","GRAND","GRANT","GRASP","GRASS",
  "GRAVE","GREAT","GREED","GREEN","GREET","GRIEF","GRILL","GRIND","GROWN","GUARD",
  "GUESS","GUEST","GUIDE","GUILD","GUILT","HABIT","HARSH","HEART","HEAVY","HEIST",
  "HERBS","HINGE","HOLLY","HONEY","HONOR","HORSE","HOTEL","HOUSE","HUMAN","HUMOR",
  "HURRY","IDEAL","IMAGE","INDEX","INNER","INPUT","INTRO","IRONY","ISSUE","IVORY",
  "JEWEL","JOINT","JUDGE","KARMA","KNIFE","KNOCK","KNOWN","LABEL","LASER","LATER",
  "LAUGH","LAYER","LEARN","LEASE","LEAST","LEAVE","LEGAL","LEMON","LEVEL","LIGHT",
  "LIMIT","LOCAL","LODGE","LOGIC","LOYAL","LUCKY","LYRIC","MAGIC","MAJOR","MANOR",
  "MAPLE","MARCH","MARSH","MATCH","MAYOR","MEDIA","MERIT","METAL","MIGHT","MINOR",
  "MINUS","MIXED","MONEY","MONTH","MOOSE","MORAL","MOTOR","MOUNT","MOUSE","MOVIE",
  "MUSIC","NAIVE","NASTY","NERVE","NEVER","NIGHT","NOBLE","NOISE","NORTH","NOTED",
  "NOVEL","NURSE","OFFER","ORBIT","ORDER","OTHER","OUTER","OZONE","PAINT","PAPER",
  "PARTY","PEACE","PEARL","PENNY","PILOT","PIZZA","PLACE","PLAIN","PLANE","PLANT",
  "PLATE","PLAZA","POINT","POLAR","POWER","PRESS","PRICE","PRIDE","PRIME","PRINT",
  "PRIOR","PRIZE","PROBE","PROOF","PROUD","PROVE","PULSE","PUNCH","PUPIL","PURSE",
  "QUERY","QUICK","QUIET","QUOTA","QUOTE","RADAR","RADIO","RALLY","RANCH","RANGE",
  "RAPID","RATIO","REACH","READY","REALM","REBEL","REFER","REIGN","RELAX","RELAY",
  "REMIX","RESET","RIDER","RIDGE","RIFLE","RIGHT","RISKY","RIVAL","RIVER","ROBOT",
  "ROCKY","ROUND","ROUTE","ROYAL","RULER","RURAL","SADLY","SAINT","SALAD","SANDY",
  "SAUCE","SCALE","SCARY","SCENE","SCOPE","SCORE","SCOUT","SCREW","SENSE","SERVE",
  "SEVEN","SHADE","SHAKE","SHALL","SHAME","SHAPE","SHARE","SHARP","SHEEP","SHEET",
  "SHELF","SHELL","SHIFT","SHINE","SHIRT","SHORT","SHOUT","SIGHT","SINCE","SIXTH",
  "SIXTY","SKILL","SKULL","SLASH","SLEEP","SLIDE","SLOPE","SMART","SMILE","SMOKE",
  "SNAKE","SOLAR","SOLID","SOLVE","SORRY","SOUTH","SPACE","SPARE","SPARK","SPEAK",
  "SPEED","SPELL","SPEND","SPILL","SPINE","SPLIT","SPOON","SPORT","SQUAD","STACK",
  "STAFF","STAGE","STAIN","STAIR","STAMP","STAND","STARK","START","STATE","STEAL",
  "STEAM","STEEL","STEEP","STICK","STIFF","STILL","STING","STOCK","STONE","STORM",
  "STORY","STRAW","STRIP","STUDY","STYLE","SUGAR","SUPER","SURGE","SWAMP","SWEAR",
  "SWEEP","SWEET","SWIFT","SWING","SWORD","TAKEN","TASTE","TEACH","TEETH","THEFT",
  "THEIR","THEME","THERE","THING","THINK","THIRD","THOSE","THREE","THROW","TIGER",
  "TIGHT","TIMER","TITLE","TODAY","TOKEN","TOTAL","TOUCH","TOUGH","TRACE","TRACK",
  "TRADE","TRAIL","TRAIN","TRAIT","TRASH","TREAT","TREND","TRIAL","TRIBE","TRICK",
  "TRIED","TROOP","TROUT","TRUCK","TRULY","TRUNK","TRUST","TRUTH","TWICE","TWIST",
  "ULTRA","UNCLE","UNDER","UNION","UNITE","UNITY","UNTIL","UPPER","UPSET","USUAL",
  "VALID","VALUE","VALVE","VAPOR","VAULT","VENOM","VERSE","VIDEO","VIRAL","VISIT",
  "VISTA","VITAL","VIVID","VOCAL","VOICE","VOTER","WASTE","WATCH","WATER","WEARY",
  "WEIRD","WHALE","WHEAT","WHEEL","WHERE","WHICH","WHILE","WHITE","WHOLE","WHOSE",
  "WIDER","WITCH","WOMAN","WOMEN","WORLD","WORRY","WORSE","WORST","WORTH","WOULD",
  "WOUND","WRATH","WRITE","WROTE","YACHT","YIELD","YOUNG","YOURS","YOUTH","ZEBRA",
  "ZESTY","BLANK","BLUNT","BLURT","BOUND","BOXER","BROOD","CAROL","CEDAR","CHALK",
  "CHASE","CIVIL","CLAIM","CLUNG","COACH","COMET","COMIC","COUCH","COVET","DECOY",
  "DEPTH","DIODE","DISCO","DIVER","DRAWL","DUNCE","DWELT","EBONY","ECLAT","EGRET",
  "EMOTE","EPOCH","EVOKE","EXACT","EXIST","EXPEL","EXTOL","FABLE","FACET","FIEND",
  "FINCH","FJORD","FLAIR","FLOCK","FLORA","FLOSS","FLOWN","FLUFF","FLUKE","FOCAL",
  "FOLIO","FRAIL","FROND","FROZE","FRUGAL","FUGUE","FUNGI","GAUZE","GAVEL","GHOUL",
  "GIRTH","GLOAT","GLYPH","GNASH","GRAFT","GRAZE","GRIPE","GRUFF","GUISE","GUSTO",
  "GYPSY","HAIKU","HAUNT","HAVEN","HENCE","HERON","INEPT","INERT","INFER","INGOT",
  "INLAY","INSET","INTER","INTRO","JOUST","KNACK","KNAVE","KNEEL","KNOLL","LAPEL",
  "LAPSE","LATCH","LEACH","LIMBO","LINGO","LITHE","LOCUS","LOFTY","LUNAR","LUSTY",
  "LATCH","MAXIM","MELEE","MERCY","MESSY","MIDST","MILKY","MIMIC","MIRTH","MITRE",
  "MOODY","MOSSY","MOSAIC","MURKY","MYRRH","NADIR","NIECE","NIFTY","NINJA","NOBLE",
  "NOTCH","NUDGE","NYMPH","OCTET","ONSET","OPTIC","ORATE","OVOID","OXIDE","OZONE",
  "PLAID","PLEAT","PLUCK","PLUMB","PLUME","PLUNK","POISE","POOCH","POUTY","PRANK",
  "PRAWN","PRISM","PRIVY","PROSE","PSALM","PUFFY","PYGMY","QUALM","RASPY","REDUX",
  "RENEW","REPEL","RESIN","RETCH","RIVET","RUPEE","RUSTY","SAVOR","SCALD","SCAM",
  "SCANT","SCOFF","SCOUR","SCOWL","SCRUB","SERUM","SKIMP","SKIRT","SLANT","SLUMP",
  "SNACK","SNARE","SNEAK","SNIDE","SNIFF","SNORE","SNORT","SNOUT","SOGGY","SONAR",
  "SONIC","SPADE","SPOOL","SPOUT","SPRIG","SPUNK","SQUAB","SQUAT","SQUID","STOMP",
  "STOUT","STRUT","SUAVE","SULKY","SULLY","SUMAC","SUNUP","SURGE","TABOO","TACIT",
  "TALON","TAPIR","TAUNT","TAWNY","TEPID","THANE","THORN","THYME","TITHE","TONGS",
  "TOPAZ","TORSO","TOTEM","TOXIC","TRUCE","TUBER","TULIP","TUNER","TWANG","TWEED",
  "TWIRL","UDDER","ULCER","UNDUE","UNWED","UNZIP","USURP","UTMOST","VAGUE","VALOR",
  "VALSE","VERGE","VIGIL","VISOR","VIXEN","VODKA","VOILA","VOUCH","WAGER","WAIST",
  "WALTZ","WHELP","WHIFF","WHIRL","WHISK","WINCE","WINCH","WOKEN","WORST","WRUNG",
  "WRYLY","YEARN","YODEL"
];

/* Extra allowed guesses (valid but not chosen as targets) */
const ALLOWED_EXTRA = [
  "AALII","ABACI","ABACK","ABASH","ABATE","ABBOT","ABHOR","ABIDE","ABODE","ABUTS",
  "ABYSS","ACHED","ACORN","ACRES","ACRID","ADEPT","ADORE","ADORN","AEGIS","AFOOT",
  "AGAPE","AGAVE","AGLOW","AGONE","AGONY","AGORA","AIDED","AIMER","AISLE","ALGAE",
  "ALIAS","ALIBI","ALOFT","ALOOF","ALOUD","AMBLE","AMEND","AMINO","AMISS","AMITY",
  "AMPLE","AMUSE","ANNOY","APING","ATONE","AVAIL","AVAST","AVIAN","BABEL","BADLY",
  "BAGEL","BAGGY","BALMY","BANAL","BANJO","BARNS","BAYOU","BEADY","BEFIT","BOGUS",
  "BONGO","BORAX","BOSSY","BOXED","BRACE","BRAID","CACAO","CACTI","CADDY","CADET",
  "CAGEY","CASTE","CATTY","CHAFE","CHAFF","CHAMP","CHARD","CHASM","CHEWY","CHOMP",
  "CHORE","CHOSE","CHUNK","CHUTE","CIGAR","CITED","CIVIC","CLEFT","CLUNK","COCOA",
  "COMFY","CONCH","CONDO","COVET","CREAK","GASSY","GAUZY","GENRE","GLINT","GLOAT",
  "GLOSS","GNASH","GOOEY","GORGE","GOUGE","GOURD","GRAIL","GRAZE","GRIPE","GRUFF",
  "GUPPY","JAZZY","JIFFY","JOKEY","JUICY","JUNKY","KAYAK","KNACK","KNAVE","KNEEL",
  "KOALA","KUDOS","LLAMA","LOBBY","LOFTY","LOOPY","LORRY","LOWLY","LUMPY","LYMPH",
  "MAXIM","MEALY","MESSY","MILKY","MINTY","MISER","MOIST","MOLDY","MOUSY","MUCKY",
  "MUGGY","MULCH","MUSTY","NIFTY","NIPPY","OAKEN","OCTET","OFFAL","PANSY","PASTY",
  "PATSY","PICKY","PINEY","PITHY","PIXIE","PIXEL","POKED","POKER","POOCH","POPPY",
  "PERKY","PLEAD","PLEAT","PREEN","PRIMO","PRIVY","PRONE","PROXY","RABID","RAINY",
  "RASPY","RATTY","RECAP","REEDY","REFIT","REGAL","RETRO","RHYME","RIGID","RIVET",
  "ROOMY","RUDDY","RUNNY","RUSTY","NUTTY","SASSY","SAVVY","SEEDY","SEIZE","SETUP",
  "SHADY","SHARD","SHEER","SHIRE","SHIRK","SHOOK","SHRUG","SHUNT","SIREN","SKIFF",
  "SKIMP","SKULK","SLAIN","SLICK","SLOSH","SLOTH","SLUNG","SMASH","SMEAR","SMELT",
  "SNACK","SNARE","SNIDE","SNIFF","SNORE","SNORT","SNUCK","SNUFF","SOGGY","SOOTY",
  "SPANK","SPAWN","SPECK","STOIC","STOMP","STOUT","STRUT","SUNNY","SWANK","TABOO",
  "TACKY","TAPIR","TARDY","TATTY","TAWNY","TEARY","TEPID","TIMID","TIPSY","TOADY",
  "TOPAZ","TRIPE","TRITE","TUBBY","TURBO","TWERP","VAPID","VEINY","VERSO","VEXED",
  "VIPER","VOGUE","VOLTA","VOMIT","VYING","WALTZ","WARTY","WEEDY","WHELP","WIMPY",
  "WINDY","WISPY","WITTY","WORMY","WOOZY","YUCKY","ZIPPY","ZLOTY","ZINGY"
];

const APP_VERSION = (document.querySelector('meta[name="game-version"]')?.content || '1.2.0').trim();

function normalizeWordList(words) {
  if (!Array.isArray(words)) return [];
  return [...new Set(
    words
      .map(w => String(w || '').trim().toUpperCase())
      .filter(w => /^[A-Z]{5}$/.test(w))
  )];
}

const EXTRA_COMMON_WORDS = normalizeWordList(window.EXTRA_COMMON_WORDS);
const TARGET_POOL = normalizeWordList([...ANSWERS, ...EXTRA_COMMON_WORDS]);
const VALID_SET = new Set(normalizeWordList([...TARGET_POOL, ...ALLOWED_EXTRA]));

/* ═══════════════════════════════════════════════════════════════════
   POKI SDK WRAPPER
   All SDK calls in one place. Game works without SDK (ad-block / dev).
═══════════════════════════════════════════════════════════════════ */
const Poki = {
  ready: false,
  adRunning: false,

  /* ── Call once at boot ── */
  init() {
    if (typeof PokiSDK === 'undefined') {
      console.warn('[Poki] SDK absent — ad-free mode');
      return Promise.resolve();
    }
    /* POKI SDK: PokiSDK.init() */
    return PokiSDK.init()
      .then(() => { this.ready = true; console.log('[Poki] ready'); })
      .catch(() => { this.ready = false; console.warn('[Poki] init failed'); });
  },

  /* ── Signal loading complete ── */
  loadDone() {
    if (!this.ready) return;
    /* POKI SDK: gameLoadingFinished */
    PokiSDK.gameLoadingFinished();
  },

  /* ── Player started interacting with a round ── */
  playStart() {
    if (!this.ready) return;
    /* POKI SDK: gameplayStart */
    PokiSDK.gameplayStart();
  },

  /* ── Round over (win, lose, or pause) ── */
  playStop() {
    if (!this.ready) return;
    /* POKI SDK: gameplayStop */
    PokiSDK.gameplayStop();
  },

  /* ── Between-game commercial break (interstitial) ──
     cb = called after ad (or immediately without SDK)
     Placement: before each new game via "NEXT WORD" button
  ── */
  commercial(cb) {
    if (!this.ready) { if (cb) cb(); return; }
    this.adRunning = true;
    /* POKI SDK: commercialBreak */
    PokiSDK.commercialBreak(() => {
      /* onBeforeAd — mute audio here: AudioMgr.mute() */
    }).then(() => {
      this.adRunning = false;
      /* onAfterAd — unmute audio here: AudioMgr.unmute() */
      if (cb) cb();
    });
  },

  /* ── Rewarded break (player opts in for reward) ──
      Places: Hint button, One More Try, Skip Current Word
     success = true means player watched ad → grant reward
  ── */
  rewarded(cb) {
    if (!this.ready) { if (cb) cb(true); return; }
    this.adRunning = true;
    /* POKI SDK: rewardedBreak */
    PokiSDK.rewardedBreak(() => {
      /* onBeforeAd — mute audio */
    }).then(success => {
      this.adRunning = false;
      /* onAfterAd — unmute audio */
      if (cb) cb(success);
    });
  }
};

/* ═══════════════════════════════════════════════════════════════════
   SETTINGS  — persisted in localStorage
═══════════════════════════════════════════════════════════════════ */
const Settings = {
  _k: 'wdl_settings',
  data: { theme: 'light', bgm: true, se: true },

  load() {
    try {
      const s = localStorage.getItem(this._k);
      if (s) this.data = { ...this.data, ...JSON.parse(s) };
    } catch (_) {}
    this._apply();
  },

  save() {
    try { localStorage.setItem(this._k, JSON.stringify(this.data)); } catch (_) {}
  },

  _apply() {
    document.documentElement.setAttribute('data-theme', this.data.theme);
    const thTog = document.getElementById('tog-theme');
    if (thTog) thTog.checked = this.data.theme === 'dark';
    const bgmTog = document.getElementById('tog-bgm');
    if (bgmTog) bgmTog.checked = this.data.bgm;
    const seTog = document.getElementById('tog-se');
    if (seTog) seTog.checked = this.data.se;
  },

  toggleTheme() {
    this.data.theme = this.data.theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', this.data.theme);
    this.save();
  },

  setBgm(v)  { this.data.bgm = v; this.save(); /* wire audio here */ },
  setSe(v)   { this.data.se  = v; this.save(); /* wire audio here */ }
};

/* ═══════════════════════════════════════════════════════════════════
   STATS  — persisted in localStorage
   distribution[0..6] = wins achieved in 1..7 guesses
═══════════════════════════════════════════════════════════════════ */
const Stats = {
  _k: 'wdl_stats',
  data: { played: 0, won: 0, streak: 0, best: 0, distribution: [0,0,0,0,0,0,0] },

  load() {
    try {
      const s = localStorage.getItem(this._k);
      if (s) this.data = { ...this.data, ...JSON.parse(s) };
    } catch (_) {}
  },

  save() {
    try { localStorage.setItem(this._k, JSON.stringify(this.data)); } catch (_) {}
  },

  record(won, guesses) {
    this.data.played++;
    if (won) {
      this.data.won++;
      this.data.streak++;
      if (this.data.streak > this.data.best) this.data.best = this.data.streak;
      const idx = Math.min(guesses - 1, 6);
      this.data.distribution[idx]++;
    } else {
      this.data.streak = 0;
    }
    this.save();
  }
};

/* ═══════════════════════════════════════════════════════════════════
   GAME STATE
═══════════════════════════════════════════════════════════════════ */
const G = {
  target:      '',
  guesses:     [],      // array of { word, result }
  row:         0,       // 0-5 (or 6 if extra try)
  rowLetters:  Array(5).fill(''),
  lockedHintCols: new Set(),
  over:        false,
  won:         false,
  maxRows:     6,
  hintPos:     -1,      // position index revealed as hint
  sdkStarted:  false,   // gameplayStart called this round?
  extraUsed:   false,   // One More Try consumed
};

function resetCurrentRowState() {
  G.rowLetters = Array(5).fill('');
  G.lockedHintCols = new Set();
}

function rowIsComplete() {
  return G.rowLetters.every(Boolean);
}

function currentGuess() {
  return G.rowLetters.join('');
}

function firstEmptyCol() {
  return G.rowLetters.findIndex(ch => !ch);
}

function lastEditableFilledCol() {
  for (let i = 4; i >= 0; i--) {
    if (G.rowLetters[i] && !G.lockedHintCols.has(i)) return i;
  }
  return -1;
}

/* ═══════════════════════════════════════════════════════════════════
   BOARD  — DOM helpers
═══════════════════════════════════════════════════════════════════ */
let tiles = []; // tiles[row][col]

function buildBoard() {
  const board = document.getElementById('board');
  board.innerHTML = '';
  tiles = [];
  for (let r = 0; r < 6; r++) {
    tiles[r] = [];
    for (let c = 0; c < 5; c++) {
      const t = document.createElement('div');
      t.className = 'tile';
      board.appendChild(t);
      tiles[r][c] = t;
    }
  }
  applyResponsiveLayout();
}

const KEYS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['ENTER','Z','X','C','V','B','N','M','⌫']
];

function buildKeyboard() {
  KEYS.forEach((row, ri) => {
    const el = document.getElementById(`krow${ri}`);
    el.innerHTML = '';
    row.forEach(k => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'key' + (k.length > 1 ? ' wide' : '');
      btn.textContent = k;
      btn.dataset.key = k;
      btn.addEventListener('click', () => onKey(k));
      el.appendChild(btn);
    });
  });
  applyResponsiveLayout();
}

function applyResponsiveLayout() {
  const board = document.getElementById('board');
  const header = document.getElementById('header');
  const keyboard = document.getElementById('keyboard');
  if (!board || !header || !keyboard) return;

  const rows = Math.max(tiles.length || 0, G.maxRows, 6);
  const gap = window.innerHeight <= 620 ? 4 : 5;
  const widthCap = Math.min(window.innerWidth, 520);
  const byWidth = (widthCap - 20 - (gap * 4)) / 5;

  const headerH = header.offsetHeight || 54;
  const keyboardH = keyboard.offsetHeight || 168;
  const usableH = window.innerHeight - headerH - keyboardH - 24;
  const byHeight = (usableH - (gap * (rows - 1))) / rows;

  const tile = Math.max(30, Math.floor(Math.min(byWidth, byHeight, 72)));
  board.style.gap = `${gap}px`;
  board.style.setProperty('--tile-dyn', `${tile}px`);
  board.style.gridTemplateColumns = 'repeat(5, var(--tile-dyn))';
  board.style.gridTemplateRows = `repeat(${rows}, var(--tile-dyn))`;
}

/* ═══════════════════════════════════════════════════════════════════
   GAME LOGIC
═══════════════════════════════════════════════════════════════════ */
function newGame() {
  G.target     = TARGET_POOL[Math.floor(Math.random() * TARGET_POOL.length)];
  G.guesses    = [];
  G.row        = 0;
  resetCurrentRowState();
  G.over       = false;
  G.won        = false;
  G.maxRows    = 6;
  G.hintPos    = -1;
  G.sdkStarted = false;
  G.extraUsed  = false;

  buildBoard();
  buildKeyboard();
  resetPosDots();
  stopCountdown();
  closeAllOverlays();
  applyResponsiveLayout();
}

function onKey(k) {
  if (G.over || Poki.adRunning || isOverlayOpen()) return;

  if (document.activeElement?.tagName === 'BUTTON') {
    document.activeElement.blur();
  }

  if (k === 'ENTER')        submitGuess();
  else if (k === '⌫')       deleteLetter();
  else if (/^[A-Z]$/.test(k)) typeLetter(k);
}

function typeLetter(letter) {
  if (rowIsComplete()) return;

  /* POKI SDK: fire gameplayStart on player's first input each round */
  if (!G.sdkStarted) {
    G.sdkStarted = true;
    Poki.playStart();
  }

  const col = firstEmptyCol();
  if (col === -1) return;
  G.rowLetters[col] = letter;

  const t = tiles[G.row][col];
  t.textContent = letter;
  t.classList.add('filled', 'pop');
  t.addEventListener('animationend', () => t.classList.remove('pop'), { once: true });
}

function deleteLetter() {
  const col = lastEditableFilledCol();
  if (col === -1) return;

  G.rowLetters[col] = '';
  const t = tiles[G.row][col];
  t.textContent = '';
  t.classList.remove('filled', 'hint-rev');
}

function submitGuess() {
  const guess = currentGuess();
  if (!rowIsComplete())      { showToast('NOT ENOUGH LETTERS'); shakeRow(G.row); return; }
  if (!VALID_SET.has(guess)) { showToast('NOT IN WORD LIST');  shakeRow(G.row); return; }

  const result = evaluate(guess, G.target);
  G.guesses.push({ word: guess, result });
  revealRow(G.row, guess, result, () => {
    syncKeyColors(guess, result);
    updatePosDots(result);

    const won  = result.every(r => r === 'green');
    const lost = !won && G.row >= G.maxRows - 1;

    if (won) {
      G.over = true;
      G.won  = true;
      Poki.playStop(); /* POKI SDK: gameplayStop */
      Stats.record(true, G.row + 1);

      const msgs = ['GENIUS!','MAGNIFICENT','IMPRESSIVE','SPLENDID','GREAT','PHEW!'];
      showToast(msgs[G.row] || 'AMAZING', 1800);
      bounceTiles(G.row);
      setTimeout(launchConfetti, 400);
      setTimeout(() => showEndScreen(true), 2100);

    } else if (lost) {
      G.over = true;
      Poki.playStop(); /* POKI SDK: gameplayStop */

      if (!G.extraUsed) {
        /* Offer One More Try before recording loss */
        setTimeout(() => showOMT(), 700);
      } else {
        Stats.record(false, G.row + 1);
        setTimeout(() => showEndScreen(false), 800);
      }
    } else {
      G.row++;
      resetCurrentRowState();
    }
  });
}

/* Two-pass duplicate-safe evaluation (official Wordle rules)
   Example: target=ABBEY, guess=BABES → [yellow,green,absent,green,absent]
   Pass 1: mark greens, consume those letters.
   Pass 2: mark yellows from remaining pool.                            */
function evaluate(guess, target) {
  const res   = Array(5).fill('absent');
  const tPool = target.split('');
  const gPool = guess.split('');

  // Pass 1 — greens
  for (let i = 0; i < 5; i++) {
    if (gPool[i] === tPool[i]) {
      res[i] = 'green';
      tPool[i] = null;
      gPool[i] = null;
    }
  }

  // Pass 2 — yellows
  for (let i = 0; i < 5; i++) {
    if (gPool[i] !== null) {
      const j = tPool.indexOf(gPool[i]);
      if (j !== -1) {
        res[i] = 'yellow';
        tPool[j] = null;
      }
    }
  }

  return res;
}

/* ═══════════════════════════════════════════════════════════════════
   UI ANIMATIONS
═══════════════════════════════════════════════════════════════════ */
const FLIP_STEP = 300;

function revealRow(row, word, result, done) {
  result.forEach((state, col) => {
    setTimeout(() => {
      const t = tiles[row][col];
      t.classList.add('flip');
      /* Apply colour at mid-flip (tile faces away from player) */
      setTimeout(() => {
        t.classList.remove('filled', 'hint-rev');
        t.classList.add(state);
      }, FLIP_STEP * 0.78);
      if (col === 4) setTimeout(done, FLIP_STEP * 4 + 250);
    }, col * FLIP_STEP);
  });
}

function bounceTiles(row) {
  tiles[row].forEach((t, col) => {
    setTimeout(() => {
      t.classList.add('bounce');
      t.addEventListener('animationend', () => t.classList.remove('bounce'), { once: true });
    }, col * 85);
  });
}

function shakeRow(row) {
  const rowTiles = tiles[row];
  rowTiles.forEach(t => t.classList.add('row-shake'));
  setTimeout(() => rowTiles.forEach(t => t.classList.remove('row-shake')), 420);
}

/* ═══════════════════════════════════════════════════════════════════
   KEYBOARD COLOR SYNC
   Priority: green > yellow > absent (never downgrade a green key)
═══════════════════════════════════════════════════════════════════ */
const RANK = { green: 3, yellow: 2, absent: 1 };

function syncKeyColors(word, result) {
  result.forEach((state, i) => {
    const btn = document.querySelector(`.key[data-key="${word[i]}"]`);
    if (!btn) return;
    const cur = btn.dataset.state || '';
    if ((RANK[state] || 0) > (RANK[cur] || 0)) {
      btn.classList.remove('green', 'yellow', 'absent');
      btn.classList.add(state);
      btn.dataset.state = state;
    }
  });
}

/* ═══════════════════════════════════════════════════════════════════
   POSITION DOTS  (header diamonds)
   Track best-known state per column across all guesses.
═══════════════════════════════════════════════════════════════════ */
const posState = Array(5).fill('');

function resetPosDots() {
  posState.fill('');
  document.querySelectorAll('.pdot').forEach(d => {
    d.className = 'pdot';
  });
}

function updatePosDots(result) {
  result.forEach((state, i) => {
    if ((RANK[state] || 0) > (RANK[posState[i]] || 0)) {
      posState[i] = state;
    }
    const dot = document.querySelector(`.pdot[data-p="${i}"]`);
    if (dot) {
      dot.className = 'pdot';
      if (posState[i]) dot.classList.add(`st-${posState[i]}`);
    }
  });
}

/* ═══════════════════════════════════════════════════════════════════
   TOAST
═══════════════════════════════════════════════════════════════════ */
let toastTimer;
function showToast(msg, dur = 1100) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), dur);
}

/* ═══════════════════════════════════════════════════════════════════
   OVERLAYS / MODALS
═══════════════════════════════════════════════════════════════════ */
function openOverlay(id)  { document.getElementById(id)?.classList.add('open'); }
function closeOverlay(id) { document.getElementById(id)?.classList.remove('open'); }
function closeAllOverlays() {
  document.querySelectorAll('.overlay.open').forEach(el => el.classList.remove('open'));
}

function isOverlayOpen() {
  return !!document.querySelector('.overlay.open');
}

function setTutorialGlow(on) {
  const btn = document.getElementById('tutorial-btn');
  if (btn) btn.classList.toggle('tutorial-glow', !!on);
}

function showStartupTutorial() {
  setTutorialGlow(true);
  openOverlay('tut-overlay');
}

function clearTutorialCue() {
  setTutorialGlow(false);
}

/* ─── HINT  (rewarded ad → reveal one unknown letter) ─── */
function requestHint() {
  if (G.over || Poki.adRunning) return;

  if (rowIsComplete()) {
    showToast('ROW IS FULL');
    return;
  }

  /* POKI SDK: rewardedBreak for hint */
  Poki.rewarded(success => {
    if (!success) {
      if (Poki.ready) showToast('AD COULD NOT PLAY');
      return;
    }

    const unknown = [];
    for (let c = 0; c < 5; c++) {
      if (!G.rowLetters[c] && posState[c] !== 'green') unknown.push(c);
    }

    if (!unknown.length) {
      for (let c = 0; c < 5; c++) {
        if (!G.rowLetters[c]) unknown.push(c);
      }
    }

    if (!unknown.length) { showToast('ROW IS FULL'); return; }

    const pos = unknown[Math.floor(Math.random() * unknown.length)];
    const letter = G.target[pos];

    G.rowLetters[pos] = letter;
    G.lockedHintCols.add(pos);

    // Reveal in current active row
    const t = tiles[G.row][pos];
    t.textContent = letter;
    t.classList.add('filled', 'hint-rev');
    G.hintPos = pos;
    showToast(`HINT: ${letter} is at position ${pos + 1}`);
  });
}

/* ─── SKIP WORD (rewarded ad) ─── */
function requestSkipWord() {
  if (G.over || Poki.adRunning) return;

  Poki.rewarded(success => {
    if (!success && Poki.ready) {
      showToast('AD COULD NOT PLAY');
      return;
    }

    Poki.playStop();
    showToast(`SKIPPED: ${G.target}`, 1400);
    setTimeout(() => newGame(), 320);
  });
}

/* ─── ONE MORE TRY ─── */
let cdInterval;
const CD_TOTAL   = 10;
const CD_CIRCUM  = 276.46; // 2π × 44

function showOMT() {
  /* Choose a hint position — reveal one unconfirmed letter */
  const unconfirmed = [];
  for (let c = 0; c < 5; c++) {
    if (posState[c] !== 'green') unconfirmed.push(c);
  }
  const hPos = unconfirmed.length
    ? unconfirmed[Math.floor(Math.random() * unconfirmed.length)]
    : Math.floor(Math.random() * 5);

  G.hintPos = hPos;

  /* Populate hint tiles */
  ['omt-tiles','end-tiles'].forEach(id => {
    const container = document.getElementById(id);
    if (!container) return;
    container.querySelectorAll('.ht').forEach(t => {
      t.textContent = '';
      t.classList.remove('revealed','revealed-y');
    });
    const hTile = container.querySelector(`.ht[data-p="${hPos}"]`);
    if (hTile) {
      hTile.textContent = G.target[hPos];
      hTile.classList.add('revealed');
    }
  });

  openOverlay('omt-overlay');
  startCountdown();
}

function startCountdown() {
  clearInterval(cdInterval);
  let t = CD_TOTAL;
  const arc = document.getElementById('cd-arc');
  const num = document.getElementById('cd-num');

  arc.style.strokeDashoffset = '0';
  num.textContent = t;

  cdInterval = setInterval(() => {
    t--;
    num.textContent = t;
    arc.style.strokeDashoffset = ((CD_TOTAL - t) / CD_TOTAL * CD_CIRCUM).toFixed(2);
    if (t <= 0) {
      clearInterval(cdInterval);
      closeOverlay('omt-overlay');
      Stats.record(false, G.row + 1);
      showEndScreen(false);
    }
  }, 1000);
}

function stopCountdown() {
  clearInterval(cdInterval);
}

function grantExtraTry() {
  stopCountdown();
  closeOverlay('omt-overlay');
  G.over     = false;
  G.maxRows  = 7;
  G.extraUsed = true;
  G.row++;
  resetCurrentRowState();
  /* Add an extra tile row if needed */
  if (tiles.length < 7) {
    const board = document.getElementById('board');
    /* Resize grid */
    board.style.gridTemplateRows = 'repeat(7, var(--tile-dyn))';
    tiles[6] = [];
    for (let c = 0; c < 5; c++) {
      const t = document.createElement('div');
      t.className = 'tile';
      board.appendChild(t);
      tiles[6][c] = t;
    }
  }
  applyResponsiveLayout();
  showToast('ONE MORE TRY!', 900);
  /* SDK: resume gameplay */
  Poki.playStart();
}

/* ─── END SCREEN ─── */
function showEndScreen(won) {
  /* Populate hint tiles for end overlay */
  const container = document.getElementById('end-tiles');
  if (container) {
    container.querySelectorAll('.ht').forEach(t => {
      t.textContent = '';
      t.classList.remove('revealed','revealed-y');
    });
    if (won && G.hintPos >= 0) {
      const hTile = container.querySelector(`.ht[data-p="${G.hintPos}"]`);
      if (hTile) { hTile.textContent = G.target[G.hintPos]; hTile.classList.add('revealed'); }
    } else if (!won) {
      container.querySelectorAll('.ht').forEach((t, i) => {
        t.textContent = G.target[i];
        t.classList.add('revealed');
      });
    }
  }

  const title = document.getElementById('end-title');
  title.textContent = won ? 'YOU WIN!' : 'FAILED';
  title.style.color = won ? 'var(--clr-green)' : 'var(--text)';

  const answerEl = document.getElementById('answer-text');
  if (answerEl) {
    answerEl.textContent = won ? '' : `WORD: ${G.target}`;
    answerEl.style.display = won ? 'none' : 'block';
  }

  renderStats();
  openOverlay('end-overlay');
}

function renderStats() {
  const s = Stats.data;
  document.getElementById('st-played').textContent = s.played;
  document.getElementById('st-pct').textContent    = s.played ? Math.round(s.won / s.played * 100) : 0;
  document.getElementById('st-streak').textContent  = s.streak;
  document.getElementById('st-best').textContent   = s.best;

  const maxVal = Math.max(...s.distribution, 1);
  const container = document.getElementById('dist-bars');
  container.innerHTML = '';

  s.distribution.forEach((val, i) => {
    const row = document.createElement('div');
    row.className = 'dbar-row';
    const pct = Math.max(val / maxVal * 100, 8);

    const isWinner = val > 0; // highlight all rows that have wins
    row.innerHTML = `
      <span class="dbar-lbl">${i + 1}</span>
      <div class="dbar-track">
        <div class="dbar-fill${isWinner ? ' winner' : ''}" style="width:${pct}%">${val}</div>
      </div>`;
    container.appendChild(row);
  });
}

/* ═══════════════════════════════════════════════════════════════════
   CONFETTI  (win only)
═══════════════════════════════════════════════════════════════════ */
function launchConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  const ctx    = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.display = 'block';

  const COLORS = ['#4b9e43','#c4a100','#e05050','#3a8abf','#e07830','#e0e0d8'];
  const parts  = Array.from({ length: 90 }, () => ({
    x:    Math.random() * canvas.width,
    y:    Math.random() * -canvas.height * 0.4,
    w:    Math.random() * 11 + 5,
    h:    Math.random() * 7 + 3,
    clr:  COLORS[Math.floor(Math.random() * COLORS.length)],
    rot:  Math.random() * Math.PI * 2,
    rs:   (Math.random() - 0.5) * 0.22,
    vx:   (Math.random() - 0.5) * 3.5,
    vy:   Math.random() * 3 + 1.8,
    a:    1
  }));

  let frame;
  const t0 = Date.now();
  const FADE_START = 2200;
  const STOP       = 3800;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const elapsed = Date.now() - t0;

    parts.forEach(p => {
      p.x  += p.vx;
      p.y  += p.vy;
      p.vy += 0.06;
      p.rot += p.rs;
      if (elapsed > FADE_START) p.a = Math.max(0, 1 - (elapsed - FADE_START) / (STOP - FADE_START));

      ctx.save();
      ctx.globalAlpha = p.a;
      ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.clr;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });

    if (elapsed < STOP) {
      frame = requestAnimationFrame(draw);
    } else {
      canvas.style.display = 'none';
      cancelAnimationFrame(frame);
    }
  }

  draw();
}

/* ═══════════════════════════════════════════════════════════════════
   LOADING SEQUENCE
═══════════════════════════════════════════════════════════════════ */
function runLoader() {
  let pct = 0;
  const fill  = document.getElementById('ld-bar');
  const label = document.getElementById('ld-pct');

  const ticker = setInterval(() => {
    pct = Math.min(pct + Math.random() * 22 + 5, 92);
    fill.style.width  = pct + '%';
    label.textContent = Math.round(pct) + '%';
  }, 160);

  setTimeout(() => {
    clearInterval(ticker);
    fill.style.width  = '100%';
    label.textContent = '100%';

    /* POKI SDK: gameLoadingFinished */
    Poki.loadDone();

    setTimeout(() => {
      /* POKI SDK: commercialBreak — loading → game transition */
      Poki.commercial(() => {
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('game').classList.add('visible');
        applyResponsiveLayout();
        setTimeout(showStartupTutorial, 180);
      });
    }, 300);
  }, 1600);
}

/* ═══════════════════════════════════════════════════════════════════
   PHYSICAL KEYBOARD
═══════════════════════════════════════════════════════════════════ */
document.addEventListener('keydown', e => {
  /* POKI REQUIREMENT: prevent page scroll and accidental default button actions */
  if ([' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter','Backspace'].includes(e.key)) {
    e.preventDefault();
  }

  if (Poki.adRunning) return;
  if (isOverlayOpen()) {
    if (e.key === 'Escape') {
      closeAllOverlays();
      clearTutorialCue();
    }
    return;
  }

  if (e.key === 'Enter')               onKey('ENTER');
  else if (e.key === 'Backspace')      onKey('⌫');
  else if (/^[a-zA-Z]$/.test(e.key))  onKey(e.key.toUpperCase());
});

/* ═══════════════════════════════════════════════════════════════════
   BUTTON / OVERLAY WIRING
═══════════════════════════════════════════════════════════════════ */

/* Dismiss via data-dismiss attribute */
document.querySelectorAll('[data-dismiss]').forEach(btn => {
  btn.addEventListener('click', () => {
    const id = btn.dataset.dismiss;
    closeOverlay(id);
    if (id === 'tut-overlay') clearTutorialCue();
    btn.blur();
  });
});

/* Header buttons */
document.getElementById('hint-btn').addEventListener('click', e => {
  e.currentTarget.blur();
  requestHint();
});
document.getElementById('skip-btn').addEventListener('click', e => {
  e.currentTarget.blur();
  requestSkipWord();
});
document.getElementById('tutorial-btn').addEventListener('click', e => {
  e.currentTarget.blur();
  clearTutorialCue();
  openOverlay('tut-overlay');
});
document.getElementById('settings-btn').addEventListener('click', () => {
  Settings._apply();
  openOverlay('set-overlay');
  document.getElementById('settings-btn').blur();
});

/* Settings toggles */
document.getElementById('tog-theme').addEventListener('change', e => Settings.toggleTheme());
document.getElementById('tog-bgm').addEventListener('change', e => Settings.setBgm(e.target.checked));
document.getElementById('tog-se').addEventListener('change', e => Settings.setSe(e.target.checked));

/* One More Try buttons */
document.getElementById('omt-yes-btn').addEventListener('click', () => {
  document.getElementById('omt-yes-btn').blur();
  stopCountdown();
  /* POKI SDK: rewardedBreak for "One More Try" */
  Poki.rewarded(success => {
    if (success) {
      grantExtraTry();
    } else {
      /* Ad not shown (ad-blocker) — still give the try in dev/testing */
      if (!Poki.ready) {
        grantExtraTry();
      } else {
        showToast('AD COULD NOT PLAY');
        closeOverlay('omt-overlay');
        Stats.record(false, G.row + 1);
        showEndScreen(false);
      }
    }
  });
});

document.getElementById('omt-no-btn').addEventListener('click', () => {
  document.getElementById('omt-no-btn').blur();
  stopCountdown();
  closeOverlay('omt-overlay');
  Stats.record(false, G.row + 1);
  showEndScreen(false);
});

/* NEXT WORD button — POKI commercial break before new game */
document.getElementById('next-btn').addEventListener('click', () => {
  document.getElementById('next-btn').blur();
  closeOverlay('end-overlay');
  /* POKI SDK: commercialBreak between games (user-triggered) */
  Poki.commercial(() => newGame());
});

/* Close overlay on backdrop click */
document.querySelectorAll('.overlay').forEach(ov => {
  ov.addEventListener('click', e => {
    if (e.target !== ov) return;
    if (ov.id === 'omt-overlay' || ov.id === 'end-overlay') return;
    closeOverlay(ov.id);
    if (ov.id === 'tut-overlay') clearTutorialCue();
  });
});

/* ═══════════════════════════════════════════════════════════════════
   BOOT
═══════════════════════════════════════════════════════════════════ */
const versionLabel = document.getElementById('ver-label');
if (versionLabel) versionLabel.textContent = `ver.${APP_VERSION}`;

window.addEventListener('resize', applyResponsiveLayout);
window.addEventListener('orientationchange', () => setTimeout(applyResponsiveLayout, 80));

Poki.init().then(() => {
  Settings.load();
  Stats.load();
  newGame();
  runLoader();
});

/*
  ─── AUDIO PLACEHOLDER ──────────────────────────────────────────
  Uncomment and fill paths to enable sound effects.

  const AudioMgr = {
    sounds: {
      flip: new Audio('./sounds/flip.mp3'),
      win:  new Audio('./sounds/win.mp3'),
      lose: new Audio('./sounds/lose.mp3'),
      type: new Audio('./sounds/type.mp3'),
      err:  new Audio('./sounds/error.mp3'),
    },
    play(name) {
      if (!Settings.data.se) return;
      const s = this.sounds[name];
      if (!s) return;
      s.currentTime = 0;
      s.play().catch(() => {});
    },
    mute()   { Object.values(this.sounds).forEach(s => s.muted = true); },
    unmute() { Object.values(this.sounds).forEach(s => s.muted = false); }
  };

  Wire in Poki.commercial/rewarded callbacks:
    onBeforeAd: AudioMgr.mute()
    onAfterAd:  AudioMgr.unmute()

  Call AudioMgr.play('flip') inside revealRow, etc.
*/
