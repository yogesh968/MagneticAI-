import { AIProvider, ChatMessage } from "./ai-provider.interface.js";

// OpenRouter is OpenAI API compatible
export class FallbackProvider implements AIProvider {
  private baseUrl = process.env.FALLBACK_AI_BASE_URL || "https://openrouter.ai/api/v1";
  private apiKey = process.env.FALLBACK_AI_API_KEY;
  // Default to a cheap but very fast & capable model on OpenRouter
  private defaultModel = process.env.FALLBACK_AI_MODEL || "openai/gpt-4o-mini";

  async chat(messages: ChatMessage[], attempt = 0): Promise<string> {
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
        max_tokens: 1024,
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

  async streamChat(messages: ChatMessage[], attempt = 0): Promise<AsyncIterable<{ choices: Array<{ delta: { content?: string | null } }> }>> {
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
        max_tokens: 1024,
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
        return {
          async next() {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                if (buffer.trim()) {
                  // handle any remaining buffer if needed
                }
                return { done: true, value: undefined };
              }
              
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              // keep the last incomplete line in the buffer
              buffer = lines.pop() || "";
              
              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('data: ')) {
                  const dataStr = trimmed.substring(6).trim();
                  if (dataStr === '[DONE]') continue;
                  try {
                    const data = JSON.parse(dataStr);
                    return { done: false, value: data };
                  } catch (e) {
                    // Ignore parse errors on partial chunks
                  }
                }
              }
            }
          }
        };
      }
    };
  }
}
