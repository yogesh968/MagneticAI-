import { QdrantClient } from "@qdrant/js-client-rest";
import { VECTOR_SIZE } from "../services/embedding.service.js";

export const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL ?? "http://localhost:6333",
  apiKey: process.env.QDRANT_API_KEY || undefined,
});

export const collectionName = (tenantId: string) => `kb_${tenantId}`;

export async function ensureCollection(tenantId: string) {
  const name = collectionName(tenantId);
  try {
    const { result } = await qdrant.getCollection(name);
    // If collection exists but has wrong vector size, recreate it
    const existingSize = (result?.config?.params?.vectors as any)?.size;
    if (existingSize && existingSize !== VECTOR_SIZE) {
      console.warn(`[qdrant] collection ${name} has wrong vector size ${existingSize}, recreating with ${VECTOR_SIZE}`);
      await qdrant.deleteCollection(name);
      await qdrant.createCollection(name, { vectors: { size: VECTOR_SIZE, distance: "Cosine" } });
    }
  } catch {
    // Collection does not exist — create it
    await qdrant.createCollection(name, { vectors: { size: VECTOR_SIZE, distance: "Cosine" } });
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
