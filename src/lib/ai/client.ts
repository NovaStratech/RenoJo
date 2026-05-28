import OpenAI from "openai";
import { getEnv } from "@/lib/env";

let cached: OpenAI | null | undefined;

export function getOpenAI(): OpenAI | null {
  if (cached !== undefined) return cached;
  const env = getEnv();
  if (!env.OPENAI_API_KEY) {
    cached = null;
    return null;
  }
  cached = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return cached;
}

export function getTextModel(): string {
  return getEnv().OPENAI_MODEL_TEXT;
}

export function getVisionModel(): string {
  return getEnv().OPENAI_MODEL_VISION;
}
