/* Tavern-sign portraits. Same renderer as artifact/old-tavern.html. */
window.Portrait = (() => {
  // ------------------------------------------------------------------
  // Portraits. The Keeper describes the hero's look in a handful of fixed
  // choices; the page draws a flat tavern-sign portrait from them.
  // ------------------------------------------------------------------
  const P = {
    skin: { light: "#f1d3b3", fair: "#e8c39e", tan: "#d2a679", olive: "#c19a6b", brown: "#8d5a3b", dark: "#5a3825" },
    hair: { black: "#1b1b1b", brown: "#5a3a1e", blond: "#d9b45e", red: "#b4452a", grey: "#9a9a9a", white: "#e8e8e8", none: "none" },
    eyes: { brown: "#4a2e1a", blue: "#3f7fbf", green: "#4f8a4a", grey: "#8a8f96", hazel: "#7a6a3a", dark: "#1b1b1b" },
    clothing: { crimson: "#8c2a2a", forest: "#2f5d3a", navy: "#23395d", umber: "#5c3d24", ochre: "#b07d2c", black: "#1a1a1a", grey: "#6b6b6b", white: "#e6e0d2", purple: "#5b3a7a", teal: "#2b6b6b", olive: "#6b6b2b", sand: "#c8b38a" },
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

  const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); const c = (x) => Math.max(0, Math.min(255, Math.round(x * f))); return `#${[c(n >> 16), c((n >> 8) & 255), c(n & 255)].map((v) => v.toString(16).padStart(2, "0")).join("")}`; };

  /** SVG markup for a portrait at the given pixel size. `ring` tints the frame. */
  function portraitSVG(p, size = 64, ring = "#4d3a2b") {
    p = normPortrait(p);
    const skin = P.skin[p.skin], hair = P.hair[p.hair], eyes = P.eyes[p.eyes], cloth = P.clothing[p.clothing];
    const hairOn = p.hair !== "none" && p.hairStyle !== "bald";
    const uid = "c" + Math.random().toString(36).slice(2, 8);
    const parts = [];
    // hair behind the head
    if (hairOn && (p.hairStyle === "long" || p.hairStyle === "braided")) parts.push(`<rect x="30" y="34" width="40" height="44" rx="14" fill="${hair}"/>`);
    if (hairOn && p.hairStyle === "braided") parts.push(`<rect x="33" y="58" width="6" height="26" rx="3" fill="${shade(hair, 0.8)}"/><rect x="61" y="58" width="6" height="26" rx="3" fill="${shade(hair, 0.8)}"/>`);
    // shoulders, neck, head
    parts.push(`<path d="M18 100 Q20 70 50 68 Q80 70 82 100 Z" fill="${cloth}"/>`);
    parts.push(`<path d="M42 66 Q50 76 58 66 L58 78 L42 78 Z" fill="${shade(cloth, 1.25)}" opacity=".5"/>`);
    parts.push(`<rect x="44" y="56" width="12" height="16" fill="${shade(skin, 0.9)}"/>`);
    parts.push(`<circle cx="33" cy="46" r="3.2" fill="${skin}"/><circle cx="67" cy="46" r="3.2" fill="${skin}"/>`);
    parts.push(`<ellipse cx="50" cy="45" rx="17" ry="20" fill="${skin}"/>`);
    if (p.age === "old") parts.push(`<path d="M40 54 q4 2 8 0 M52 54 q4 2 8 0" stroke="${shade(skin, 0.75)}" stroke-width="1" fill="none"/>`);
    // eyes, brows, nose, mouth
    parts.push(`<ellipse cx="43" cy="44" rx="3.2" ry="2.2" fill="#fff"/><ellipse cx="57" cy="44" rx="3.2" ry="2.2" fill="#fff"/>`);
    parts.push(`<circle cx="43.5" cy="44.3" r="1.7" fill="${eyes}"/><circle cx="57.5" cy="44.3" r="1.7" fill="${eyes}"/>`);
    parts.push(`<path d="M39 40 q4 -2.5 8 0 M53 40 q4 -2.5 8 0" stroke="${hairOn ? shade(hair, 0.9) : shade(skin, 0.6)}" stroke-width="1.4" fill="none" stroke-linecap="round"/>`);
    parts.push(`<path d="M50 46 l-2 6 h4 z" fill="${shade(skin, 0.85)}"/>`);
    parts.push(`<path d="M45 57 q5 3 10 0" stroke="${shade(skin, 0.6)}" stroke-width="1.3" fill="none" stroke-linecap="round"/>`);
    if (p.scar) parts.push(`<path d="M58 36 l4 12" stroke="${shade(skin, 0.65)}" stroke-width="1.2" stroke-linecap="round"/>`);
    // facial hair
    const fh = hairOn ? hair : (p.hair === "none" ? "#5a3a1e" : hair);
    if (p.facialHair === "stubble") parts.push(`<path d="M35 50 Q50 70 65 50 Q50 62 35 50Z" fill="${fh}" opacity=".25"/>`);
    if (p.facialHair === "moustache" || p.facialHair === "fullbeard") parts.push(`<path d="M42 54 q8 -4 16 0 q-8 2 -16 0z" fill="${fh}"/>`);
    if (p.facialHair === "beard") parts.push(`<path d="M35 50 Q38 68 50 70 Q62 68 65 50 Q58 60 50 60 Q42 60 35 50Z" fill="${fh}"/>`);
    if (p.facialHair === "fullbeard") parts.push(`<path d="M33 46 Q35 74 50 76 Q65 74 67 46 Q60 62 50 62 Q40 62 33 46Z" fill="${fh}"/>`);
    // hair on top
    if (hairOn && p.hairStyle !== "long" && p.hairStyle !== "braided") parts.push(`<path d="M32 44 Q32 22 50 23 Q68 22 68 44 Q62 31 50 31 Q38 31 32 44Z" fill="${hair}"/>`);
    if (hairOn && (p.hairStyle === "long" || p.hairStyle === "braided")) parts.push(`<path d="M32 46 Q32 22 50 23 Q68 22 68 46 Q64 32 50 32 Q36 32 32 46Z" fill="${hair}"/>`);
    if (hairOn && p.hairStyle === "curly") parts.push(`<circle cx="36" cy="30" r="5" fill="${hair}"/><circle cx="46" cy="24" r="5" fill="${hair}"/><circle cx="56" cy="24" r="5" fill="${hair}"/><circle cx="65" cy="30" r="5" fill="${hair}"/>`);
    if (hairOn && p.hairStyle === "topknot") parts.push(`<circle cx="50" cy="20" r="6" fill="${hair}"/>`);
    // headwear
    switch (p.headwear) {
      case "hood": parts.push(`<path d="M24 60 Q22 18 50 16 Q78 18 76 60 Q66 34 50 32 Q34 34 24 60Z" fill="${shade(cloth, 0.8)}"/>`); break;
      case "helmet": parts.push(`<path d="M31 42 Q31 20 50 20 Q69 20 69 42 L69 46 L31 46Z" fill="#8a8f96"/><rect x="48" y="40" width="4" height="12" fill="#8a8f96"/><path d="M31 42 Q50 36 69 42" stroke="#6c7076" stroke-width="1.5" fill="none"/>`); break;
      case "crown": parts.push(`<path d="M33 32 L37 20 L44 29 L50 17 L56 29 L63 20 L67 32 Z" fill="#edc252"/><rect x="33" y="30" width="34" height="5" fill="#d9a92c"/>`); break;
      case "hat": parts.push(`<ellipse cx="50" cy="32" rx="26" ry="5" fill="#1f1a17"/><path d="M36 32 L38 14 Q50 10 62 14 L64 32Z" fill="#2b2420"/>`); break;
      case "turban": parts.push(`<path d="M30 40 Q30 14 50 14 Q70 14 70 40 Q60 30 50 30 Q40 30 30 40Z" fill="${cloth}"/><path d="M34 34 Q50 20 66 34" stroke="${shade(cloth, 0.75)}" stroke-width="2" fill="none"/>`); break;
      case "headscarf": parts.push(`<path d="M31 44 Q31 20 50 20 Q69 20 69 44 Q66 30 50 30 Q34 30 31 44Z" fill="${cloth}"/><path d="M31 44 Q28 60 36 66 L38 50Z" fill="${cloth}"/>`); break;
      case "cap": parts.push(`<path d="M33 38 Q33 22 50 22 Q67 22 67 38 Q50 32 33 38Z" fill="${shade(cloth, 0.85)}"/><path d="M33 38 L26 40 Q45 36 50 38 Z" fill="${shade(cloth, 0.7)}"/>`); break;
      case "laurel": parts.push(`<path d="M33 40 Q30 28 40 24 M67 40 Q70 28 60 24" stroke="#5f8f4a" stroke-width="3.5" fill="none" stroke-linecap="round"/><circle cx="35" cy="33" r="2" fill="#7fb35f"/><circle cx="65" cy="33" r="2" fill="#7fb35f"/>`); break;
      case "veil": parts.push(`<path d="M30 40 Q30 20 50 20 Q70 20 70 40 L72 70 Q50 64 28 70Z" fill="${shade(cloth, 1.4)}" opacity=".6"/>`); break;
    }
    return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="portrait">
      <defs><clipPath id="${uid}"><circle cx="50" cy="50" r="47"/></clipPath></defs>
      <circle cx="50" cy="50" r="48" fill="#3a2718"/>
      <g clip-path="url(#${uid})">${parts.join("")}</g>
      <circle cx="50" cy="50" r="47.5" fill="none" stroke="${ring}" stroke-width="2"/>
      <circle cx="80" cy="80" r="12" fill="#1c1410" stroke="${ring}" stroke-width="1.5"/>
      <text x="80" y="84.5" text-anchor="middle" font-size="13">${p.symbol}</text>
    </svg>`;
  }

  return { portraitSVG, normPortrait };
})();
