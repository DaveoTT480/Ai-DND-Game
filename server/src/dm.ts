import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { ForgeResult, Scene } from "./schemas.js";

/** One conversational turn handed to the Dungeon Master. */
export type DMMessage = Anthropic.Beta.BetaMessageParam;

export interface ForgeRequest {
  system: string;
  user: string;
}

export interface NarrateRequest {
  system: string;
  messages: DMMessage[];
}

/** Anything that can play Dungeon Master: Claude in production, a script in tests. */
export interface DungeonMaster {
  forge(req: ForgeRequest): Promise<ForgeResult>;
  narrate(req: NarrateRequest): Promise<Scene>;
}

export class DungeonMasterError extends Error {
  constructor(message: string, readonly status: number = 502) {
    super(message);
    this.name = "DungeonMasterError";
  }
}

export interface ClaudeDMOptions {
  model?: string;
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
  client?: Anthropic;
}

const FALLBACK_BETA = "server-side-fallback-2026-07-01";

export class ClaudeDungeonMaster implements DungeonMaster {
  private readonly client: Anthropic;
  private readonly model: string;
  private readonly effort: NonNullable<ClaudeDMOptions["effort"]>;

  constructor(opts: ClaudeDMOptions = {}) {
    this.client = opts.client ?? new Anthropic();
    this.model = opts.model ?? process.env.DM_MODEL ?? "claude-opus-5";
    this.effort = opts.effort ?? (process.env.DM_EFFORT as ClaudeDMOptions["effort"]) ?? "medium";
  }

  async forge(req: ForgeRequest): Promise<ForgeResult> {
    return this.call<ForgeResult>(
      [{ type: "text", text: req.system, cache_control: { type: "ephemeral" } }],
      [{ role: "user", content: req.user }],
      betaZodOutputFormat(ForgeResult),
    );
  }

  async narrate(req: NarrateRequest): Promise<Scene> {
    return this.call<Scene>(
      [{ type: "text", text: req.system, cache_control: { type: "ephemeral" } }],
      req.messages,
      betaZodOutputFormat(Scene),
    );
  }

  private async call<T>(
    system: Anthropic.Beta.BetaTextBlockParam[],
    messages: DMMessage[],
    format: ReturnType<typeof betaZodOutputFormat<any>>,
  ): Promise<T> {
    try {
      const response = await this.client.beta.messages.parse({
        model: this.model,
        max_tokens: 8000,
        betas: [FALLBACK_BETA],
        fallbacks: "default",
        system,
        messages,
        output_config: { effort: this.effort, format },
        // Incremental caching: the last cacheable block (the newest turn) is
        // cached so the next turn re-reads the whole prefix cheaply.
        cache_control: { type: "ephemeral" },
      });

      if (response.stop_reason === "refusal") {
        const why = response.stop_details?.explanation ?? "the Dungeon Master declined to continue that thread";
        throw new DungeonMasterError(`The story cannot go that way: ${why}`, 422);
      }
      if (response.stop_reason === "max_tokens") {
        throw new DungeonMasterError("The Dungeon Master's answer was cut short. Try again.", 502);
      }
      if (!response.parsed_output) {
        throw new DungeonMasterError("The Dungeon Master's answer could not be understood. Try again.", 502);
      }
      return response.parsed_output as T;
    } catch (error) {
      if (error instanceof DungeonMasterError) throw error;
      if (error instanceof Anthropic.AuthenticationError) {
        throw new DungeonMasterError("The server's ANTHROPIC_API_KEY is missing or invalid.", 500);
      }
      if (error instanceof Anthropic.RateLimitError) {
        throw new DungeonMasterError("The tavern is crowded (rate limited). Wait a moment and try again.", 429);
      }
      if (error instanceof Anthropic.BadRequestError) {
        throw new DungeonMasterError(`Bad request to the model: ${error.message}`, 500);
      }
      if (error instanceof Anthropic.APIConnectionError) {
        throw new DungeonMasterError("Could not reach the model service.", 503);
      }
      if (error instanceof Anthropic.APIError) {
        throw new DungeonMasterError(`Model service error (${error.status}): ${error.message}`, 502);
      }
      throw error;
    }
  }
}
