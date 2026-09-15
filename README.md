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
| `server/src/schemas.ts` | The structured-output contract: character sheet, scenarios, scenes, choices, dice, state changes. |
| `server/src/engine.ts` | Turn logic: server-side dice, hit points, inventory, quests, levelling, history trimming. |
| `server/public/index.html` | A tiny browser page for play-testing the server without Xcode. |
| `ios/` | The SwiftUI iPhone app. Open `ios/OldTavern.xcodeproj` in Xcode 16 or newer. |

## 1. Run the server

```bash
cd server
npm install
cp .env.example .env        # put your ANTHROPIC_API_KEY in it, or export it in your shell
set -a; source .env; set +a
npm run dev                 # http://localhost:8787
```

Open http://localhost:8787 in a browser to play-test from your Mac.

No API key yet? `DM_MOCK=1 npm run dev` runs a scripted Dungeon Master so you can exercise
the app end to end.

Environment variables (see `server/.env.example`):

| Variable | Default | Meaning |
|---|---|---|
| `ANTHROPIC_API_KEY` | | Required unless `DM_MOCK=1`. The SDK also picks up an `ant auth login` profile. |
| `DM_MODEL` | `claude-opus-5` | Model that plays Dungeon Master. |
| `DM_EFFORT` | `medium` | Reasoning effort per turn. `low` is faster and cheaper; `high` is more careful. |
| `GAME_API_TOKEN` | | Optional shared secret. Clients must send `Authorization: Bearer <token>`. Set this before exposing the server to the internet. |
| `DATA_DIR` | `./data` | Saved adventures, one JSON file each. |
| `PORT` | `8787` | Listen port. |

Tests and typecheck:

```bash
npm test
npm run typecheck
```

## 2. Run the iPhone app

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
   - Anywhere else: deploy the server behind HTTPS (Fly.io, Render, Railway, a VPS with Caddy)
     and set `GAME_API_TOKEN` on both sides.

## How a game plays

1. **Who walks in?** Type a name (optional), a background in your own words, and pick a tone
   (classic fantasy, grimdark, comedy, gothic horror, high seas, steampunk, or your own).
2. **Forge.** One Claude call returns a full character sheet (race, class, ability scores, hit
   points, skills, traits, gear, a polished backstory) and three scenarios: one grown from the
   backstory, one open-world hook, one with a twist. You can also write your own scenario.
3. **Play.** Each turn the Dungeon Master returns a scene: title, narration, any dice result,
   newly met NPCs, a state change (hit points, gold, xp, items, quest log, location,
   conditions), a one-line recap, a mood, and three or four choices. Pick one or type what you
   do instead.
4. **Dice.** Choices can carry a skill check (ability, skill, DC). The server rolls a d20, adds
   the hero's modifier and proficiency, and tells the Dungeon Master the result, which it must
   honour. Free-text actions get a "fate die" the Dungeon Master may use if the action is
   risky. Natural 20 and natural 1 are criticals.
5. **The end.** When the central conflict resolves, or the hero dies, the Dungeon Master writes
   an epilogue and the tale is marked finished. Saved tales live on the server and appear on the
   tavern's home screen.

## API

All game endpoints are under `/api` and return JSON. With `GAME_API_TOKEN` set, send
`Authorization: Bearer <token>`.

| Method | Path | Body | Returns |
|---|---|---|---|
| `GET` | `/health` | | `{ ok: true }` |
| `GET` | `/api/games` | | `{ games: GameSummary[] }` |
| `POST` | `/api/games` | `{ background, tone?, name? }` | `{ game }` with `status: "forged"`, character and scenarios |
| `GET` | `/api/games/:id` | | `{ game }` |
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
