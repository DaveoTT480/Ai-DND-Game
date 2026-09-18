import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { GameState } from "./schemas.js";

export interface GameStore {
  get(id: string): Promise<GameState | null>;
  list(): Promise<GameState[]>;
  save(game: GameState): Promise<void>;
  delete(id: string): Promise<boolean>;
  /** Small key/value area for counters such as the daily spend guard. */
  getMeta(key: string): Promise<string | null>;
  setMeta(key: string, value: string): Promise<void>;
  /** Painted portrait bytes (JPEG) for a game, when one was generated. */
  getImage(gameId: string): Promise<Buffer | null>;
  putImage(gameId: string, bytes: Buffer): Promise<void>;
}

export class MemoryStore implements GameStore {
  protected games = new Map<string, GameState>();
  protected meta = new Map<string, string>();
  protected images = new Map<string, Buffer>();

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
  async getMeta(key: string) {
    return this.meta.get(key) ?? null;
  }
  async setMeta(key: string, value: string) {
    this.meta.set(key, value);
  }
  async getImage(gameId: string) {
    return this.images.get(gameId) ?? null;
  }
  async putImage(gameId: string, bytes: Buffer) {
    this.images.set(gameId, bytes);
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
            if (file === "_meta.json") {
              const meta = JSON.parse(await readFile(path.join(this.dir, file), "utf8")) as Record<string, string>;
              for (const [k, v] of Object.entries(meta)) this.meta.set(k, v);
              continue;
            }
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
  override async getMeta(key: string) {
    await this.ensureLoaded();
    return super.getMeta(key);
  }
  override async setMeta(key: string, value: string) {
    await this.ensureLoaded();
    await super.setMeta(key, value);
    await writeFile(path.join(this.dir, "_meta.json"), JSON.stringify(Object.fromEntries(this.meta), null, 2));
  }
  private imagePath(gameId: string) {
    return path.join(this.dir, "portraits", `${gameId}.jpg`);
  }
  override async getImage(gameId: string) {
    if (!/^[A-Za-z0-9-]+$/.test(gameId)) return null;
    try {
      return await readFile(this.imagePath(gameId));
    } catch {
      return null;
    }
  }
  override async putImage(gameId: string, bytes: Buffer) {
    if (!/^[A-Za-z0-9-]+$/.test(gameId)) throw new Error("Invalid game id");
    await mkdir(path.join(this.dir, "portraits"), { recursive: true });
    await writeFile(this.imagePath(gameId), bytes);
  }
  override async delete(id: string) {
    await this.ensureLoaded();
    const existed = await super.delete(id);
    if (existed) {
      await rm(path.join(this.dir, `${id}.json`), { force: true });
      await rm(this.imagePath(id), { force: true });
    }
    return existed;
  }
}
