  // ------------------------------------------------------------------
  // Pixel busts: a 20x24 sprite of a person, built from the same fixed
  // choices the Keeper uses for the hero, in the style of the item sprites.
  // ------------------------------------------------------------------
  const BUST_W = 20, BUST_H = 24;
  function pixelBust(p) {
    p = normPortrait(p);
    const g = Array.from({ length: BUST_H }, () => Array(BUST_W).fill(null));
    const put = (x, y, c) => { if (x >= 0 && x < BUST_W && y >= 0 && y < BUST_H && c) g[y][x] = c; };
    const span = (x0, x1, y, c) => { for (let x = x0; x <= x1; x++) put(x, y, c); };
    const box = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) span(x0, x1, y, c); };
    const skin = P.skin[p.skin], skinD = shade(skin, 0.78), skinL = shade(skin, 1.08);
    const hair = p.hair === "none" ? null : P.hair[p.hair];
    const hairD = hair ? shade(hair, 0.7) : null;
    const fh = hair || "#553520";
    const cloth = P.clothing[p.clothing], clothD = shade(cloth, 0.7), clothL = shade(cloth, 1.2);
    const iris = P.eyes[p.eyes];
    const hairOn = hair && p.hairStyle !== "bald";
    const long = hairOn && (p.hairStyle === "long" || p.hairStyle === "braided");

    // hair behind the head
    if (long) { box(3, 7, 4, 17, hairD); box(15, 7, 16, 17, hairD); span(3, 4, 18, hairD); span(15, 16, 18, hairD); }
    if (hairOn && p.hairStyle === "braided") { for (let y = 12; y <= 20; y++) { put(4, y, y % 2 ? hair : hairD); put(15, y, y % 2 ? hair : hairD); } }
    // shoulders and neck
    box(3, 19, 16, 23, cloth); span(5, 14, 18, cloth); span(3, 4, 19, clothD); span(15, 16, 19, clothD);
    box(3, 21, 4, 23, clothD); box(15, 21, 16, 23, clothD); span(8, 11, 18, clothL); span(9, 10, 19, clothL);
    box(8, 16, 11, 17, skinD);
    // head
    span(6, 13, 5, skin); span(5, 14, 6, skin); box(4, 7, 15, 13, skin); span(5, 14, 14, skin); span(6, 13, 15, skin); span(7, 12, 16, skin);
    span(7, 12, 6, skinL); put(5, 8, skinL); put(5, 9, skinL);
    put(3, 10, skin); put(3, 11, skin); put(16, 10, skin); put(16, 11, skin); // ears
    // eyes, brows, nose, mouth
    put(7, 10, "#f4f1ea"); put(8, 10, iris); put(11, 10, iris); put(12, 10, "#f4f1ea");
    const brow = hair ? hairD : skinD;
    span(7, 8, 9, brow); span(11, 12, 9, brow);
    put(10, 12, skinD); put(9, 12, skinD);
    span(8, 11, 14, mix(skinD, "#a04a48", 0.45));
    if (p.age === "old") { put(5, 12, skinD); put(14, 12, skinD); put(6, 15, skinD); put(13, 15, skinD); }
    if (p.scar) { put(13, 8, skinD); put(13, 9, skinD); put(14, 10, skinD); }
    // facial hair
    if (p.facialHair === "stubble") { for (let y = 13; y <= 16; y++) for (let x = 5; x <= 14; x++) if (g[y][x] === skin && (x + y) % 2 === 0) put(x, y, mix(skin, fh, 0.35)); }
    if (p.facialHair === "moustache" || p.facialHair === "fullbeard") { span(7, 12, 13, fh); put(6, 13, fh); put(13, 13, fh); }
    if (p.facialHair === "beard") { span(5, 6, 14, fh); span(13, 14, 14, fh); span(5, 14, 15, fh); span(6, 13, 16, fh); span(7, 12, 17, fh); }
    if (p.facialHair === "fullbeard") { span(4, 6, 12, fh); span(13, 15, 12, fh); span(4, 6, 13, fh); span(13, 15, 13, fh); span(4, 7, 14, fh); span(12, 15, 14, fh); span(5, 14, 15, fh); span(5, 14, 16, fh); span(6, 13, 17, fh); span(7, 12, 18, fh); }
    // hair on top
    if (hairOn) {
      span(7, 12, 3, hair); span(5, 14, 4, hair); span(4, 15, 5, hair); span(4, 15, 6, hair);
      put(4, 7, hair); put(15, 7, hair); put(4, 8, hair); put(15, 8, hair);
      span(6, 9, 3, shade(hair, 1.25));
      if (p.hairStyle === "curly") { put(6, 2, hair); put(8, 2, hair); put(11, 2, hair); put(13, 2, hair); put(3, 7, hair); put(16, 7, hair); put(3, 9, hair); put(16, 9, hair); put(3, 11, hair); put(16, 11, hair); }
      if (p.hairStyle === "topknot") { box(8, 1, 11, 2, hair); span(9, 10, 0, hairD); }
    }
    // headwear
    const grey = "#8a8f96", greyD = "#5c6167", gold = "#e0b446", goldD = "#a77f22";
    switch (p.headwear) {
      case "hood": box(5, 2, 14, 4, clothD); box(3, 5, 4, 17, clothD); box(15, 5, 16, 17, clothD); span(6, 13, 2, cloth); span(3, 5, 18, clothD); span(14, 16, 18, clothD); span(4, 15, 5, clothD); break;
      case "helmet": span(7, 12, 2, grey); span(5, 14, 3, grey); box(4, 4, 15, 7, grey); span(4, 15, 7, greyD); box(9, 8, 10, 12, greyD); put(4, 8, greyD); put(15, 8, greyD); span(6, 9, 3, "#b7bcc2"); break;
      case "crown": for (const x of [5, 7, 9, 10, 12, 14]) put(x, 3, gold); span(5, 14, 4, gold); span(5, 14, 5, goldD); put(9, 3, "#e8544f"); put(10, 3, "#e8544f"); break;
      case "hat": span(2, 17, 6, "#1f1a17"); box(6, 1, 13, 5, "#2b2420"); span(6, 5, 13, "#3b3128"); span(7, 1, 12, "#3b3128"); break;
      case "turban": span(7, 12, 2, cloth); span(5, 14, 3, cloth); box(4, 4, 15, 7, cloth); span(4, 15, 5, clothD); span(6, 9, 3, clothL); put(4, 8, clothD); put(15, 8, clothD); break;
      case "headscarf": box(4, 3, 15, 6, cloth); box(3, 7, 4, 16, cloth); box(15, 7, 16, 16, cloth); span(3, 5, 17, clothD); span(4, 15, 6, clothD); span(6, 13, 3, clothL); break;
      case "cap": box(5, 3, 14, 5, clothD); span(2, 14, 6, shade(cloth, 0.55)); span(6, 13, 3, cloth); break;
      case "laurel": for (const [x, y] of [[4, 6], [5, 5], [6, 5], [13, 5], [14, 5], [15, 6], [4, 7], [15, 7]]) put(x, y, "#5f8f4a"); put(5, 6, "#7fb35f"); put(14, 6, "#7fb35f"); break;
      case "veil": { const v = mix(cloth, "#ffffff", 0.35); box(5, 3, 14, 4, v); box(3, 5, 4, 16, v); box(15, 5, 16, 16, v); span(3, 5, 17, v); span(14, 16, 17, v); break; }
    }
    return g;
  }
  function bustSVG(p, size = 56, ring = null) {
    const g = pixelBust(p);
    const outline = "#120d0a";
    const rects = [];
    for (let y = 0; y < BUST_H; y++) for (let x = 0; x < BUST_W; x++) {
      if (g[y][x]) continue;
      // outline: an empty pixel touching a filled one
      if ((g[y - 1] && g[y - 1][x]) || (g[y + 1] && g[y + 1][x]) || g[y][x - 1] || g[y][x + 1]) rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${outline}"/>`);
    }
    for (let y = 0; y < BUST_H; y++) for (let x = 0; x < BUST_W; x++) if (g[y][x]) rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${g[y][x]}"/>`);
    const h = Math.round(size * BUST_H / BUST_W);
    const frame = ring ? `<rect x="0.5" y="0.5" width="${BUST_W - 1}" height="${BUST_H - 1}" fill="none" stroke="${ring}" stroke-width="1"/>` : "";
    return `<svg viewBox="0 0 ${BUST_W} ${BUST_H}" width="${size}" height="${h}" shape-rendering="crispEdges" role="img" aria-label="portrait"><rect width="${BUST_W}" height="${BUST_H}" fill="#0f0c0a"/>${rects.join("")}${frame}</svg>`;
  }
