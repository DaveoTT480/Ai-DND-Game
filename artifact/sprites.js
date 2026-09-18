  // ------------------------------------------------------------------
  // 8-bit item sprites: 16x16, one character per pixel. '.' is clear;
  // 't'/'T' take the item's tint; other letters are the fixed palette.
  // ------------------------------------------------------------------
  const SPRITE_PALETTE = {
    k: "#1b1410", h: "#ffffff", c: "#2a2a2e",
    s: "#d3d9de", S: "#7f8a93", w: "#8a5a2b", W: "#5b3a1c", g: "#e8c04a", G: "#a67c1e",
    r: "#c23b2e", R: "#7a1f18", b: "#3f7fbf", B: "#24486f", n: "#5a9a4c", N: "#2d5a2b",
    p: "#efe3c2", P: "#c9b98d", l: "#a7743c", L: "#6b4520", x: "#8a5fc0", X: "#4f3378", o: "#e08f2b", O: "#a85f14",
  };
  const SPRITES = {
    dagger: [
      "................", "..............k.", ".............ks.", "............ksk.", "...........ksk..", "..........ksk...", ".........ksk....", "........ksk.....",
      ".......ksk......", "....kkkskkk.....", "...kgggkgggk....", "..kWWkkkkkkk....", ".kWWk...........", "kWWk............", "kWk.............", ".k..............",
    ],
    sword: [
      "..............k.", ".............khk", "............khsk", "...........khsk.", "..........khsk..", ".........khsk...", "........khsk....", ".......khsk.....",
      "......khsk......", ".kk..khsk.......", ".kggkhsk........", "..kgggk.........", "...kgggk........", "..kWkkggk.......", ".kWWk..kk.......", ".kkk............",
    ],
    axe: [
      ".....kkkk.......", "...kkssssk......", "..kssssssk......", ".kssssssskkk....", ".kssssssskWWk...", ".ksssssskkWk....", "..kssssskWk.....", "...kkkkkWWk.....",
      "........kWk.....", ".......kWWk.....", ".......kWk......", "......kWWk......", "......kWk.......", ".....kWWk.......", ".....kWk........", ".....kk.........",
    ],
    bow: [
      "......kk........", ".....kwwk.......", "....kwk.k.......", "...kwk..k.......", "...kwk..k.......", "..kwk...k.......", "..kwk...k.......", "..kwkkkkkkkkkk..",
      "..kwk...k.......", "..kwk...k.......", "...kwk..k.......", "...kwk..k.......", "....kwk.k.......", ".....kwwk.......", "......kk........", "................",
    ],
    spear: [
      "..............k.", ".............ksk", "............kssk", "...........kssk.", "..........kksk..", ".........kWk....", "........kWk.....", ".......kWk......",
      "......kWk.......", ".....kWk........", "....kWk.........", "...kWk..........", "..kWk...........", ".kWk............", "kWk.............", "kk..............",
    ],
    shield: [
      "...kkkkkkkkkk...", "..ktttttttttk...", ".kttttttttttk...", ".kttkkkkkkttk...", ".kttkggggkttk...", ".kttkgggg kttk..", ".kttkkkkkkttk...", ".kTTttttttTTk...",
      ".kTTTttttTTTk...", "..kTTTttTTTk....", "..kTTTTTTTTk....", "...kTTTTTTk.....", "....kTTTTk......", ".....kTTk.......", "......kk........", "................",
    ],
    helmet: [
      "......kkkk......", "....kkssssk.....", "...kssssssskk...", "..ksssssssssk...", "..kssssssssssk..", ".ksSSSSSSSSSsk..", ".kSSSSSSSSSSSk..", ".kSkkkkkkkkkSk..",
      ".kSk..kSk..kSk..", ".kSk..kSk..kSk..", ".kSk..kSk..kSk..", "..kk..kSk..kk...", "......kSk.......", "......kkk.......", "................", "................",
    ],
    armor: [
      "...kk.....kk....", "..ktttkkkktttk..", ".ktttttttttttk..", ".kttkttttttkttk.", ".kkkktTTTTtkkkk.", "....ktTTTTtk....", "....ktTTTTtk....", "....ktTTTTtk....",
      "....ktTkkTtk....", "....ktTTTTtk....", "....ktTTTTtk....", "....kTTTTTTk....", "....kTTTTTTk....", ".....kTTTTk.....", "......kkkk......", "................",
    ],
    cloak: [
      "......kkkk......", ".....ktttttk....", "....kttttttk....", "....kttttttk....", "...kttttttttk...", "...kttTttTttk...", "..kttTTttTTttk..", "..kttTTttTTttk..",
      ".kttTTTttTTTttk.", ".kttTTTttTTTttk.", ".kTTTTTttTTTTTk.", ".kTTTTTttTTTTTk.", ".kTTTTTTTTTTTTk.", "..kkkkkkkkkkkk..", "................", "................",
    ],
    boots: [
      "................", "....kkkk........", "....kLLlk.......", "....kLLlk.......", "....kLLlk.......", "....kLLlk.......", "....kLLlkkkkk...", "....kLLLlllllk..",
      "...kLLLLLLLLLlk.", "..kLLLLLLLLLLLk.", "..kWWWWWWWWWWWk.", "..kkkkkkkkkkkkk.", "................", "................", "................", "................",
    ],
    potion: [
      "......kkkk......", "......kppk......", "......kppk......", "......kppk......", ".....kkkkkk.....", "....khsssssk....", "...khsssssssk...", "..khsstttttssk..",
      "..kssttttttttk..", "..ksttttttttttk.", "..kttttttttttk..", "..kTTttttttTTk..", "..kTTTTTTTTTTk..", "...kTTTTTTTTk...", "....kkkkkkkk....", "................",
    ],
    scroll: [
      "................", "..kkkkkkkkkkkk..", ".kPpppppppppppk.", ".kpppppppppppPk.", ".kppPPPPPPPpppk.", ".kpppppppppppPk.", ".kppPPPPPPpppPk.", ".kpppppppppppPk.",
      ".kppPPPPPPPpppk.", ".kpppppppppppPk.", ".kppPPPPPpppppk.", ".kpppppppppppPk.", ".kPpppppppppppk.", "..kkkkkkkkkkkk..", "................", "................",
    ],
    book: [
      "................", "..kkkkkkkkkkk...", ".kttttttttttkk..", ".kttttttttttkpk.", ".kttggggggttkpk.", ".kttttttttttkpk.", ".kttgggggttttpk.", ".kttttttttttkpk.",
      ".kttttttttttkpk.", ".kttttttttttkpk.", ".kTTTTTTTTTTkpk.", ".kTTTTTTTTTTkpk.", ".kkkkkkkkkkkkk..", "................", "................", "................",
    ],
    letter: [
      "................", "..kkkkkkkkkkkk..", ".kppppppppppppk.", ".kpkppppppppkpk.", ".kppkppppppkppk.", ".kpppkppppkpppk.", ".kppppkppkppppk.", ".kpppppkkpppppk.",
      ".kppppppppppppk.", ".kpppprrrpppppk.", ".kppppprrppppppk", ".kppppppppppppk.", ".kkkkkkkkkkkkkk.", "................", "................", "................",
    ],
    key: [
      "................", "................", "...kkkk.........", "..kggggk........", ".kgg..ggk.......", ".kg....gkkkkkkk.", ".kg....gggggggk.", ".kgg..ggkkgkgkk.",
      "..kggggk..kgkk..", "...kkkk...kk....", "................", "................", "................", "................", "................", "................",
    ],
    coins: [
      "................", "................", ".....kkkk.......", "....kgggggk.....", "...kggGGGggk....", "...kgGgggGgk....", "...kgGgggGgk....", "..kkkgGGGgkkk...",
      ".kgggkkkkkgggk..", ".kggGGGGGGGggk..", ".kgGgggggggGgk..", ".kgGgggggggGgk..", ".kggGGGGGGGggk..", "..kgggggggggk...", "...kkkkkkkkk....", "................",
    ],
    purse: [
      "................", "......kkkk......", ".....kllllk.....", "....kkkkkkkk....", "....kllllllk....", "...kllllllllk...", "..kllllllllllk..", "..kllLLLLLLllk..",
      ".kllLLLLLLLLllk.", ".kllLLLLLLLLllk.", ".kllLLLggLLLllk.", ".kllLLLLLLLLllk.", "..kllLLLLLLllk..", "...kllllllllk...", "....kkkkkkkk....", "................",
    ],
    ring: [
      "................", "................", "......kkkk......", ".....kttttk.....", "....kt.tt.tk....", "...kt......tk...", "...kgk....kgk...", "...kgk....kgk...",
      "...kgk....kgk...", "...kGgk..kgGk...", "....kGgkkgGk....", ".....kGGGGk.....", "......kkkk......", "................", "................", "................",
    ],
    amulet: [
      "......kkkk......", ".....kg..gk.....", "....kg....gk....", "....kg....gk....", "....kg....gk....", ".....kg..gk.....", "......kggk......", ".....kgggggk....",
      "....kggttttggk..", "....kgtttttttgk.", "....kgtTTTTttgk.", "....kgtTTTTttgk.", ".....kgTTTTgk...", "......kgggk.....", ".......kkk......", "................",
    ],
    gem: [
      "................", "................", "....kkkkkkkk....", "...khttttttTk...", "..khhtttttTTTk..", ".khhttttttTTTTk.", ".kttttttttTTTTk.", "..kttttttTTTTk..",
      "...kttttTTTTk...", "....kttTTTTk....", ".....kTTTTk.....", "......kTTk......", ".......kk.......", "................", "................", "................",
    ],
    torch: [
      "......ko........", ".....koook......", "....koooook.....", "....koggook.....", ".....kggok......", "......kgk.......", ".....kkkkk......", ".....kWWWk......",
      "......kwk.......", "......kwk.......", "......kwk.......", "......kwk.......", "......kwk.......", "......kwk.......", "......kkk.......", "................",
    ],
    rope: [
      "................", "....kkkkkkk.....", "...klLlLlLlk....", "..klLl...lLlk...", "..kLl.....lLk...", "..klL.....Llk...", "..kLl.....lLk...", "..klLl...lLlk...",
      "...klLlLlLlk....", "....kkkkkkkkk...", "........klLlk...", ".........kLlk...", ".........klLk...", "..........kk....", "................", "................",
    ],
    tools: [
      "................", "..kk........kk..", ".kssk......kssk.", ".kssk......kssk.", "..ksk......ksk..", "..ksk..kk..ksk..", "..ksk.kssk.ksk..", "..kskksssskksk..",
      "...ksssssssssk..", "....ksssssssk...", ".....kWWWWWk....", ".....kWWWWWk....", ".....kWWWWWk....", ".....kWWWWWk....", "......kkkkk.....", "................",
    ],
    bread: [
      "................", "................", "....kkkkkkkk....", "..kkllllllllkk..", ".kllllLllLllllk.", ".kllLllllllLllk.", "kllllllLllllllk.", "klLLlllllllLLlk.",
      "kLLLLLLLLLLLLLk.", ".kLLLLLLLLLLLk..", "..kkkkkkkkkkk...", "................", "................", "................", "................", "................",
    ],
    bottle: [
      "......kkkk......", "......kWWk......", "......kttk......", "......kttk......", "......kttk......", ".....kkttkk.....", "....ktttttk.....", "....kttttttk....",
      "....ktppppttk...", "....ktpttpttk...", "....ktpttpttk...", "....ktppppttk...", "....kTTTTTTTk...", "....kTTTTTTk....", ".....kkkkkk.....", "................",
    ],
    map: [
      "................", ".kkkkkkkkkkkkkk.", ".kppppppppppppk.", ".kppnnppppnnppk.", ".kpnnnnppnnnnpk.", ".kppnnpprppnppk.", ".kpppppbbbppppk.", ".kppppbbbbbpppk.",
      ".kppprpbbbppppk.", ".kppppppppnnppk.", ".kpnnppppnnnnpk.", ".kppppppppppppk.", ".kkkkkkkkkkkkkk.", "................", "................", "................",
    ],
    lantern: [
      "......kkkk......", ".....kSSSSk.....", "......kkkk......", ".....kSSSSk.....", "....kSkkkkSk....", "....kSkoookSk...", "....kSkgggkSk...", "....kSkoookSk...",
      "....kSkkkkkSk...", ".....kSSSSk.....", ".....kSSSSk.....", "......kkkk......", "................", "................", "................", "................",
    ],
    pistol: [
      "................", "................", "................", "...kkkkkkkkkkk..", "..kcccccccccccck", "..kccccccccckkk.", "..kkkkccccck....", ".....kcckcck....",
      "....kWWkkk......", "....kWWk........", "...kWWk.........", "...kWWk.........", "...kkk..........", "................", "................", "................",
    ],
    rifle: [
      "................", "................", "..............kk", ".......kkkkkkkck", "...kkkkccccccck.", ".kkWWWccccccck..", "kWWWWkkkkkkkk...", "kWWWk..kck......",
      ".kkk...kck......", ".......kk.......", "................", "................", "................", "................", "................", "................",
    ],
    radio: [
      "..............k.", ".............k..", "............k...", "...........k....", "..kkkkkkkkkkkk..", ".kWWWWWWWWWWWWk.", ".kWkkkkkkWkkkWk.", ".kWkssssskWgkWk.",
      ".kWksSSSskkkkWk.", ".kWkssssskWgkWk.", ".kWkkkkkkWkkkWk.", ".kWWWWWWWWWWWWk.", ".kkkkkkkkkkkkkk.", "................", "................", "................",
    ],
    compass: [
      "................", "....kkkkkkkk....", "...kggggggggk...", "..kgppppppppgk..", ".kgppppkpppppgk.", ".kgpppkrkppppgk.", ".kgppkrrrkpppgk.", ".kgppppkppppppk.",
      ".kgppppkppppppk.", ".kgpppkskppppgk.", ".kgppppkpppppgk.", "..kgppppppppgk..", "...kggggggggk...", "....kkkkkkkk....", "................", "................",
    ],
    papers: [
      "................", "..kkkkkkkkkk....", ".kppppppppppk...", ".kpkkkkkkkkpkk..", ".kpppppppppppk..", ".kpkkkkkkkpppk..", ".kpppppppppppk..", ".kpkkkkkkkkppk..",
      ".kpppppppppppk..", ".kpkkkkkkpppppk.", ".kpppppppppppk..", ".kppppppprrppk..", ".kkkkkkkkkkkkk..", "................", "................", "................",
    ],
    crown: [
      "................", "................", "..k....kk....k..", ".kgk..kggk..kgk.", ".kggk.kggk.kggk.", ".kgggkkggkkgggk.", ".kggggggggggggk.", ".kgrggggbggggrk.",
      ".kggggggggggggk.", ".kGGGGGGGGGGGGk.", ".kgggggggggggggk", ".kkkkkkkkkkkkkk.", "................", "................", "................", "................",
    ],
    skull: [
      "................", ".....kkkkkk.....", "....kppppppk....", "...kppppppppk...", "..kppppppppppk..", "..kpkkppppkkpk..", "..kkccpppkcckk..", "..kpkkppppkkpk..",
      "..kppppkkppppk..", "...kppppppppk...", "....kpkpkpkpk...", "....kkkkkkkkk...", "................", "................", "................", "................",
    ],
    herb: [
      "................", "......k.........", ".....knk...k....", "....knnnk.knk...", "....knnnkknnnk..", ".....knnknnnk...", "......knnnnk....", "..k...knnk......",
      ".knk..kNk.......", ".knnkkNk........", "..kNNNk.........", "...kNk..........", "...kNk..........", "...kNk..........", "....k...........", "................",
    ],
    mask: [
      "................", "..kkkkkkkkkkkk..", ".kttttttttttttk.", ".kttttttttttttk.", ".ktkkkttttkkktk.", ".ktkhhkttkhhktk.", ".ktkkkkttkkkktk.", ".kttttttttttttk.",
      ".kttttkkkkttttk.", ".kTttttttttttTk.", "..kTTTkkkkTTTk..", "...kTTTTTTTTk...", "....kkkkkkkk....", "................", "................", "................",
    ],
    hourglass: [
      "....kkkkkkkk....", "....kWWWWWWk....", "....kppppppk....", ".....kppppk.....", ".....kppppk.....", "......kppk......", ".......kk.......", "......k..k......",
      ".....k.pp.k.....", ".....k.pp.k.....", "....k.pppp.k....", "....kppppppk....", "....kppppppk....", "....kWWWWWWk....", "....kkkkkkkk....", "................",
    ],
    candle: [
      "......ko........", ".....koook......", ".....kgggk......", "......kgk.......", "......kkk.......", ".....kpppk......", ".....kpppk......", ".....kpPpk......",
      ".....kpppk......", ".....kpPpk......", ".....kpppk......", "....kkpppkk.....", "...kGgggggGk....", "...kGGGGGGGk....", "....kkkkkkk.....", "................",
    ],
    curio: [
      "................", "......kkkk......", ".....kttttk.....", "....kttttttk....", "...kttThhTttk...", "...kttThhTttk...", "...kttttttttk...", "...kTttttttTk...",
      "....kTttttTk....", ".....kTTTTk.....", "......kkkk......", "......kwwk......", ".....kwwwwk.....", ".....kkkkkk.....", "................", "................",
    ],
  };
  const SPRITE_NAMES = Object.keys(SPRITES);

  const spriteShade = (hex, f) => { const n = parseInt(hex.slice(1), 16); const c = (x) => Math.max(0, Math.min(255, Math.round(x * f))); return `#${[c(n >> 16), c((n >> 8) & 255), c(n & 255)].map((v) => v.toString(16).padStart(2, "0")).join("")}`; };

  /** Crisp SVG for a 16x16 sprite at the given pixel size, tinted for 't'/'T' cells. */
  function spriteSVG(name, tint, size = 96) {
    const rows = SPRITES[name] || SPRITES.curio;
    const t = /^#[0-9a-f]{6}$/i.test(tint || "") ? tint : "#9aa0a6";
    const colors = { ...SPRITE_PALETTE, t, T: spriteShade(t, 0.62) };
    const rects = [];
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const ch = rows[y]?.[x] || ".";
      if (ch === "." || !colors[ch]) continue;
      rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${colors[ch]}"/>`);
    }
    return `<svg viewBox="0 0 16 16" width="${size}" height="${size}" shape-rendering="crispEdges" role="img" aria-label="${name}">${rects.join("")}</svg>`;
  }
