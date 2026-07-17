import { groq } from "../../config/groq.js";
import { AIProvider, ChatMessage } from "./ai-provider.interface.js";

const MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-70b-versatile",
  "llama-3.1-8b-instant",
];

export class GroqProvider implements AIProvider {
  async chat(messages: ChatMessage[], attempt = 0): Promise<string> {
    const model = MODELS[Math.min(attempt, MODELS.length - 1)]!;
    try {
      const res = await groq.chat.completions.create({
        model,
        max_tokens: 400,
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
        return this.chat(messages, attempt + 1);
      }
      throw err;
    }
  }

  async streamChat(messages: ChatMessage[], attempt = 0): Promise<AsyncIterable<{ choices: Array<{ delta: { content?: string | null } }> }>> {
    const model = MODELS[Math.min(attempt, MODELS.length - 1)]!;
    try {
      return await groq.chat.completions.create({
        model,
        max_tokens: 400,
        temperature: 0.3,
        stream: true,
        messages,
      }) as any;
    } catch (err: any) {
      if (err?.status === 429 && attempt < MODELS.length - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`[groq provider] rate limited on ${model}, retrying in ${delay}ms…`);
        await new Promise((r) => setTimeout(r, delay));
        return this.streamChat(messages, attempt + 1);
      }
      throw err;
    }
  }
}
