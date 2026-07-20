import { AIProvider, ChatMessage, ChatOptions } from "./ai-provider.interface.js";

/** Terse default; a detail-seeking turn passes a larger ceiling via ChatOptions. */
const DEFAULT_MAX_TOKENS = 400;

// OpenRouter is OpenAI API compatible
export class FallbackProvider implements AIProvider {
  private baseUrl = process.env.FALLBACK_AI_BASE_URL || "https://openrouter.ai/api/v1";
  private apiKey = process.env.FALLBACK_AI_API_KEY;
  // Default to a cheap but very fast & capable model on OpenRouter
  private defaultModel = process.env.FALLBACK_AI_MODEL || "openai/gpt-4o-mini";

  async chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<string> {
    if (!this.apiKey) {
      throw new Error("Fallback provider called but FALLBACK_AI_API_KEY is not configured.");
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.defaultModel,
        messages,
        max_tokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
        temperature: 0.3,
        stream: false,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Fallback provider error: ${response.status} ${text}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? "I'm here to help! Could you please rephrase your question?";
  }

  async streamChat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<AsyncIterable<{ choices: Array<{ delta: { content?: string | null } }> }>> {
    if (!this.apiKey) {
      throw new Error("Fallback provider called but FALLBACK_AI_API_KEY is not configured.");
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.defaultModel,
        messages,
        max_tokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
        temperature: 0.3,
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      const text = await response.text();
      throw new Error(`Fallback provider stream error: ${response.status} ${text}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    return {
      [Symbol.asyncIterator]() {
        let buffer = "";
        // A single network read routinely carries several SSE events. The old
        // code returned on the FIRST `data:` line in a chunk and threw the rest
        // away, so streamed fallback answers arrived with most of their tokens
        // missing. Parse every event in the chunk into this queue and drain it
        // one value per next() call before reading more from the network.
        const queue: Array<{ choices: Array<{ delta: { content?: string | null } }> }> = [];
        let done = false;

        return {
          async next() {
            while (true) {
              if (queue.length) return { done: false, value: queue.shift()! };
              if (done) return { done: true, value: undefined };

              const { done: streamDone, value } = await reader.read();
              if (streamDone) {
                done = true;
                // Flush any complete event left in the buffer at end-of-stream.
                buffer += decoder.decode();
                for (const evt of parseEvents(buffer)) queue.push(evt);
                buffer = "";
                continue;
              }

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              // Keep the last, possibly-incomplete line for the next read.
              buffer = lines.pop() || "";
              for (const evt of parseEvents(lines.join("\n"))) queue.push(evt);
            }
          },
        };
      },
    };
  }
}

/** Pull every parseable `data:` event out of a block of SSE lines. */
function parseEvents(block: string): Array<{ choices: Array<{ delta: { content?: string | null } }> }> {
  const out: Array<{ choices: Array<{ delta: { content?: string | null } }> }> = [];
  for (const line of block.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const dataStr = trimmed.slice(5).trim();
    if (!dataStr || dataStr === "[DONE]") continue;
    try {
      out.push(JSON.parse(dataStr));
    } catch {
      // Ignore parse errors on partial/keep-alive chunks.
    }
  }
  return out;
}
