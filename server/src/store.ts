import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { GameState } from "./schemas.js";

export interface GameStore {
  get(id: string): Promise<GameState | null>;
  list(): Promise<GameState[]>;
  save(game: GameState): Promise<void>;
  delete(id: string): Promise<boolean>;
}

export class MemoryStore implements GameStore {
  protected games = new Map<string, GameState>();

  async get(id: string) {
    return this.games.get(id) ?? null;
  }
  async list() {
    return [...this.games.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  async save(game: GameState) {
    this.games.set(game.id, game);
  }
  async delete(id: string) {
    return this.games.delete(id);
  }
}

/** Memory cache backed by one JSON file per game. Good enough for a personal server. */
export class FileStore extends MemoryStore {
  private loaded: Promise<void> | null = null;

  constructor(private readonly dir: string) {
    super();
  }

  private async ensureLoaded() {
    if (!this.loaded) {
      this.loaded = (async () => {
        await mkdir(this.dir, { recursive: true });
        for (const file of await readdir(this.dir)) {
          if (!file.endsWith(".json")) continue;
          try {
            const game = JSON.parse(await readFile(path.join(this.dir, file), "utf8")) as GameState;
            this.games.set(game.id, game);
          } catch (error) {
            console.warn(`Skipping unreadable save ${file}:`, error);
          }
        }
      })();
    }
    return this.loaded;
  }

  override async get(id: string) {
    await this.ensureLoaded();
    return super.get(id);
  }
  override async list() {
    await this.ensureLoaded();
    return super.list();
  }
  override async save(game: GameState) {
    await this.ensureLoaded();
    await super.save(game);
    const file = path.join(this.dir, `${game.id}.json`);
    const tmp = `${file}.tmp`;
    await writeFile(tmp, JSON.stringify(game, null, 2));
    const { rename } = await import("node:fs/promises");
    await rename(tmp, file);
  }
  override async delete(id: string) {
    await this.ensureLoaded();
    const existed = await super.delete(id);
    if (existed) await rm(path.join(this.dir, `${id}.json`), { force: true });
    return existed;
  }
}
