import { BotConfig, Tenant } from "../models/index.js";
import { collectionName, qdrant } from "../config/qdrant.js";
import { embedQuery } from "./embedding.service.js";
import { groq } from "../config/groq.js";

export type RagResult = { answer: string; hasContext: boolean; documentsReferenced: string[] };

const NO_CONTEXT_ANSWER =
  "I couldn't find that information in our knowledge base. I'll create a support ticket so our team can follow up with you directly.";

const MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-70b-versatile",
  "llama-3.1-8b-instant",
];

async function callGroqWithRetry(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  stream: false,
  attempt?: number,
): Promise<string>;
async function callGroqWithRetry(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  stream: true,
  attempt?: number,
): Promise<AsyncIterable<{ choices: Array<{ delta: { content?: string | null } }> }>>;
async function callGroqWithRetry(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  doStream: boolean,
  attempt = 0,
): Promise<any> {
  const model = MODELS[Math.min(attempt, MODELS.length - 1)]!;
  try {
    if (doStream) {
      return await groq.chat.completions.create({
        model,
        max_tokens: 1024,
        temperature: 0.3,
        stream: true,
        messages,
      });
    }
    const res = await groq.chat.completions.create({
      model,
      max_tokens: 1024,
      temperature: 0.3,
      stream: false,
      messages,
    });
    return res.choices[0]?.message.content ?? NO_CONTEXT_ANSWER;
  } catch (err: any) {
    if (err?.status === 429 && attempt < MODELS.length - 1) {
      const delay = Math.pow(2, attempt) * 1000;
      console.warn(`[rag] rate limited on ${model}, retrying in ${delay}ms…`);
      await new Promise((r) => setTimeout(r, delay));
      return callGroqWithRetry(messages as any, doStream as any, attempt + 1);
    }
    throw err;
  }
}

async function getPersona(tenantId: string) {
  const [config, tenant] = await Promise.all([
    BotConfig.findOne({ tenantId }).lean<any>(),
    Tenant.findById(tenantId).lean<any>(),
  ]);
  return { config, tenant };
}

async function prepareRag(tenantId: string, query: string) {
  const [vector, { config, tenant }] = await Promise.all([
    embedQuery(query),
    getPersona(tenantId),
  ]);

  const botName = config?.botName ?? "Support Assistant";
  const personality = config?.personality ?? "professional";
  const bizName = tenant?.name ?? "this business";
  const escalationRules = JSON.stringify(config?.escalationRules ?? []);

  if (!vector) {
    return {
      hasContext: false,
      fallback: true,
      documentsReferenced: [] as string[],
      system: `You are ${botName}, a ${personality} customer support assistant for ${bizName}. Be helpful and concise. If you cannot answer, say a ticket will be created.`,
    };
  }

  let hits: Awaited<ReturnType<typeof qdrant.search>> = [];
  try {
    hits = await qdrant.search(collectionName(tenantId), {
      vector,
      limit: 5,
      score_threshold: 0.45,
      with_payload: true,
    });
  } catch {
    hits = [];
  }

  const context = hits
    .map((h) => String(h.payload?.text ?? ""))
    .filter(Boolean)
    .join("\n\n---\n\n");

  if (!context) {
    return { hasContext: false, fallback: false, documentsReferenced: [] as string[], system: undefined };
  }

  const system = `You are ${botName}, a ${personality} customer support assistant for ${bizName}.
Answer ONLY using the knowledge base context provided below. Be concise and helpful.
If the answer is not in the context, say: "I'll create a support ticket for our team to follow up."
Do not make up information. Format responses clearly with markdown when helpful.

Knowledge Base Context:
${context}

Escalation triggers: ${escalationRules}`;

  const documentsReferenced = [
    ...new Set(hits.map((x) => String(x.payload?.documentId ?? "")).filter(Boolean)),
  ];

  return { hasContext: true, fallback: false, documentsReferenced, system };
}

export async function answerWithRag(tenantId: string, query: string): Promise<RagResult> {
  const rag = await prepareRag(tenantId, query);

  if (!rag.hasContext && !rag.fallback) {
    return { answer: NO_CONTEXT_ANSWER, hasContext: false, documentsReferenced: [] };
  }

  const answer = await callGroqWithRetry(
    [
      { role: "system", content: rag.system! },
      { role: "user", content: query },
    ],
    false,
  );

  return { answer, hasContext: rag.hasContext, documentsReferenced: rag.documentsReferenced };
}

export async function streamAnswerWithRag(
  tenantId: string,
  query: string,
  onToken: (token: string) => void,
): Promise<RagResult> {
  const rag = await prepareRag(tenantId, query);

  if (!rag.hasContext && !rag.fallback) {
    onToken(NO_CONTEXT_ANSWER);
    return { answer: NO_CONTEXT_ANSWER, hasContext: false, documentsReferenced: [] };
  }

  const stream = await callGroqWithRetry(
    [
      { role: "system", content: rag.system! },
      { role: "user", content: query },
    ],
    true,
  );

  let answer = "";
  for await (const part of stream) {
    const token = part.choices[0]?.delta?.content ?? "";
    if (token) {
      answer += token;
      onToken(token);
    }
  }

  return {
    answer: answer || NO_CONTEXT_ANSWER,
    hasContext: rag.hasContext,
    documentsReferenced: rag.documentsReferenced,
  };
}
