import "../setup.js";
import { jest } from "@jest/globals";

/**
 * Guards the boundary that makes multi-bot mean anything: the Qdrant collection
 * is per-TENANT, so if the botId filter is ever dropped from the search every
 * bot in a tenant answers out of every other bot's documents. That failure is
 * silent — answers just quietly come from the wrong knowledge base — so it is
 * asserted here rather than left to notice in production.
 */

// Return a representative hit: an empty result would send prepareRag down its
// no-floor last-resort pass and fire a SECOND search, which is a different code
// path than the single-retrieval behaviour these scoping assertions target.
const search = jest.fn<any>().mockResolvedValue([{ payload: { text: "context", documentId: "d1" } }]);
// chat() now returns { text, tokensUsed } (token metering), not a bare string.
const chat = jest.fn<any>().mockResolvedValue({ text: "ok", tokensUsed: 42 });

jest.unstable_mockModule("../../src/config/qdrant.js", () => ({
  qdrant: { search },
  collectionName: (tenantId: string) => `kb_${tenantId}`,
  ensureCollection: jest.fn(),
  recreateCollection: jest.fn(),
}));

jest.unstable_mockModule("../../src/services/embedding.service.js", () => ({
  embedQuery: jest.fn<any>().mockResolvedValue([0.1, 0.2, 0.3]),
  embedText: jest.fn(),
  VECTOR_SIZE: 384,
}));

jest.unstable_mockModule("../../src/services/ai/groq.provider.js", () => ({
  GroqProvider: class { chat = chat; streamChat = jest.fn(); },
}));

jest.unstable_mockModule("../../src/services/ai/fallback.provider.js", () => ({
  FallbackProvider: class { chat = chat; streamChat = jest.fn(); },
}));

jest.unstable_mockModule("../../src/models/index.js", () => ({
  Bot: { findOne: () => ({ lean: async () => ({ botName: "Billing Bot", personality: "friendly", escalationRules: [] }) }) },
  Tenant: { findById: () => ({ lean: async () => ({ name: "Acme" }) }) },
  // rag.service imports Document to resolve source names; the mock must export it
  // or the module fails to link before any test runs.
  Document: { find: () => ({ select: () => ({ lean: async () => [] }) }) },
}));

const { answerWithRag } = await import("../../src/services/rag.service.js");

const TENANT = "6a58b39b8749e6b378970a50";
const BOT = "6a58b77fe947b47be4f9d9ce";

describe("RAG bot scoping", () => {
  beforeEach(() => search.mockClear());

  it("searches the tenant's collection", async () => {
    await answerWithRag({ tenantId: TENANT, botId: BOT }, "what is your refund policy?");
    expect(search).toHaveBeenCalledTimes(1);
    expect(search.mock.calls[0]![0]).toBe(`kb_${TENANT}`);
  });

  it("filters retrieval to the requesting bot", async () => {
    await answerWithRag({ tenantId: TENANT, botId: BOT }, "what is your refund policy?");
    const opts = search.mock.calls[0]![1] as any;
    expect(opts.filter).toEqual({ must: [{ key: "botId", match: { value: BOT } }] });
  });

  it("scopes each bot to its own filter", async () => {
    const other = "6a58b7bce947b47be4f9d9d0";
    await answerWithRag({ tenantId: TENANT, botId: BOT }, "q");
    await answerWithRag({ tenantId: TENANT, botId: other }, "q");

    const filters = search.mock.calls.map((c) => (c[1] as any).filter.must[0].match.value);
    expect(filters).toEqual([BOT, other]);
  });
});
