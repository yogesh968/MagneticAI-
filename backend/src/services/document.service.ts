import { Document } from "../models/index.js";
import { chunkText } from "../utils/chunker.js";
import { parseDocument } from "../utils/parser.js";
import { embedText } from "./embedding.service.js";
import { ensureCollection, qdrant } from "../config/qdrant.js";

export async function processDocument(documentId: string, tenantId: string, path: string, type: string) {
  try {
    await Document.updateOne({ _id: documentId, tenantId }, { status: "processing" });
    const chunks = chunkText(await parseDocument(path, type));
    const collection = await ensureCollection(tenantId);

    let indexedCount = 0;
    for (let index = 0; index < chunks.length; index++) {
      const text = chunks[index]!;
      const vector = await embedText(text);

      // Skip chunk if embedding provider is unavailable — document will still be stored
      if (!vector) {
        console.warn(`[document] embedding unavailable, skipping chunk ${index} for doc ${documentId}`);
        continue;
      }

      await qdrant.upsert(collection, {
        wait: true,
        points: [{ id: crypto.randomUUID(), vector, payload: { tenantId, documentId, chunkIndex: index, text } }],
      });
      indexedCount++;
    }

    // Mark indexed even if 0 chunks embedded (content still stored in MongoDB)
    await Document.updateOne(
      { _id: documentId, tenantId },
      { status: indexedCount > 0 ? "indexed" : "failed", chunkCount: indexedCount },
    );

    if (indexedCount === 0) {
      console.warn(`[document] no chunks indexed for ${documentId} — embedding provider may be unavailable`);
    }
  } catch (error) {
    await Document.updateOne({ _id: documentId, tenantId }, { status: "failed" });
    console.error("Document processing failed", error);
  }
}
