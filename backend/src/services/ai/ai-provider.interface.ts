export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Per-call knobs. `maxTokens` lets a detail-seeking turn ask for more room
 * than the terse default without changing the provider's own retry logic. */
export interface ChatOptions {
  maxTokens?: number;
}

/** A completed non-streaming answer plus the provider's token accounting. */
export interface ChatResult {
  text: string;
  /** Total tokens (prompt + completion) reported by the provider; 0 if unknown. */
  tokensUsed: number;
}

/**
 * One streamed chunk. `usage` is only present on the final chunk when the request
 * asked for it (stream_options.include_usage) — OpenAI/Groq emit it with an empty
 * choices array, so consumers must read content and usage independently.
 */
export interface StreamChunk {
  choices: Array<{ delta: { content?: string | null } }>;
  usage?: { total_tokens?: number | null } | null;
}

export interface AIProvider {
  chat(messages: ChatMessage[], opts?: ChatOptions): Promise<ChatResult>;
  streamChat(messages: ChatMessage[], opts?: ChatOptions): Promise<AsyncIterable<StreamChunk>>;
}
