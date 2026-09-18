/* Tavern-sign portraits. Same renderer as artifact/old-tavern.html. */
window.Portrait = (() => {
  // ------------------------------------------------------------------
  // Portraits. The Keeper describes the hero's look in a handful of fixed
  // choices; the page paints a lit, shaded bust from them: key light from
  // the upper left, soft shadows, strands in the hair, folds in the cloth.
  // ------------------------------------------------------------------
  const P = {
    skin: { light: "#f3d9bd", fair: "#ecc6a4", tan: "#d4a77a", olive: "#c49a6c", brown: "#8f5b3c", dark: "#5a3826" },
    hair: { black: "#1c1a19", brown: "#553520", blond: "#d8b464", red: "#a8422a", grey: "#9c9a97", white: "#e9e6e1", none: "none" },
    eyes: { brown: "#5a3a22", blue: "#4a86c2", green: "#4f8a55", grey: "#8a9299", hazel: "#8a7038", dark: "#241f1c" },
    clothing: { crimson: "#8a2a2c", forest: "#2f5b3a", navy: "#24395c", umber: "#5c3d25", ochre: "#b07f30", black: "#1e1c1b", grey: "#6a6a6a", white: "#e4dccb", purple: "#5a3c7c", teal: "#2b6a6b", olive: "#6b6a2e", sand: "#c6b28b" },
    hairStyles: ["short", "long", "braided", "curly", "topknot", "bald"],
    facialHair: ["none", "stubble", "moustache", "beard", "fullbeard"],
    headwear: ["none", "hood", "helmet", "crown", "hat", "turban", "headscarf", "cap", "laurel", "veil"],
    ages: ["young", "adult", "old"],
  };
  const pick = (v, table, d) => (v in table ? v : d);
  const pickList = (v, list, d) => (list.includes(v) ? v : d);
  const isEmoji = (v) => typeof v === "string" && v.length <= 8 && /\p{Extended_Pictographic}/u.test(v);

  function normPortrait(p) {
    p = p && typeof p === "object" ? p : {};
    return {
      skin: pick(p.skin, P.skin, "tan"), hair: pick(p.hair, P.hair, "brown"), hairStyle: pickList(p.hairStyle, P.hairStyles, "short"),
      facialHair: pickList(p.facialHair, P.facialHair, "none"), eyes: pick(p.eyes, P.eyes, "brown"), headwear: pickList(p.headwear, P.headwear, "none"),
      clothing: pick(p.clothing, P.clothing, "umber"), symbol: isEmoji(p.symbol) ? p.symbol : "⚔️", age: pickList(p.age, P.ages, "adult"), scar: Boolean(p.scar),
    };
  }

  // colour helpers: multiply brightness, or mix toward another colour
  const hexToRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const rgbToHex = (r) => "#" + r.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
  const shade = (hex, f) => rgbToHex(hexToRgb(hex).map((v) => v * f));
  const mix = (a, b, t) => { const x = hexToRgb(a), y = hexToRgb(b); return rgbToHex(x.map((v, i) => v + (y[i] - v) * t)); };

  /** SVG markup for a portrait at the given pixel size. `ring` tints the frame. */
  function portraitSVG(p, size = 64, ring = "#4d3a2b") {
    p = normPortrait(p);
    const skin = P.skin[p.skin], hair = P.hair[p.hair], iris = P.eyes[p.eyes], cloth = P.clothing[p.clothing];
    const hairOn = p.hair !== "none" && p.hairStyle !== "bald";
    const longHair = hairOn && (p.hairStyle === "long" || p.hairStyle === "braided");
    const fh = hairOn ? hair : "#553520";
    const lip = mix(shade(skin, 0.82), "#a04a48", 0.35);
    const lipLo = mix(shade(skin, 0.9), "#b8605c", 0.35);
    const line = shade(skin, 0.45);
    const u = "p" + Math.random().toString(36).slice(2, 8);
    const big = size >= 56; // fine detail only when it can be seen
    const d = [];

    // ---- defs: gradients and soft-shadow filter ----
    d.push(`<defs>
      <clipPath id="${u}c"><circle cx="50" cy="50" r="47"/></clipPath>
      <radialGradient id="${u}bg" cx="45%" cy="35%" r="75%"><stop offset="0" stop-color="#5a3d26"/><stop offset=".55" stop-color="#2f1f14"/><stop offset="1" stop-color="#160e09"/></radialGradient>
      <radialGradient id="${u}sk" cx="40%" cy="34%" r="72%"><stop offset="0" stop-color="${shade(skin, 1.1)}"/><stop offset=".55" stop-color="${skin}"/><stop offset="1" stop-color="${shade(skin, 0.72)}"/></radialGradient>
      <linearGradient id="${u}nk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(skin, 0.6)}"/><stop offset=".6" stop-color="${shade(skin, 0.85)}"/></linearGradient>
      <linearGradient id="${u}cl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(cloth, 1.25)}"/><stop offset=".5" stop-color="${cloth}"/><stop offset="1" stop-color="${shade(cloth, 0.55)}"/></linearGradient>
      <linearGradient id="${u}hr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(hair === "none" ? "#553520" : hair, 1.35)}"/><stop offset=".45" stop-color="${hair === "none" ? "#553520" : hair}"/><stop offset="1" stop-color="${shade(hair === "none" ? "#553520" : hair, 0.55)}"/></linearGradient>
      <radialGradient id="${u}ir" cx="40%" cy="40%" r="60%"><stop offset="0" stop-color="${shade(iris, 1.45)}"/><stop offset=".7" stop-color="${iris}"/><stop offset="1" stop-color="${shade(iris, 0.45)}"/></radialGradient>
      <linearGradient id="${u}mt" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c9ced4"/><stop offset=".5" stop-color="#7d848c"/><stop offset="1" stop-color="#3f444a"/></linearGradient>
      <linearGradient id="${u}au" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbe89a"/><stop offset=".5" stop-color="#d9a92c"/><stop offset="1" stop-color="#8a6510"/></linearGradient>
      <filter id="${u}s" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.6"/></filter>
      <filter id="${u}s2" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="0.7"/></filter>
    </defs>`);
    d.push(`<circle cx="50" cy="50" r="48" fill="url(#${u}bg)"/>`);
    const g = [];

    // ---- hair behind the head ----
    if (longHair) {
      g.push(`<path d="M27 44 C25 66 28 80 31 92 L69 92 C72 80 75 66 73 44 C71 26 61 17 50 17 C39 17 29 26 27 44Z" fill="url(#${u}hr)"/>`);
      for (let i = 0; i < 7; i++) {
        const x = 30 + i * 6.5;
        g.push(`<path d="M${x} ${40 + (i % 2) * 4} C${x - 2} 60 ${x + 1} 75 ${x - 1} 90" stroke="${shade(hair, i % 2 ? 0.7 : 1.3)}" stroke-width="${i % 2 ? 1.1 : 0.7}" fill="none" opacity=".7"/>`);
      }
      if (p.hairStyle === "braided") {
        for (const x of [33, 67]) for (let y = 60; y < 90; y += 6) g.push(`<ellipse cx="${x}" cy="${y}" rx="3.6" ry="3.2" fill="${shade(hair, y % 12 ? 1.15 : 0.8)}"/>`);
      }
    }

    // ---- shoulders, collar, neck ----
    g.push(`<path d="M12 100 C14 80 28 73 42 70 L50 79 L58 70 C72 73 86 80 88 100Z" fill="url(#${u}cl)"/>`);
    g.push(`<path d="M42 70 L50 79 L58 70 L54 71 L50 76 L46 71Z" fill="${shade(cloth, 0.5)}" opacity=".8"/>`);
    g.push(`<path d="M22 100 C24 86 30 80 36 78 M78 100 C76 86 70 80 64 78" stroke="${shade(cloth, 0.55)}" stroke-width="1.2" fill="none" opacity=".6"/>`);
    g.push(`<path d="M30 92 C32 84 36 80 40 79" stroke="${shade(cloth, 1.5)}" stroke-width="0.9" fill="none" opacity=".5"/>`);
    g.push(`<path d="M42.5 59 L42.5 73 Q50 78 57.5 73 L57.5 59Z" fill="url(#${u}nk)"/>`);
    g.push(`<ellipse cx="50" cy="64" rx="9" ry="4" fill="${shade(skin, 0.5)}" opacity=".55" filter="url(#${u}s)"/>`);

    // ---- ears and head ----
    for (const x of [33.5, 66.5]) {
      g.push(`<ellipse cx="${x}" cy="46" rx="3.4" ry="4.6" fill="${shade(skin, 0.92)}"/>`);
      g.push(`<ellipse cx="${x}" cy="46.4" rx="1.6" ry="2.6" fill="${shade(skin, 0.72)}" opacity=".8"/>`);
    }
    g.push(`<path d="M33 41 C33 27 40 19 50 19 C60 19 67 27 67 41 C67 53 61 66 50 67 C39 66 33 53 33 41Z" fill="url(#${u}sk)"/>`);
    // temple and jaw shading, cheek warmth
    g.push(`<path d="M62 32 C67 40 66 54 58 63" stroke="${shade(skin, 0.7)}" stroke-width="5" fill="none" opacity=".35" filter="url(#${u}s)"/>`);
    g.push(`<ellipse cx="41" cy="51" rx="5" ry="3" fill="#c6605a" opacity=".16" filter="url(#${u}s)"/><ellipse cx="59" cy="51" rx="5" ry="3" fill="#c6605a" opacity=".14" filter="url(#${u}s)"/>`);
    if (hairOn || p.headwear !== "none") g.push(`<ellipse cx="50" cy="29" rx="16" ry="5" fill="${shade(skin, 0.55)}" opacity=".35" filter="url(#${u}s)"/>`);
    if (p.age === "old") {
      g.push(`<path d="M40 30 Q50 28 60 30 M41 33.5 Q50 31.5 59 33.5" stroke="${line}" stroke-width=".7" fill="none" opacity=".45"/>`);
      g.push(`<path d="M35 45 l-3 -1.5 M35 47 l-3 1.5 M65 45 l3 -1.5 M65 47 l3 1.5" stroke="${line}" stroke-width=".6" fill="none" opacity=".5"/>`);
      g.push(`<path d="M44 52 q-1 4 -2 8 M56 52 q1 4 2 8" stroke="${line}" stroke-width=".7" fill="none" opacity=".4"/>`);
    }

    // ---- eyes ----
    for (const [cx, sx] of [[42.5, 1], [57.5, -1]]) {
      g.push(`<path d="M${cx - 6} 44.6 Q${cx} 39.4 ${cx + 6} 44.6 Q${cx} 48.4 ${cx - 6} 44.6Z" fill="#f4efe9"/>`);
      g.push(`<path d="M${cx - 6} 44.6 Q${cx} 39.4 ${cx + 6} 44.6 Q${cx} 42.6 ${cx - 6} 44.6Z" fill="${shade(skin, 0.6)}" opacity=".35"/>`);
      g.push(`<circle cx="${cx + 0.3 * sx}" cy="44.4" r="2.9" fill="url(#${u}ir)"/>`);
      g.push(`<circle cx="${cx + 0.3 * sx}" cy="44.4" r="1.35" fill="#111"/>`);
      g.push(`<circle cx="${cx - 0.8 + 0.3 * sx}" cy="43.3" r=".75" fill="#fff" opacity=".95"/>`);
      g.push(`<path d="M${cx - 6.2} 44.6 Q${cx} 38.9 ${cx + 6.2} 44.6" stroke="${line}" stroke-width="1.1" fill="none" stroke-linecap="round"/>`);
      g.push(`<path d="M${cx - 5.5} 45.3 Q${cx} 48.8 ${cx + 5.5} 45.3" stroke="${line}" stroke-width=".55" fill="none" opacity=".55"/>`);
      // brow
      g.push(`<path d="M${cx - 6.5} 39.8 Q${cx - 1} 36.4 ${cx + 5.5} 38.6" stroke="${hairOn ? shade(hair, 0.85) : shade(skin, 0.5)}" stroke-width="1.9" fill="none" stroke-linecap="round"/>`);
      g.push(`<path d="M${cx - 6.5} 39.8 Q${cx - 1} 36.4 ${cx + 5.5} 38.6" stroke="${hairOn ? shade(hair, 1.4) : shade(skin, 0.8)}" stroke-width=".6" fill="none" opacity=".5"/>`);
    }

    // ---- nose ----
    g.push(`<path d="M49.4 43 L47.6 53.2 Q50 56 52.4 53.2 L50.6 43Z" fill="${shade(skin, 0.78)}" opacity=".55" filter="url(#${u}s2)"/>`);
    g.push(`<path d="M46.8 53.6 Q50 56.4 53.2 53.6" stroke="${shade(skin, 0.6)}" stroke-width="1" fill="none" opacity=".7"/>`);
    g.push(`<ellipse cx="47.3" cy="54.2" rx="1.2" ry=".7" fill="${shade(skin, 0.45)}" opacity=".7"/><ellipse cx="52.7" cy="54.2" rx="1.2" ry=".7" fill="${shade(skin, 0.45)}" opacity=".7"/>`);
    g.push(`<ellipse cx="49.6" cy="51.6" rx="1.4" ry="1.8" fill="${shade(skin, 1.18)}" opacity=".6" filter="url(#${u}s2)"/>`);

    // ---- mouth ----
    g.push(`<path d="M44.6 58.6 Q47.4 57 50 58.1 Q52.6 57 55.4 58.6 Q50 60.2 44.6 58.6Z" fill="${lip}"/>`);
    g.push(`<path d="M45 58.9 Q50 63.2 55 58.9 Q50 60.4 45 58.9Z" fill="${lipLo}"/>`);
    g.push(`<path d="M45 58.8 Q50 60.3 55 58.8" stroke="${shade(lip, 0.55)}" stroke-width=".7" fill="none"/>`);
    g.push(`<ellipse cx="50" cy="61" rx="2.2" ry=".6" fill="#fff" opacity=".18"/>`);
    if (p.scar) g.push(`<path d="M59 35 l3.5 12" stroke="${mix(skin, "#b3574f", 0.5)}" stroke-width="1.3" stroke-linecap="round"/><path d="M59.6 38 l1.6 -.5 M60.6 41.5 l1.6 -.5 M61.6 45 l1.6 -.5" stroke="${mix(skin, "#b3574f", 0.5)}" stroke-width=".6"/>`);

    // ---- facial hair ----
    if (p.facialHair === "stubble") g.push(`<path d="M35 49 Q39 66 50 67 Q61 66 65 49 Q58 59 50 59 Q42 59 35 49Z" fill="${fh}" opacity=".22" filter="url(#${u}s2)"/>`);
    if (p.facialHair === "moustache" || p.facialHair === "fullbeard") g.push(`<path d="M42.5 56.2 Q50 52.4 57.5 56.2 Q54 57.6 50 56.8 Q46 57.6 42.5 56.2Z" fill="${fh}"/><path d="M44 56.4 Q50 54 56 56.4" stroke="${shade(fh, 1.5)}" stroke-width=".5" fill="none" opacity=".5"/>`);
    if (p.facialHair === "beard" || p.facialHair === "fullbeard") {
      const full = p.facialHair === "fullbeard";
      g.push(`<path d="M${full ? 33 : 36} ${full ? 44 : 51} C${full ? 34 : 37} ${full ? 74 : 70} 50 ${full ? 78 : 72} ${full ? 66 : 64} ${full ? 74 : 70} ${full ? 67 : 64} ${full ? 44 : 51} C60 62 55 63 50 63 C45 63 40 62 ${full ? 33 : 36} ${full ? 44 : 51}Z" fill="url(#${u}hr)"/>`);
      for (let i = 0; i < 6; i++) { const x = 40 + i * 4; g.push(`<path d="M${x} ${62 + (i % 2)} q${(i % 2 ? -1 : 1) * 1.5} 5 0 ${full ? 12 : 8}" stroke="${shade(fh, i % 2 ? 0.6 : 1.4)}" stroke-width=".7" fill="none" opacity=".6"/>`); }
      g.push(`<path d="M46 60.6 Q50 62.6 54 60.6" stroke="${shade(fh, 0.5)}" stroke-width="1" fill="none" opacity=".7"/>`);
    }

    // ---- hair on top ----
    if (hairOn && p.hairStyle !== "bald") {
      const top = longHair
        ? `M31 44 C30 24 40 17 50 17 C60 17 70 24 69 44 C66 33 58 29.5 50 29.5 C42 29.5 34 33 31 44Z`
        : `M31.5 42 C30.5 23 40 17.5 50 17.5 C60 17.5 69.5 23 68.5 42 C65 32 58 28.5 50 28.5 C42 28.5 35 32 31.5 42Z`;
      g.push(`<path d="${top}" fill="url(#${u}hr)"/>`);
      for (let i = 0; i < 6; i++) {
        const x = 36 + i * 5.5;
        g.push(`<path d="M${x} ${30 - Math.abs(i - 2.5) * 1.2} C${x - 3} 25 ${x - 1} 20 ${x + 2} 18.5" stroke="${shade(hair, i % 2 ? 0.7 : 1.3)}" stroke-width="${i % 2 ? 0.9 : 0.6}" fill="none" opacity=".4"/>`);
      }
      g.push(`<ellipse cx="44" cy="23" rx="8" ry="3" fill="#fff" opacity=".14" filter="url(#${u}s)"/>`);
      if (p.hairStyle === "curly") for (const [x, y, r] of [[34, 31, 5.5], [39, 24, 5.5], [46, 20, 5.5], [54, 20, 5.5], [61, 24, 5.5], [66, 31, 5.5], [42, 28, 4], [58, 28, 4]]) g.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${shade(hair, (x + y) % 2 ? 1.2 : 0.85)}"/>`);
      if (p.hairStyle === "topknot") g.push(`<ellipse cx="50" cy="16.5" rx="7" ry="5.5" fill="url(#${u}hr)"/><path d="M45 14 Q50 11 55 14" stroke="${shade(hair, 1.4)}" stroke-width=".7" fill="none" opacity=".6"/>`);
    }
    if (!hairOn) g.push(`<ellipse cx="46" cy="24" rx="7" ry="3" fill="#fff" opacity=".16" filter="url(#${u}s)"/>`);

    // ---- headwear ----
    switch (p.headwear) {
      case "hood":
        g.push(`<path d="M23 62 C20 20 40 13 50 13 C60 13 80 20 77 62 C70 36 60 30 50 30 C40 30 30 36 23 62Z" fill="url(#${u}cl)"/>`);
        g.push(`<path d="M27 58 C28 36 40 31 50 31 C60 31 72 36 73 58" stroke="${shade(cloth, 0.4)}" stroke-width="3" fill="none" opacity=".55" filter="url(#${u}s)"/>`);
        g.push(`<path d="M30 26 C36 18 44 15 50 15" stroke="${shade(cloth, 1.6)}" stroke-width="1" fill="none" opacity=".5"/>`);
        break;
      case "helmet":
        g.push(`<path d="M30 37 C30 18 40 13 50 13 C60 13 70 18 70 37 L70 39 L30 39Z" fill="url(#${u}mt)"/>`);
        g.push(`<path d="M30 36 Q50 31 70 36 L70 39.5 L30 39.5Z" fill="#5c626a"/>`);
        g.push(`<rect x="48.3" y="37" width="3.4" height="15" rx="1" fill="#6f757c"/><path d="M48.3 37 L48.3 52" stroke="#c9ced4" stroke-width=".5" opacity=".6"/>`);
        g.push(`<path d="M36 23 C40 18 45 16 50 16" stroke="#e6eaee" stroke-width="1.2" fill="none" opacity=".6"/>`);
        for (const x of [34, 42, 50, 58, 66]) g.push(`<circle cx="${x}" cy="37.8" r=".9" fill="#2f3337"/>`);
        break;
      case "crown":
        g.push(`<path d="M32 33 L36 19 L43 28 L50 15 L57 28 L64 19 L68 33Z" fill="url(#${u}au)"/><rect x="32" y="31" width="36" height="5.5" rx="1" fill="url(#${u}au)"/>`);
        for (const [x, c] of [[40, "#b33a3a"], [50, "#2f6bb5"], [60, "#3a8f4a"]]) g.push(`<circle cx="${x}" cy="33.8" r="1.5" fill="${c}"/><circle cx="${x - .4}" cy="33.4" r=".5" fill="#fff" opacity=".8"/>`);
        break;
      case "hat":
        g.push(`<ellipse cx="50" cy="33" rx="27" ry="5.5" fill="#241d19"/><path d="M36 33 L38 13 Q50 9 62 13 L64 33Z" fill="#2c2420"/>`);
        g.push(`<path d="M37 30 Q50 26 63 30 L63 33 Q50 30 37 33Z" fill="${shade(cloth, 0.9)}"/><path d="M39 15 Q44 12 50 12" stroke="#5a4a42" stroke-width="1" fill="none" opacity=".6"/>`);
        break;
      case "turban":
        g.push(`<path d="M29 41 C29 14 50 13 50 13 C50 13 71 14 71 41 Q60 31 50 31 Q40 31 29 41Z" fill="url(#${u}cl)"/>`);
        g.push(`<path d="M32 36 Q50 20 68 36 M35 30 Q50 16 65 30 M31 40 Q50 27 69 40" stroke="${shade(cloth, 0.55)}" stroke-width="1.6" fill="none" opacity=".6"/>`);
        g.push(`<circle cx="50" cy="19" r="2.2" fill="url(#${u}au)"/>`);
        break;
      case "headscarf":
        g.push(`<path d="M30 45 C30 20 40 19 50 19 C60 19 70 20 70 45 Q64 31 50 31 Q36 31 30 45Z" fill="url(#${u}cl)"/>`);
        g.push(`<path d="M30 44 C26 56 30 66 37 70 L38 50Z" fill="${shade(cloth, 0.85)}"/><path d="M70 44 C74 56 70 66 63 70 L62 50Z" fill="${shade(cloth, 0.7)}"/>`);
        g.push(`<path d="M33 40 Q50 24 67 40" stroke="${shade(cloth, 1.5)}" stroke-width=".9" fill="none" opacity=".5"/>`);
        break;
      case "cap":
        g.push(`<path d="M32.5 39 C32.5 22 40 18.5 50 18.5 C60 18.5 67.5 22 67.5 39 Q50 33 32.5 39Z" fill="url(#${u}cl)"/>`);
        g.push(`<path d="M33 39 L23 42 Q40 37 50 39Z" fill="${shade(cloth, 0.6)}"/><path d="M36 26 Q42 21 50 20.5" stroke="${shade(cloth, 1.6)}" stroke-width=".9" fill="none" opacity=".5"/>`);
        break;
      case "laurel":
        for (const s of [1, -1]) for (let i = 0; i < 5; i++) { const a = -0.2 + i * 0.32; const x = 50 + s * (17.5 * Math.cos(a + 0.9)); const y = 42 - 17.5 * Math.sin(a + 0.9); g.push(`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="3.6" ry="1.7" transform="rotate(${(s * (30 + i * 22)).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${i % 2 ? "#5f8f4a" : "#7fb35f"}"/>`); }
        break;
      case "veil":
        g.push(`<path d="M29 41 C29 18 40 17 50 17 C60 17 71 18 71 41 L73 74 Q50 68 27 74Z" fill="${shade(cloth, 1.5)}" opacity=".55"/><path d="M33 38 Q50 22 67 38" stroke="#fff" stroke-width=".8" fill="none" opacity=".35"/>`);
        break;
    }

    // ---- frame and badge ----
    const grain = big ? `<filter id="${u}g"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .07 0"/></filter><circle cx="50" cy="50" r="48" filter="url(#${u}g)"/>` : "";
    return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="portrait">${d.join("")}
      <g clip-path="url(#${u}c)">${g.join("")}</g>${grain}
      <circle cx="50" cy="50" r="47.5" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="3"/>
      <circle cx="50" cy="50" r="47.5" fill="none" stroke="${ring}" stroke-width="1.6"/>
      <circle cx="80" cy="80" r="12" fill="#1c1410" stroke="${ring}" stroke-width="1.5"/>
      <text x="80" y="84.5" text-anchor="middle" font-size="13">${p.symbol}</text>
    </svg>`;
  }

  return { portraitSVG, normPortrait };
})();
