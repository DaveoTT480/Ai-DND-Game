/* The Old Tavern - web client. Talks to the same server as the iPhone app. */
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const games = new Map();           // id -> latest snapshot
  let busy = false;
  let tone = "classic fantasy";

  const TONES = [
    ["classic fantasy", "Classic fantasy"], ["grimdark", "Grimdark"], ["lighthearted comedy", "Comedy"],
    ["gothic horror", "Gothic horror"], ["swashbuckling high seas", "High seas"], ["steampunk mystery", "Steampunk"], ["custom", "Custom..."],
  ];
  const EXAMPLES = [
    "A retired ship's cook with a cursed ladle and a grudge against the Admiralty. Cheerful, overweight, deadly with a cleaver.",
    "A young half-elf scholar who stole a forbidden book from her academy and is now hunted by her own professors. Brilliant, nervous, allergic to horses.",
    "A dwarven blacksmith who lost his forge to a dragon and swore never to make another weapon. He carries a hammer anyway.",
    "A street magician from the capital who can do one real spell and pretends the rest are also real. Charming, broke, owes money to a tiefling loan shark.",
    "An old knight, once famous, now forgotten, looking for one last deed worth a song. Her armour still fits. Mostly.",
  ];
  const FORGE_LINES = ["The Keeper sharpens a quill...", "Rolling for your strengths...", "Consulting the notice board...", "Writing your name in the ledger...", "Three tales are being chosen for you..."];
  const THINK_LINES = ["The Dungeon Master is thinking...", "Dice clatter behind the screen...", "Somewhere, a plot thickens...", "The candle gutters. The story turns..."];
  const ABILITIES = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
  const LONG = { STR: "Strength", DEX: "Dexterity", CON: "Constitution", INT: "Intelligence", WIS: "Wisdom", CHA: "Charisma" };
  const MOOD_COLOR = { calm: "var(--muted)", tense: "var(--ember)", mysterious: "var(--violet)", combat: "var(--blood)", triumphant: "var(--gold)", grim: "#8a8a92", festive: "#e6738c" };
  const ATT_COLOR = { friendly: "var(--moss)", neutral: "var(--muted)", suspicious: "var(--ember)", hostile: "var(--blood)" };

  // ---------- helpers ----------
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/(^|[^*])\*(?!\s)([^*\n]+?)\*(?!\*)/g, "$1<i>$2</i>").replace(/_(?!\s)([^_\n]+?)_/g, "<i>$1</i>")
    .split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
  const mod = (v) => Math.floor((v - 10) / 2);
  const fmtMod = (m) => (m >= 0 ? "+" : "") + m;
  const token = () => localStorage.getItem("tavernToken") || "";
  const standalone = () => window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

  function toast(msg, ms = 4000) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.remove("hidden");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.add("hidden"), ms);
  }

  async function api(path, method = "GET", body) {
    const headers = { accept: "application/json" };
    if (body) headers["content-type"] = "application/json";
    if (token()) headers.authorization = `Bearer ${token()}`;
    let res;
    try {
      res = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    } catch {
      throw new Error("Could not reach the tavern server.");
    }
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      openSettings("The server wants a tavern key.");
      throw new Error("Not signed in: enter the tavern key.");
    }
    if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
    return data;
  }

  function remember(game) {
    games.set(game.id, game);
    return game;
  }

  async function loadGame(id) {
    if (games.has(id)) return games.get(id);
    return remember((await api(`/api/games/${id}`)).game);
  }

  // ---------- routing ----------
  function go(hash) {
    if (location.hash === hash) render();
    else location.hash = hash;
  }

  async function render() {
    const [route, id] = location.hash.replace(/^#\/?/, "").split("/");
    for (const s of ["home", "forge", "pick", "play"]) $(s).classList.add("hidden");
    $("sheet").classList.add("hidden");
    try {
      if (route === "forge") {
        renderForge();
      } else if (route === "pick" && id) {
        const game = await loadGame(id);
        if (game.status !== "forged") return go(`#play/${id}`);
        renderPick(game);
      } else if (route === "play" && id) {
        renderPlay(await loadGame(id));
      } else {
        await renderHome();
      }
    } catch (e) {
      toast(e.message);
      if (route !== "" && route !== "home") go("#home");
      else $("home").classList.remove("hidden");
    }
  }

  // ---------- home ----------
  async function renderHome() {
    $("home").classList.remove("hidden");
    $("install-tip").classList.toggle("hidden", standalone());
    const box = $("tales");
    box.innerHTML = `<div class="card thinking"><div class="spinner"></div>Dusting off the ledgers...</div>`;
    let list;
    try {
      list = (await api("/api/games")).games;
    } catch (e) {
      box.innerHTML = `<div class="card error">${esc(e.message)}<br><button class="btn link" data-action="settings">Open settings</button></div>`;
      return;
    }
    if (!list.length) {
      box.innerHTML = `<div class="card meta">No tales yet. The bard is waiting for a hero.</div>`;
      return;
    }
    box.innerHTML = list.map((g) => {
      const glyph = g.status === "forged" ? "&#128220;" : g.status === "playing" ? "&#128214;" : "&#127941;";
      const where = g.status === "forged" ? "Ready to choose a tale"
        : g.status === "playing" ? `${esc(g.scenarioTitle || "An adventure")} - ${esc(g.location)}, turn ${g.turnCount}`
        : `${esc(g.scenarioTitle || "An adventure")} - concluded after ${g.turnCount} turns`;
      return `<div class="card" style="padding:0"><button class="tale card" style="margin:0;border:0;background:none" data-action="open" data-id="${g.id}">
        <span class="glyph">${glyph}</span>
        <span style="flex:1"><span class="name">${esc(g.characterName)}</span><br><span class="sub">${esc(g.race)} ${esc(g.characterClass)}, level ${g.level}</span><br><span class="where">${where}</span></span>
        <span class="chev">&#8250;</span></button>
        <button class="btn link" style="padding:0 14px 10px" data-action="delete" data-id="${g.id}">Delete</button></div>`;
    }).join("");
  }

  // ---------- forge ----------
  function renderForge() {
    $("forge").classList.remove("hidden");
    $("f-tones").innerHTML = TONES.map(([v, l]) => `<button class="chip ${tone === v ? "on" : ""}" data-action="tone" data-tone="${v}">${l}</button>`).join("");
    $("f-custom-tone").classList.toggle("hidden", tone !== "custom");
    $("f-error").classList.add("hidden");
  }

  async function forge() {
    const background = $("f-background").value.trim();
    const effectiveTone = tone === "custom" ? $("f-custom-tone").value.trim() : tone;
    if (background.length < 10) return showError("f-error", "Describe your character in at least a sentence.");
    if (!effectiveTone) return showError("f-error", "Name a tone for the tale.");
    await withBusy(FORGE_LINES, async () => {
      const { game } = await api("/api/games", "POST", { background, tone: effectiveTone, name: $("f-name").value.trim() });
      remember(game);
      $("f-background").value = "";
      $("f-name").value = "";
      go(`#pick/${game.id}`);
    }, (e) => showError("f-error", e.message));
  }

  function showError(id, msg) {
    const el = $(id);
    el.textContent = msg;
    el.classList.remove("hidden");
  }

  // ---------- pick ----------
  function renderPick(game) {
    $("pick").classList.remove("hidden");
    $("pick").dataset.id = game.id;
    const c = game.character;
    $("p-hero").innerHTML = `<div class="card accent">
      <h3 style="font-size:26px">${esc(c.name)}</h3>
      <div class="tagline" style="font-style:normal">${esc(c.race)} ${esc(c.characterClass)}, level ${c.level}</div>
      <div class="abilities">${ABILITIES.map((a) => `<div><small>${a}</small><b>${c.abilities[a]}</b></div>`).join("")}</div>
      <p style="margin:6px 0">${esc(c.appearance)}</p>
      <div class="narration" style="color:var(--parchment-dim)">${md(c.backstory)}</div>
      <div class="tagline">${esc(c.motivation)}</div>
    </div>`;
    $("p-scenarios").innerHTML = game.scenarios.map((s) => `<div class="card">
      <h3>${esc(s.title)}</h3>
      <div class="tagline">${esc(s.tagline)}</div>
      <p style="margin:6px 0;color:var(--parchment-dim)">${esc(s.synopsis)}</p>
      <div class="meta">&#128506; ${esc(s.setting)}</div>
      <button class="btn ember" data-action="start" data-id="${esc(s.id)}">Begin this tale</button>
    </div>`).join("");
    $("p-error").classList.add("hidden");
  }

  async function start(gameId, body) {
    await withBusy(THINK_LINES, async () => {
      const { game } = await api(`/api/games/${gameId}/start`, "POST", body);
      remember(game);
      $("p-custom").value = "";
      go(`#play/${game.id}`);
    }, (e) => showError("p-error", e.message));
  }

  // ---------- play ----------
  function renderPlay(game) {
    $("play").classList.remove("hidden");
    $("play").dataset.id = game.id;
    const low = game.hp * 3 <= game.character.maxHp;
    $("s-hp").innerHTML = `&#9829; ${game.hp}/${game.character.maxHp}`;
    $("s-hp").classList.toggle("low", low);
    $("s-gold").innerHTML = `<span style="color:var(--gold)">&#9679;</span> ${game.gold}`;
    $("s-lv").textContent = `Lv ${game.level}`;
    $("s-loc").textContent = game.location || "Somewhere";

    const over = game.status === "ended";
    const parts = [];
    if (game.scenario) parts.push(`<div class="tagline">${esc(game.scenario.tagline)}</div><div class="meta" style="margin-bottom:6px">${esc(game.scenario.setting)}</div>`);
    for (const t of game.turns) {
      if (t.action.kind !== "start") parts.push(`<div class="bubble">${esc(t.action.text)}</div>`);
      parts.push(renderScene(t.scene));
    }
    if (busy) {
      parts.push(`<div class="scene thinking"><div class="spinner"></div><span id="think-line">${THINK_LINES[0]}</span></div>`);
    } else {
      const last = game.turns.at(-1);
      if (last && last.scene.choices.length) {
        parts.push(`<div class="choices"><div class="section-label">What do you do?</div>${last.scene.choices.map((c) => `
          <button class="choice" data-action="choose" data-id="${esc(c.id)}">
            <span><span class="label">${esc(c.label)}</span><br><span class="hint">${esc(c.hint)}</span></span>
            ${c.check ? `<span class="check">&#127922;<br>${esc(c.check.skill || LONG[c.check.ability])} DC ${c.check.dc}</span>` : ""}
          </button>`).join("")}</div>`);
      }
      if (over) parts.push(`<button class="btn quiet" data-action="home">Return to the tavern</button><button class="btn ember" data-action="new">Begin a new adventure</button>`);
    }
    $("log").innerHTML = parts.join("");
    $("free").disabled = $("send").disabled = busy || over;
    $("free").placeholder = over ? "The tale has ended" : "Or do something else...";
    animateDice();
    requestAnimationFrame(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }));
  }

  function renderScene(s) {
    const d = s.diceResult;
    const ch = s.stateChange;
    const lines = [];
    if (ch.hpDelta < 0) lines.push(`<div class="hurt">&#128148; ${ch.hpDelta} hit points</div>`);
    if (ch.hpDelta > 0) lines.push(`<div class="heal">&#10084; +${ch.hpDelta} hit points</div>`);
    if (ch.goldDelta) lines.push(`<div class="gold">&#9679; ${ch.goldDelta > 0 ? "+" : ""}${ch.goldDelta} gold</div>`);
    if (ch.xpGained > 0) lines.push(`<div class="xp">&#9733; +${ch.xpGained} xp</div>`);
    for (const i of ch.itemsGained) lines.push(`<div class="item">&#127890; Gained ${esc(i.name)}${i.quantity > 1 ? ` x${i.quantity}` : ""}</div>`);
    for (const n of ch.itemsLost) lines.push(`<div class="quest">&#127890; Lost ${esc(n)}</div>`);
    for (const q of ch.questUpdates) lines.push(`<div class="quest">&#128220; ${esc(q)}</div>`);
    return `<div class="scene" style="border-color:${MOOD_COLOR[s.mood] || "var(--border)"}">
      <div class="head"><h3>${esc(s.chapterTitle)}</h3><span class="mood" style="color:${MOOD_COLOR[s.mood] || "var(--muted)"}">${esc(s.mood)}</span></div>
      ${d ? `<div class="dice ${d.success ? "ok" : "bad"}"><div class="d20"><span data-roll="${d.roll}">${d.roll}</span></div>
        <div><div class="what">${esc(d.skill || LONG[d.ability])} check</div><div class="math">${d.roll} ${d.modifier >= 0 ? "+" : "-"} ${Math.abs(d.modifier)} = ${d.total} vs DC ${d.dc}</div></div>
        <div class="verdict">${d.roll === 20 ? "Critical!" : d.roll === 1 ? "Fumble!" : d.success ? "Success" : "Failure"}</div></div>` : ""}
      <div class="narration">${md(s.narration)}</div>
      ${s.npcs.length ? `<div>${s.npcs.map((n) => `<span class="tag"><span class="dot" style="background:${ATT_COLOR[n.attitude] || "var(--muted)"}"></span>${esc(n.name)}, ${esc(n.role)}</span>`).join("")}</div>` : ""}
      ${lines.length ? `<div class="changes">${lines.join("")}</div>` : ""}
      ${s.ending ? `<div class="ending ${s.ending.victory ? "win" : "lose"}"><h4>${s.ending.victory ? "Victory" : "The End"}</h4><div class="narration">${md(s.ending.epilogue)}</div></div>` : ""}
    </div>`;
  }

  function animateDice() {
    // Only the newest die tumbles; older ones sit still.
    const dice = document.querySelectorAll("[data-roll]");
    const last = dice[dice.length - 1];
    if (!last || last.dataset.done) return;
    for (const d of dice) d.dataset.done = "1";
    let n = 0;
    const timer = setInterval(() => {
      last.textContent = 1 + Math.floor(Math.random() * 20);
      if (++n >= 7) { clearInterval(timer); last.textContent = last.dataset.roll; }
    }, 70);
  }

  async function act(gameId, body) {
    if (busy) return;
    busy = true;
    const game = games.get(gameId);
    renderPlay(game);
    const ticker = rotate("think-line", THINK_LINES, 4000);
    try {
      const { game: next } = await api(`/api/games/${gameId}/turn`, "POST", body);
      remember(next);
      $("free").value = "";
      if (navigator.vibrate) navigator.vibrate(15);
    } catch (e) {
      toast(e.message, 6000);
    } finally {
      clearInterval(ticker);
      busy = false;
      renderPlay(games.get(gameId));
    }
  }

  function rotate(id, lines, ms) {
    let i = 0;
    return setInterval(() => { const el = $(id); if (el) el.textContent = lines[(i = (i + 1) % lines.length)]; }, ms);
  }

  async function withBusy(lines, fn, onError) {
    if (busy) return;
    busy = true;
    $("busy").classList.remove("hidden");
    $("busy-line").textContent = lines[0];
    const ticker = rotate("busy-line", lines, 3000);
    try {
      await fn();
    } catch (e) {
      onError ? onError(e) : toast(e.message);
    } finally {
      clearInterval(ticker);
      busy = false;
      $("busy").classList.add("hidden");
    }
  }

  // ---------- character sheet ----------
  function openSheet(game) {
    const c = game.character;
    const chips = (items, color) => items.length ? items.map((t) => `<span class="tag" style="border-color:${color}">${esc(t)}</span>`).join("") : `<span class="meta">none</span>`;
    $("sheet-body").innerHTML = `
      <h1 style="margin-top:12px">${esc(c.name)}</h1>
      <div class="tagline" style="font-style:normal">${esc(c.race)} ${esc(c.characterClass)}, level ${game.level}</div>
      <div class="meta">${esc(c.appearance)}</div>
      <div class="vitals">
        <div><b style="color:${game.hp * 3 <= c.maxHp ? "var(--blood)" : "var(--moss)"}">${game.hp}/${c.maxHp}</b><small>Hit points</small></div>
        <div><b>${c.armorClass}</b><small>Armour</small></div>
        <div><b style="color:var(--gold)">${game.gold}</b><small>Gold</small></div>
        <div><b style="color:var(--ember)">${game.xp}</b><small>XP</small></div>
      </div>
      <div class="section-label">Abilities</div>
      <div class="sheet-grid">${ABILITIES.map((a) => `<div><small>${LONG[a]}</small><b>${c.abilities[a]}</b><span class="mod">${fmtMod(mod(c.abilities[a]))}</span></div>`).join("")}</div>
      <div class="section-label">Proficient skills</div>${chips(c.proficientSkills, "var(--ember)")}
      <div class="section-label">Traits</div>${chips(c.traits, "var(--border)")}
      ${game.statusEffects.length ? `<div class="section-label">Conditions</div>${chips(game.statusEffects, "var(--blood)")}` : ""}
      <div class="section-label">Inventory</div>
      <div class="card">${game.inventory.length ? game.inventory.map((i) => `<div class="row" style="align-items:flex-start;margin:4px 0"><span>${esc(i.name)}${i.quantity > 1 ? ` x${i.quantity}` : ""}</span><span class="meta" style="text-align:right">${esc(i.description)}</span></div>`).join("") : `<span class="meta">Empty pockets.</span>`}</div>
      <div class="section-label">Quest log</div>
      <div class="card">${game.quests.length ? game.quests.map((q) => `<div>&#128220; ${esc(q)}</div>`).join("") : `<span class="meta">Nothing written yet.</span>`}</div>
      <div class="section-label">People met</div>
      <div class="card">${game.npcsMet.length ? game.npcsMet.map((n) => `<div style="margin:6px 0"><b>${esc(n.name)}</b> <span style="font-size:12px;color:${ATT_COLOR[n.attitude] || "var(--muted)"}">${esc(n.attitude)}</span><br><span class="meta">${esc(n.role)}. ${esc(n.description)}</span></div>`).join("") : `<span class="meta">No one yet.</span>`}</div>
      <div class="section-label">Backstory</div>
      <div class="narration" style="color:var(--parchment-dim)">${md(c.backstory)}</div>
      <div class="tagline">${esc(c.motivation)}</div>`;
    $("sheet").classList.remove("hidden");
    $("sheet").scrollTop = 0;
  }

  // ---------- settings ----------
  function openSettings(msg = "") {
    $("token").value = token();
    $("settings-msg").textContent = msg;
    $("settings").classList.remove("hidden");
  }

  // ---------- events ----------
  document.addEventListener("click", async (ev) => {
    const el = ev.target.closest("[data-action]");
    if (!el) return;
    const action = el.dataset.action;
    const gameId = $("play").dataset.id || $("pick").dataset.id;
    switch (action) {
      case "home": ev.stopPropagation(); go("#home"); break;
      case "new": go("#forge"); break;
      case "settings": openSettings(); break;
      case "close-settings": $("settings").classList.add("hidden"); break;
      case "save-settings":
        localStorage.setItem("tavernToken", $("token").value.trim());
        $("settings").classList.add("hidden");
        render();
        break;
      case "open": go(`#pick/${el.dataset.id}`); break;
      case "delete":
        if (!confirm("Delete this tale for good?")) return;
        try { await api(`/api/games/${el.dataset.id}`, "DELETE"); games.delete(el.dataset.id); renderHome(); } catch (e) { toast(e.message); }
        break;
      case "example": $("f-background").value = EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)]; break;
      case "tone": tone = el.dataset.tone; renderForge(); break;
      case "forge": forge(); break;
      case "start": start($("pick").dataset.id, { scenarioId: el.dataset.id }); break;
      case "start-custom": {
        const text = $("p-custom").value.trim();
        if (text.length < 10) return showError("p-error", "Give your tale at least a sentence.");
        start($("pick").dataset.id, { customScenario: text });
        break;
      }
      case "choose": act($("play").dataset.id, { choiceId: el.dataset.id }); break;
      case "send": {
        const text = $("free").value.trim();
        if (text) act($("play").dataset.id, { freeText: text });
        break;
      }
      case "sheet": {
        const game = games.get(gameId);
        if (game) openSheet(game);
        break;
      }
      case "close-sheet": $("sheet").classList.add("hidden"); break;
    }
  });

  $("free").addEventListener("input", (e) => {
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  });
  $("free").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("send").click(); }
  });

  window.addEventListener("hashchange", render);
  render();
})();
