export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIProvider {
  chat(messages: ChatMessage[], attempt?: number): Promise<string>;
  streamChat(messages: ChatMessage[], attempt?: number): Promise<AsyncIterable<{ choices: Array<{ delta: { content?: string | null } }> }>>;
}
