# The Old Tavern - an AI Dungeon Master for iPhone

A solo, Dungeons & Dragons-style adventure game for iPhone. You describe your character in
a few sentences; the Keeper of the Old Tavern turns that into a full character sheet and three
adventures written for that hero. Then Claude plays Dungeon Master: it narrates every scene,
voices the people you meet, tracks your hit points, gold and quests, offers three or four
choices each turn, and lets you type your own idea instead. Dice are rolled by the server and
the Dungeon Master honours the result.

Inspired by the "walk into a tavern, become someone, see what happens" feel of
[Old Greg's Tavern](https://www.oldgregstavern.com).

```
+-------------------+        HTTPS/JSON        +-----------------------+       Claude API
|  iPhone app       |  <-------------------->  |  Node game server     |  <------------------>  claude-opus-5
|  SwiftUI, iOS 17  |                          |  TypeScript + Hono    |   structured outputs
+-------------------+                          +-----------------------+
     ios/                                            server/
```

The API key never leaves the server. The app only ever talks to the game server.

## What is in the box

| Path | What it is |
|---|---|
| `server/` | The game engine and AI Dungeon Master. Node 20+, TypeScript, Hono, the official Anthropic SDK. |
| `server/src/prompts.ts` | The Dungeon Master's rules. Edit this to change how the game feels. |
| `server/src/eras.ts` | The era catalogue and briefings: real people, places, events and currency per era. Add your own here. |
| `server/src/schemas.ts` | The structured-output contract: character sheet, scenarios, scenes, choices, dice, state changes. |
| `server/src/engine.ts` | Turn logic: server-side dice, hit points, inventory, quests, levelling, history trimming. |
| `server/public/` | The mobile web app: play on iPhone with no Mac by adding it to the home screen. |
| `server/api/index.ts`, `server/vercel.json` | Vercel deployment: one serverless function plus Vercel Blob for saves. |
| `ios/` | The SwiftUI iPhone app. Open `ios/OldTavern.xcodeproj` in Xcode 16 or newer. |
| `artifact/old-tavern.html` | The game as one claude.ai Artifact page: Claude as Dungeon Master on your own subscription, no server. |

## 1. Run the server

```bash
cd server
npm install
cp .env.example .env        # put your ANTHROPIC_API_KEY in it, or export it in your shell
set -a; source .env; set +a
npm run dev                 # http://localhost:8787
```

Open http://localhost:8787 in a browser to play from your Mac (or from a phone on the same
Wi-Fi, using your computer's local address).

No API key yet? `DM_MOCK=1 npm run dev` runs a scripted Dungeon Master so you can exercise
the app end to end.

Environment variables (see `server/.env.example`):

| Variable | Default | Meaning |
|---|---|---|
| `ANTHROPIC_API_KEY` | | Required unless `DM_MOCK=1`. The SDK also picks up an `ant auth login` profile. |
| `DM_MODEL` | `claude-opus-5` | Model that plays Dungeon Master. |
| `DM_EFFORT` | `medium` | Reasoning effort per turn. `low` is faster and cheaper; `high` is more careful. |
| `GAME_API_TOKEN` | | Shared secret; clients send `Authorization: Bearer <token>`. Optional locally, required on Vercel (the server fails closed without it). |
| `OPENAI_API_KEY` | | Optional. Enables painted portraits from `gpt-image-1` at forge time. |
| `IMAGE_PROVIDER` | `openai` if a key is set, else `none` | Image provider for portraits. |
| `IMAGE_MODEL`, `IMAGE_QUALITY` | `gpt-image-1`, `medium` | Portrait model and quality. |
| `DM_DAILY_CALL_LIMIT` | 300 on Vercel, unlimited locally | Maximum model calls per UTC day; 429 after that. `0` disables the cap. |
| `REQUIRE_API_TOKEN` | `0` | Set to `1` to fail closed without a token even for local runs. |
| `DATA_DIR` | `./data` | Saved adventures, one JSON file each (local runs). |
| `BLOB_READ_WRITE_TOKEN` | | Injected by Vercel when a Blob store is connected; switches saves to Vercel Blob. |
| `PORT` | `8787` | Listen port. |

Tests and typecheck:

```bash
npm test
npm run typecheck
```

## 0. The no-setup way: play inside Claude on your subscription

`artifact/old-tavern.html` is the whole game as a single claude.ai Artifact page. Published
from Claude Code, it asks Claude for each turn through the artifact runtime's `sample`
capability, which runs on the viewer's own Claude account. No API key, no server, no Vercel,
no token: open the artifact in the Claude app on your phone and play. Saved tales go to the
artifact's private per-viewer database (with a browser-only fallback), so they follow you
between devices. The first turn asks your permission to use Claude on this page.

The server-and-app route below is for running the game outside Claude, on an API key.

## 2. Play on your iPhone without a Mac (web app)

The server also serves a full mobile web version of the game at its root URL, with the same
character forge, scenario picker, story view, dice, choices, free-text actions and character
sheet as the native app. Once the server is deployed (section 3), you need nothing else:

1. Open `https://<your-project>.vercel.app` in Safari on the iPhone.
2. Tap the gear, paste your `GAME_API_TOKEN`, save. The key stays on the phone.
3. Tap Share, then **Add to Home Screen**. The tavern gets its own icon and opens
   full-screen like an app, no App Store or Xcode involved.

The web app lives in `server/public/` (plain HTML, CSS and JavaScript, no build step). The
native SwiftUI app in `ios/` is the nicer experience if you do have a Mac, and both share the
same server and saved tales, so you can switch between them.

If you want the native app on a phone without owning a Mac, the remaining routes are a cloud
Mac build service (Xcode Cloud, Codemagic, Bitrise) delivering through TestFlight, which needs
an Apple Developer account, or renting a cloud Mac. The web app is the practical answer.

## 2b. Run the iPhone app from Xcode

1. Open `ios/OldTavern.xcodeproj` in Xcode 16 or newer (the project uses Xcode 16's
   folder-synchronised groups, so any Swift file you add under `ios/OldTavern` is picked up
   automatically). If you prefer, `ios/project.yml` regenerates the same project with
   [XcodeGen](https://github.com/yonaskolb/XcodeGen).
2. Select the OldTavern target, set your team under Signing & Capabilities, and run on the
   simulator or your iPhone.
3. In the app, tap the gear and set the server address:
   - Simulator: `http://localhost:8787` (the default).
   - A real iPhone on the same Wi-Fi: `http://<your Mac's LAN IP>:8787`. `Info.plist` already
     allows local-network HTTP for development.
   - Anywhere else: deploy to Vercel (next section) or any HTTPS host, and set
     `GAME_API_TOKEN` on both sides.

## 3. Deploy the server to Vercel

The server runs as a single Vercel function (`server/api/index.ts`) with saved adventures in
Vercel Blob. The iPhone app then talks to `https://<your-project>.vercel.app` from anywhere.

1. Push this repository to GitHub (already done if you are reading this on GitHub).
2. In Vercel, **Add New Project**, import the repo, and set **Root Directory** to `server`.
   Leave the framework preset as "Other"; `server/vercel.json` supplies the build settings.
3. Under **Environment Variables**, add:
   - `ANTHROPIC_API_KEY` - your Anthropic key.
   - `GAME_API_TOKEN` - a long random string (`openssl rand -base64 32`). On Vercel the
     server refuses every request until this is set. Put the same value in the app's Settings.
   - Optional: `DM_MODEL`, `DM_EFFORT`, `DM_DAILY_CALL_LIMIT` (see "Keeping it private").
4. **Storage** tab, **Create Database**, choose **Blob**, and connect it to the project. Vercel
   injects `BLOB_READ_WRITE_TOKEN`; the server detects it and stores each adventure as a
   private JSON blob under `games/`. Without a Blob store, saves only last while the function
   instance stays warm.
5. Deploy. Check `https://<your-project>.vercel.app/health` returns `{"ok":true}`, then open the
   root URL on your phone: that is the web app (section 2).
6. In the iPhone app, tap the gear, set the server to `https://<your-project>.vercel.app` and
   paste the token. Since it is https, no local-network exceptions are involved.

From the command line instead of the dashboard:

```bash
cd server
npx vercel link            # pick or create the project, root directory is this folder
npx vercel env add ANTHROPIC_API_KEY
npx vercel env add GAME_API_TOKEN
npx vercel blob store add old-tavern   # then connect it to the project in the dashboard
npx vercel deploy --prod
```

### Keeping it private

The URL is reachable from the internet, but nothing behind it can spend your API credits
without the token. Four layers, from the app outwards:

1. **The token is mandatory on Vercel.** With no `GAME_API_TOKEN` the server answers every
   `/api` request with 503 and never calls the model. With a token, requests must carry
   `Authorization: Bearer <token>`; the comparison is constant-time. Only your phone (and
   anyone you hand the token to) can play. Treat it like a password: don't paste it in
   screenshots, and rotate it in Vercel if a phone is lost.
2. **Daily spend cap.** `DM_DAILY_CALL_LIMIT` caps model calls per UTC day across all games
   (default 300 on Vercel, roughly ten long play sessions). When it is hit, the server returns
   429 "the tavern has closed for the night" and stops calling the model until tomorrow, even
   with a valid token. `GET /api/usage` shows today's count. Set it lower if you like.
3. **Anthropic spend limit.** In the Anthropic Console, set a monthly spend limit for the
   organisation or workspace, and give this project its own API key so you can revoke it
   without touching anything else. This is the hard ceiling no bug can cross.
4. **Vercel usage alerts.** Vercel's Hobby plan has fixed function limits and lets you set
   usage notifications; Pro lets you set a spend cap.

If you would rather not have a public URL at all, skip Vercel: run the server on your Mac and
play over Wi-Fi, or put your Mac and phone on a private network such as Tailscale and point
the app at the Mac's Tailscale address. Nothing in the server depends on Vercel.

Notes:

- Story turns can take 20 to 90 seconds. `vercel.json` and the function set `maxDuration` to
  300 seconds, the Hobby plan's ceiling. If your plan allows less, lower `DM_EFFORT` to `low`.
- Redeploying does not lose adventures; they live in Blob, not on the function.
- `npx vercel build` in `server/` reproduces the production bundle locally.

## How a game plays

1. **When and who.** Pick an era first: Classic Fantasy, Ancient Egypt (1275 BC), Classical
   Greece (431 BC), Imperial Rome (63 BC), the Viking Age (866), Sengoku Japan (1560), the
   Golden Age of Piracy (1717), the Wild West (1878), Victorian London (1888), World War II
   (occupied France, 1943), the Cold War (Berlin, 1961), a Game of Thrones-style Warring
   Thrones world, or name your own time and place. Each era is pinned to one year and comes
   with a briefing for the Keeper: the real rulers, spies, poets, outlaws and warlords alive
   that year, the real places, the money, the technology, and how much of the supernatural is
   allowed. Then type a name (optional), a background in your own words, and pick a tone
   (classic fantasy, grimdark, comedy, gothic horror, high seas, steampunk, or your own).
2. **Forge.** One Claude call returns a full character sheet fitted to the era (period roles
   instead of fantasy classes, period gear and money, a polished backstory), the Keeper's
   research notes (four to six real people, places or events of that year and how they touch
   this hero), and three scenarios that each draw on that research. You can also write your
   own scenario. Not feeling any of the three? "Show me three other tales" asks the Keeper for
   three new ones, told which premises you passed on so it never repeats them.
3. **Play.** The Dungeon Master is held to the era: at least one documented person from the
   briefing appears within the first three turns, real figures are tagged as historical in
   play, money is counted in the era's currency, and anachronisms are forbidden. Each turn
   returns a scene: title, narration, any dice result, newly met NPCs, a state change (hit points, gold, xp, items, quest log, location,
   conditions), a one-line recap, a mood, and three or four choices. Pick one or type what you
   do instead.
4. **Portrait, inventory, chronicle.** The Keeper describes the hero's look in fixed choices
   (skin, hair, headwear, clothing, an emoji for their trade) and the game draws a lit, shaded
   bust from it, shown on the home list, the status bar and the sheet. For a real painted
   portrait in the style of Old Greg's Tavern, see "Painted portraits" below. The backpack button
   opens the inventory: what you carry, with Use, Examine and Drop, plus "Nearby" objects the
   Dungeon Master says you could pick up right now, with a Take button. The character sheet
   ends with a chronicle of every chapter so far, each one expandable to reread in full.
5. **Dice.** Choices can carry a skill check (ability, skill, DC). The server rolls a d20, adds
   the hero's modifier and proficiency, and tells the Dungeon Master the result, which it must
   honour. Free-text actions get a "fate die" the Dungeon Master may use if the action is
   risky. Natural 20 and natural 1 are criticals.
6. **The end.** When the central conflict resolves, or the hero dies, the Dungeon Master writes
   an epilogue and the tale is marked finished. Saved tales live on the server and appear on the
   tavern's home screen.

## Painted portraits

Anthropic's models write text; they do not generate images. Two ways to get a painted
portrait anyway:

- **Server route (automatic).** Set `OPENAI_API_KEY` on the server (locally or in Vercel) and
  every forged hero gets a portrait from OpenAI's `gpt-image-1`: an oil-painting bust with warm
  rim light on a dark smoky ground, period-accurate to the era, built from the Keeper's
  description. It costs a few cents per hero, is stored beside the save (on disk locally, in
  Vercel Blob when deployed) and served at `GET /api/games/:id/portrait`. The web app and iOS
  app show it in place of the drawn bust. `IMAGE_MODEL` and `IMAGE_QUALITY` (`low`, `medium`,
  `high`) tune it; `IMAGE_PROVIDER=none` turns it off. A hero forged before the key was set,
  or whose painting failed, has a "Paint a portrait" button on the tale screen
  (`POST /api/games/:id/portrait`). In mock mode a placeholder image stands in. Other providers can be added in
  `server/src/images.ts`; the interface is one function that returns JPEG bytes.
- **Artifact route (manual).** The claude.ai Artifact cannot reach an image model, so its
  "Get a painted portrait" button gives you a ready-made prompt in the same style. Paste it
  into any image generator, save the result, and upload it on the same screen. The upload
  is stored with the artifact and replaces the drawn portrait everywhere.

## API

All game endpoints are under `/api` and return JSON. With `GAME_API_TOKEN` set, send
`Authorization: Bearer <token>`.

| Method | Path | Body | Returns |
|---|---|---|---|
| `GET` | `/health` | | `{ ok: true }` |
| `GET` | `/api/usage` | | `{ used, limit }` model calls today |
| `GET` | `/api/eras` | | `{ eras: [...] }` the era catalogue |
| `GET` | `/api/games/:id/portrait` | | JPEG painted portrait, or 404 when none was generated |
| `GET` | `/api/games` | | `{ games: GameSummary[] }` |
| `POST` | `/api/games` | `{ background, tone?, name?, eraId?, customEra? }` | `{ game }` with `status: "forged"`, character and scenarios |
| `GET` | `/api/games/:id` | | `{ game }` |
| `POST` | `/api/games/:id/reroll` | | `{ game }` with three new scenarios |
| `POST` | `/api/games/:id/start` | `{ scenarioId }` or `{ customScenario }` | `{ game, scene }` |
| `POST` | `/api/games/:id/turn` | `{ choiceId }` or `{ freeText }` | `{ game, scene }` |
| `DELETE` | `/api/games/:id` | | `{ ok: true }` |

Errors are `{ error: "message" }` with a meaningful status (400 validation, 404 unknown game,
409 wrong game state, 422 the model declined to continue that thread, 429 rate limited).

## How the AI side works

- **Structured outputs.** Every model call uses `client.beta.messages.parse` with a Zod schema
  (`server/src/schemas.ts`), so the Dungeon Master's answer is always valid JSON the engine and
  app can trust.
- **Stable prompt, cached.** The system prompt (rules + character + scenario) is fixed for the
  life of a game and marked for prompt caching; anything that changes each turn (state, dice,
  the player's action) goes in the last user message. Past turns are replayed as
  action/scene pairs so the cached prefix grows incrementally.
- **Bounded context.** The last 14 turns are replayed verbatim; older turns are folded into
  one-line recaps written by the Dungeon Master itself.
- **Server-authoritative state.** Hit points, gold, inventory, xp and levels are computed by
  the engine from the state change the model reports, clamped and validated. A hero at 0 hit
  points ends the tale even if the model forgets to say so.
- **Refusal fallback.** Requests opt into the API's `fallbacks: "default"` so a rare policy
  decline is retried server-side on another model instead of breaking the game.

## Ideas for next steps

- Streaming narration token by token into the app.
- Scene illustrations generated from the narration.
- Party play: two phones, one tavern.
- Push the saved tales to iCloud so they survive a server reset.
