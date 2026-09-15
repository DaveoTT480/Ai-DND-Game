import { del, get, list, put } from "@vercel/blob";
import type { GameState } from "./schemas.js";
import type { GameStore } from "./store.js";

/**
 * Minimal surface of the @vercel/blob SDK we rely on. Injected so tests can
 * run without a token and so the store never depends on network details.
 */
export interface BlobClient {
  put(pathname: string, body: string): Promise<void>;
  get(pathname: string): Promise<string | null>;
  list(prefix: string): Promise<string[]>;
  del(pathname: string): Promise<void>;
}

export const vercelBlobClient: BlobClient = {
  async put(pathname, body) {
    await put(pathname, body, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
  },
  async get(pathname) {
    const result = await get(pathname, { access: "private", useCache: false });
    if (!result || !result.stream) return null;
    return new Response(result.stream).text();
  },
  async list(prefix) {
    const pathnames: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await list({ prefix, cursor, limit: 1000 });
      pathnames.push(...page.blobs.map((b) => b.pathname));
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    return pathnames;
  },
  async del(pathname) {
    await del(pathname);
  },
};

/**
 * Saves each adventure as a private JSON blob in Vercel Blob storage. Used
 * automatically on Vercel when BLOB_READ_WRITE_TOKEN is present; serverless
 * functions have no durable disk, so the FileStore cannot be used there.
 */
export class BlobStore implements GameStore {
  private readonly prefix: string;

  constructor(private readonly client: BlobClient = vercelBlobClient, prefix = "games/") {
    this.prefix = prefix.endsWith("/") ? prefix : `${prefix}/`;
  }

  private pathFor(id: string): string {
    if (!/^[A-Za-z0-9-]+$/.test(id)) throw new Error("Invalid game id");
    return `${this.prefix}${id}.json`;
  }

  async get(id: string): Promise<GameState | null> {
    if (!/^[A-Za-z0-9-]+$/.test(id)) return null;
    const text = await this.client.get(this.pathFor(id));
    return text ? (JSON.parse(text) as GameState) : null;
  }

  async list(): Promise<GameState[]> {
    const pathnames = await this.client.list(this.prefix);
    const games = await Promise.all(
      pathnames.map(async (pathname) => {
        const text = await this.client.get(pathname);
        if (!text) return null;
        try {
          return JSON.parse(text) as GameState;
        } catch {
          return null;
        }
      }),
    );
    return games
      .filter((g): g is GameState => g !== null)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async save(game: GameState): Promise<void> {
    await this.client.put(this.pathFor(game.id), JSON.stringify(game));
  }

  async getMeta(key: string): Promise<string | null> {
    return this.client.get(this.metaPath(key));
  }

  async setMeta(key: string, value: string): Promise<void> {
    await this.client.put(this.metaPath(key), value);
  }

  private metaPath(key: string): string {
    if (!/^[A-Za-z0-9_.-]+$/.test(key)) throw new Error("Invalid meta key");
    return `meta/${key}`;
  }

  async delete(id: string): Promise<boolean> {
    if (!/^[A-Za-z0-9-]+$/.test(id)) return false;
    const pathname = this.pathFor(id);
    const existing = await this.client.get(pathname);
    if (!existing) return false;
    await this.client.del(pathname);
    return true;
  }
}
