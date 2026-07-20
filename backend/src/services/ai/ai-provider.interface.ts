export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Per-call knobs. `maxTokens` lets a detail-seeking turn ask for more room
 * than the terse default without changing the provider's own retry logic. */
export interface ChatOptions {
  maxTokens?: number;
}

export interface AIProvider {
  chat(messages: ChatMessage[], opts?: ChatOptions): Promise<string>;
  streamChat(messages: ChatMessage[], opts?: ChatOptions): Promise<AsyncIterable<{ choices: Array<{ delta: { content?: string | null } }> }>>;
}
