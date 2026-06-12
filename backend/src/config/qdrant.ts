import { QdrantClient } from "@qdrant/js-client-rest";
import { VECTOR_SIZE } from "../services/embedding.service.js";

export const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL ?? "http://localhost:6333",
  apiKey: process.env.QDRANT_API_KEY || undefined,
  checkCompatibility: false,
});

export const collectionName = (tenantId: string) => `kb_${tenantId}`;

function getVectorSize(vectors: unknown): number | undefined {
  if (!vectors || typeof vectors !== "object") return undefined;
  if ("size" in vectors && typeof vectors.size === "number") return vectors.size;

  const firstVector = Object.values(vectors as Record<string, unknown>)[0];
  if (firstVector && typeof firstVector === "object" && "size" in firstVector && typeof firstVector.size === "number") {
    return firstVector.size;
  }

  return undefined;
}

export async function ensureCollection(tenantId: string) {
  const name = collectionName(tenantId);
  try {
    const collection = await qdrant.getCollection(name);
    // If collection exists but has wrong vector size, recreate it
    const existingSize = getVectorSize(collection.config?.params?.vectors);
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
