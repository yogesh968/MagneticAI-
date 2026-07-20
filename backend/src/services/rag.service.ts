import { Bot, Document, Tenant } from "../models/index.js";
import { collectionName, qdrant } from "../config/qdrant.js";
import { embedQuery } from "./embedding.service.js";
import { GroqProvider } from "./ai/groq.provider.js";
import { FallbackProvider } from "./ai/fallback.provider.js";
import { ChatMessage } from "./ai/ai-provider.interface.js";
export type RagResult = {
  answer: string;
  hasContext: boolean;
  documentsReferenced: string[];
  /** Human-readable names of the documents behind the answer, for citation in the UI. */
  sources: string[];
};

/** Identifies which bot is answering, and therefore which slice of the KB to search. */
export type RagTarget = { tenantId: string; botId: string };

/**
 * Prior turns, oldest first, already trimmed by the caller. Without these the
 * model sees every question as the first one and cannot resolve a follow-up
 * like "how much is that?" — the single biggest cause of bad answers here.
 */
export type RagHistory = ChatMessage[];

/**
 * How many prior turns to carry. Six keeps pronouns and "the other one"
 * resolvable across a normal support exchange without pushing the KB context
 * out of the window.
 */
export const HISTORY_TURNS = 6;

/** Message off an unknown thrown value, without asserting it is an Error. */
const errText = (err: unknown) => (err instanceof Error ? err.message : String(err));

/**
 * The exact sentence the model is told to use when the KB does not cover the
 * question. Also the marker for "this answer cites nothing" — retrieval can
 * surface a loosely-related document, the model can correctly decline to use
 * it, and citing it anyway would credit a source that answered nothing.
 */
const NO_ANSWER = "I don't have that in my knowledge base. I'll create a ticket so our team can follow up.";

const declined = (answer: string) => answer.trim().startsWith(NO_ANSWER.slice(0, 40));

const primaryProvider = new GroqProvider();
const fallbackProvider = new FallbackProvider();

async function callProviderWithFallback(
  messages: ChatMessage[],
  stream: false,
): Promise<string>;
async function callProviderWithFallback(
  messages: ChatMessage[],
  stream: true,
): Promise<AsyncIterable<{ choices: Array<{ delta: { content?: string | null } }> }>>;
async function callProviderWithFallback(
  messages: ChatMessage[],
  stream: boolean,
): Promise<any> {
  try {
    if (stream) {
      return await primaryProvider.streamChat(messages);
    }
    return await primaryProvider.chat(messages);
  } catch (err: any) {
    console.error("[rag] Primary AI provider failed, falling back:", err?.message || err);
    try {
      if (stream) {
        return await fallbackProvider.streamChat(messages);
      }
      return await fallbackProvider.chat(messages);
    } catch (fallbackErr: any) {
      console.error("[rag] Fallback AI provider also failed:", fallbackErr?.message || fallbackErr);
      throw new Error("Both primary and fallback AI providers failed.");
    }
  }
}

/**
 * Rewrites a context-dependent follow-up into a question that stands on its own.
 *
 * The retrieval step embeds the user's words verbatim, so "and how long do I
 * have to ask for one?" carries no searchable nouns and matches nothing — the
 * bot then claims it has no information about a policy sitting right there in
 * the KB. Passing history to the model does not help: by then retrieval has
 * already come back empty.
 *
 * Only runs when the first search finds nothing and there is history to draw
 * on, so a normal question pays no extra latency. Falls back to the original
 * query if the rewrite fails — a bad search beats a failed request.
 */
async function condenseQuery(history: RagHistory, query: string): Promise<string> {
  const transcript = history
    .map((m) => `${m.role === "user" ? "Customer" : "Assistant"}: ${m.content}`)
    .join("\n");
  try {
    const rewritten = await primaryProvider.chat([
      {
        role: "system",
        content:
          "Rewrite the customer's latest message as a standalone search query, resolving any pronouns or references using the conversation. Reply with the query only — no quotes, no preamble, no explanation. If it already stands alone, repeat it unchanged.",
      },
      { role: "user", content: `${transcript}\nCustomer: ${query}\n\nStandalone search query:` },
    ]);
    const clean = String(rewritten ?? "").trim().replace(/^["']|["']$/g, "");
    // A rewrite that returns an essay has misunderstood the job; ignore it.
    return clean && clean.length < 200 ? clean : query;
  } catch (err) {
    console.error("[rag] Query condensation failed, searching with the raw query:", errText(err));
    return query;
  }
}

async function getPersona({ tenantId, botId }: RagTarget) {
  const [config, tenant] = await Promise.all([
    Bot.findOne({ _id: botId, tenantId }).lean<any>(),
    Tenant.findById(tenantId).lean<any>(),
  ]);
  return { config, tenant };
}

/**
 * The house style, shared by the with-context and no-context prompts.
 *
 * This is deliberately prescriptive. Left to itself the model writes essays:
 * it restates the question, front-loads pleasantries, and bullets things that
 * were never a list. In a 380px chat panel that reads as a wall of text and
 * nobody scrolls it, so brevity here is a product requirement, not a token
 * optimisation.
 */
const STYLE = `HOW TO ANSWER
- Lead with the answer in the very first sentence. No preamble, no "Great question", no restating what was asked.
- Stay under 60 words unless the answer genuinely needs steps.
- Numbered list ONLY for sequential steps the user must perform, in order.
- Bullets ONLY when listing three or more parallel items. Never bullet a single fact.
- No markdown headings — this renders in a small chat panel, not a document.
- Plain language. No corporate filler, no "feel free to", no closing sales pitch.
- On a follow-up, answer only what was just asked; do not repeat what you already said.`;

async function prepareRag(target: RagTarget, query: string, history: RagHistory = []) {
  const [vector, { config, tenant }] = await Promise.all([
    embedQuery(query),
    getPersona(target),
  ]);
  const botName = config?.botName ?? "Support Assistant";
  const personality = config?.personality ?? "professional";
  const bizName = tenant?.name ?? "this business";
  const escalationRules = JSON.stringify(config?.escalationRules ?? []);

  // No KB match: greetings and small talk still need to work, but every
  // business-specific claim would be invention, so refuse those outright.
  const generalSystem = `You are ${botName}, a ${personality} customer support assistant for ${bizName}.

${STYLE}

WHAT YOU KNOW
- You have no knowledge base context for this question.
- Greetings and small talk ("hello", "how are you", "thanks"): reply in one warm line that invites their question, e.g. "Hi! What can I help you with?". Never answer a greeting with a bare "Hello".
- Any question about ${bizName}'s policies, pricing, products or procedures: reply exactly "${NO_ANSWER}" and stop. Do not guess, do not offer general advice, do not fabricate details.`;

  if (!vector) {
    return { hasContext: false, documentsReferenced: [] as string[], sources: [] as string[], system: generalSystem };
  }

  // Search this bot's slice of the tenant's KB. The collection is per-tenant, so
  // the botId filter is what keeps one bot from answering out of another's
  // documents — without it every bot in a tenant shares a single knowledge pool.
  //
  // Thresholds: Cohere embed-english-v3.0 cosine scores for a genuinely relevant
  // but differently-worded chunk routinely land in the 0.25–0.5 band — measured
  // even a document's own chunks against a query drawn from that same document
  // scored 0.59 / 0.31 / 0.23. A flat 0.4 cutoff therefore dropped real matches
  // and the bot answered "I don't have that" about a document sitting right in
  // its KB. So: a modest primary floor, then a relaxed last-resort pass. Weak
  // context is not the same as a wrong answer — the grounding prompt still makes
  // the model decline anything the chunks don't actually cover.
  const PRIMARY_FLOOR = 0.3;
  const search = (v: number[], opts: { threshold?: number; limit?: number } = {}) =>
    qdrant.search(collectionName(target.tenantId), {
      vector: v,
      limit: opts.limit ?? 5,
      ...(opts.threshold !== undefined ? { score_threshold: opts.threshold } : {}),
      with_payload: true,
      filter: { must: [{ key: "botId", match: { value: target.botId } }] },
    });

  let hits: Awaited<ReturnType<typeof qdrant.search>> = [];
  try {
    hits = await search(vector, { threshold: PRIMARY_FLOOR });

    // A follow-up ("how long do I have?") embeds to nothing useful on its own.
    // Rewrite it against the conversation and try once more before concluding
    // the KB has no answer.
    if (!hits.length && history.length) {
      const standalone = await condenseQuery(history, query);
      if (standalone !== query) {
        const revector = await embedQuery(standalone);
        if (revector) hits = await search(revector, { threshold: PRIMARY_FLOOR });
      }
    }

    // Last resort: nothing cleared the primary floor. Take the top few chunks
    // with NO floor at all — marketing PDFs and typo'd questions embed weakly
    // (measured scores of 0.20–0.28 for plainly on-topic questions), so any
    // fixed cutoff strands a document the KB clearly contains. The grounding
    // prompt is the real filter: it makes the model reply with the no-answer
    // line whenever these chunks don't actually cover what was asked, so feeding
    // it the best-available context can only help an on-topic question.
    if (!hits.length) {
      hits = await search(vector, { limit: 3 });
    }
  } catch (err) {
    // Swallowing this silently makes a broken search indistinguishable from an
    // empty KB — the bot just claims it knows nothing. Answer anyway, but log.
    console.error("[rag] KB search failed, answering without context:", errText(err));
    hits = [];
  }

  const context = hits
    .map((h) => String(h.payload?.text ?? ""))
    .filter(Boolean)
    .join("\n\n---\n\n");

  if (!context) {
    // No KB match — still pass to LLM so greetings/general questions work fine
    return { hasContext: false, documentsReferenced: [] as string[], sources: [] as string[], system: generalSystem };
  }

  // KB context found — ground answers in it
  const documentsReferenced = [
    ...new Set(hits.map((x) => String(x.payload?.documentId ?? "")).filter(Boolean)),
  ];

  // The vector payload carries only documentId, so the display names come from
  // Mongo. Cited in the UI rather than in the prompt: asking the model to write
  // its own "Sources:" line just invites it to cite documents it never used.
  const docs = await Document.find({ _id: { $in: documentsReferenced }, tenantId: target.tenantId })
    .select("name")
    .lean<Array<{ name?: string }>>();
  const sources = docs.map((d) => String(d.name)).filter(Boolean);

  const system = `You are ${botName}, a ${personality} customer support assistant for ${bizName}.

${STYLE}

GROUNDING
- Answer business questions using ONLY the knowledge base context below. It is the entire truth available to you.
- If the context does not cover what was asked, reply exactly "${NO_ANSWER}" and stop. A partial guess is worse than that sentence.
- Never invent or estimate a policy, price, date, timeframe, or procedure. If a number is not in the context, you do not know it.
- Do not mention "the context", "the knowledge base", or "the documents" in your reply — just answer.
- Greetings and small talk: ignore the context and reply in one warm line that invites their question, e.g. "Hi! What can I help you with?". Never answer a greeting with a bare "Hello".

KNOWLEDGE BASE CONTEXT
${context}

ESCALATION TRIGGERS
${escalationRules}`;

  return { hasContext: true, documentsReferenced, sources, system };
}

const buildMessages = (system: string, history: RagHistory, query: string): ChatMessage[] => [
  { role: "system", content: system },
  ...history,
  { role: "user", content: query },
];

export async function answerWithRag(target: RagTarget, query: string, history: RagHistory = []): Promise<RagResult> {
  const rag = await prepareRag(target, query, history);
  const answer = await callProviderWithFallback(buildMessages(rag.system, history, query), false);
  const cited = declined(answer) ? [] : rag.sources;
  return { answer, hasContext: rag.hasContext, documentsReferenced: rag.documentsReferenced, sources: cited };
}

export async function streamAnswerWithRag(
  target: RagTarget,
  query: string,
  onToken: (token: string) => void,
  history: RagHistory = [],
): Promise<RagResult> {
  const rag = await prepareRag(target, query, history);
  const stream = await callProviderWithFallback(buildMessages(rag.system, history, query), true);
  let answer = "";
  for await (const part of stream) {
    const token = part.choices[0]?.delta?.content ?? "";
    if (token) {
      answer += token;
      onToken(token);
    }
  }
  const final = answer || "I'm here to help! Could you please rephrase your question?";
  return {
    answer: final,
    hasContext: rag.hasContext,
    documentsReferenced: rag.documentsReferenced,
    sources: declined(final) ? [] : rag.sources,
  };
}
