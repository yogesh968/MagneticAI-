import { groq } from "../../config/groq.js";
import { AIProvider, ChatMessage, ChatOptions } from "./ai-provider.interface.js";

// Groq retires model snapshots without warning, and a decommissioned id does NOT
// fail with 429 — it throws a 400 that slips past the rate-limit retry below and
// collapses the whole call to the generic error message. So this list holds ONLY
// models verified live against the API; `llama-3.1-70b-versatile` was removed
// after it returned "has been decommissioned" and broke the 429 fallback path.
// Order matters: the first is preferred, later ones are the rate-limit fallbacks.
const MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
];

/** Terse default; a detail-seeking turn passes a larger ceiling via ChatOptions. */
const DEFAULT_MAX_TOKENS = 400;

export class GroqProvider implements AIProvider {
  async chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<string> {
    return this.chatWithRetry(messages, opts.maxTokens ?? DEFAULT_MAX_TOKENS, 0);
  }

  async streamChat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<AsyncIterable<{ choices: Array<{ delta: { content?: string | null } }> }>> {
    return this.streamWithRetry(messages, opts.maxTokens ?? DEFAULT_MAX_TOKENS, 0);
  }

  private async chatWithRetry(messages: ChatMessage[], maxTokens: number, attempt: number): Promise<string> {
    const model = MODELS[Math.min(attempt, MODELS.length - 1)]!;
    try {
      const res = await groq.chat.completions.create({
        model,
        max_tokens: maxTokens,
        temperature: 0.3,
        stream: false,
        messages,
      });
      return res.choices[0]?.message.content ?? "I'm here to help! Could you please rephrase your question?";
    } catch (err: any) {
      if (err?.status === 429 && attempt < MODELS.length - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`[groq provider] rate limited on ${model}, retrying in ${delay}ms…`);
        await new Promise((r) => setTimeout(r, delay));
        return this.chatWithRetry(messages, maxTokens, attempt + 1);
      }
      throw err;
    }
  }

  private async streamWithRetry(messages: ChatMessage[], maxTokens: number, attempt: number): Promise<AsyncIterable<{ choices: Array<{ delta: { content?: string | null } }> }>> {
    const model = MODELS[Math.min(attempt, MODELS.length - 1)]!;
    try {
      return await groq.chat.completions.create({
        model,
        max_tokens: maxTokens,
        temperature: 0.3,
        stream: true,
        messages,
      }) as any;
    } catch (err: any) {
      if (err?.status === 429 && attempt < MODELS.length - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`[groq provider] rate limited on ${model}, retrying in ${delay}ms…`);
        await new Promise((r) => setTimeout(r, delay));
        return this.streamWithRetry(messages, maxTokens, attempt + 1);
      }
      throw err;
    }
  }
}
