/**
 * Painted portraits. Anthropic's models do not generate images, so the
 * server calls an image model when a key is configured. Provider is
 * selected by IMAGE_PROVIDER (default: "openai" when OPENAI_API_KEY is set,
 * otherwise "none"). Everything degrades gracefully: no key, no portrait,
 * the game still plays with the drawn portrait.
 */
import type { CharacterSheet } from "./schemas.js";
import type { EraRef } from "./eras.js";

export interface ImageProvider {
  /** Returns JPEG bytes, or null when generation is unavailable. Never throws for policy or transient failures. */
  generate(prompt: string): Promise<Buffer | null>;
}

export const noImages: ImageProvider = { async generate() { return null; } };

/** The prompt for a painted portrait in the tavern-sign style: warm rim light, dark smoky ground. */
export function portraitPrompt(c: CharacterSheet, era: EraRef): string {
  const p = c.portrait;
  const look = p
    ? `${p.age} ${p.skin}-skinned face, ${p.hairStyle === "bald" ? "shaved head" : `${p.hairStyle} ${p.hair} hair`}, ${p.eyes} eyes${p.facialHair !== "none" ? `, ${p.facialHair === "fullbeard" ? "full beard" : p.facialHair}` : ""}${p.headwear !== "none" ? `, wearing a ${p.headwear}` : ""}, ${p.clothing} clothing${p.scar ? ", a scar on the cheek" : ""}`
    : c.appearance;
  return [
    `Painterly fantasy character portrait, bust framing, of ${c.name}, a ${c.race} ${c.characterClass}`,
    `from ${era.name}${era.when ? ` (${era.when})` : ""}, period-accurate dress and gear, no anachronisms.`,
    `${c.appearance} ${look}.`,
    "Oil painting with visible brushwork, dramatic warm rim light from behind, ember glow, dark smoky background,",
    "highly detailed face, gaze slightly off camera, moody and heroic, square composition, no text, no watermark, no frame.",
  ].join(" ");
}

/** OpenAI Images (gpt-image-1) over raw HTTP; no SDK needed. */
export class OpenAIImages implements ImageProvider {
  constructor(private readonly apiKey: string, private readonly model = process.env.IMAGE_MODEL ?? "gpt-image-1") {}

  async generate(prompt: string): Promise<Buffer | null> {
    try {
      const res = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({ model: this.model, prompt, n: 1, size: "1024x1024", quality: process.env.IMAGE_QUALITY ?? "medium", output_format: "jpeg", output_compression: 80 }),
        signal: AbortSignal.timeout(120_000),
      });
      if (!res.ok) {
        console.warn(`Portrait generation failed: ${res.status} ${(await res.text()).slice(0, 300)}`);
        return null;
      }
      const body = (await res.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
      const first = body.data?.[0];
      if (first?.b64_json) return Buffer.from(first.b64_json, "base64");
      if (first?.url) {
        const img = await fetch(first.url, { signal: AbortSignal.timeout(60_000) });
        return img.ok ? Buffer.from(await img.arrayBuffer()) : null;
      }
      return null;
    } catch (error) {
      console.warn("Portrait generation error:", error);
      return null;
    }
  }
}

export function chooseImageProvider(env: NodeJS.ProcessEnv): ImageProvider {
  const provider = env.IMAGE_PROVIDER ?? (env.OPENAI_API_KEY ? "openai" : "none");
  if (provider === "openai" && env.OPENAI_API_KEY) return new OpenAIImages(env.OPENAI_API_KEY);
  return noImages;
}
