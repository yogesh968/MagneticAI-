import { QdrantClient } from "@qdrant/js-client-rest";

export const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL ?? "http://localhost:6333",
  apiKey: process.env.QDRANT_API_KEY || undefined,
});

export const collectionName = (tenantId: string) => `kb_${tenantId}`;

// Cohere embed-english-v3.0 = 1024 dimensions
const VECTOR_SIZE = 1024;

export async function ensureCollection(tenantId: string) {
  const name = collectionName(tenantId);
  const { collections } = await qdrant.getCollections();
  if (!collections.some((c) => c.name === name)) {
    await qdrant.createCollection(name, {
      vectors: { size: VECTOR_SIZE, distance: "Cosine" },
    });
  }
  return name;
}

export async function recreateCollection(tenantId: string) {
  const name = collectionName(tenantId);
  const { collections } = await qdrant.getCollections();
  if (collections.some((c) => c.name === name)) {
    await qdrant.deleteCollection(name);
  }
  await qdrant.createCollection(name, {
    vectors: { size: VECTOR_SIZE, distance: "Cosine" },
  });
  return name;
}
