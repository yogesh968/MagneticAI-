import crypto from "node:crypto";
import { Document } from "../models/index.js";
import { chunkText } from "../utils/chunker.js";
import { parseDocument } from "../utils/parser.js";
import { embedText } from "./embedding.service.js";
import { ensureCollection, qdrant } from "../config/qdrant.js";
import { storage } from "./storage/index.js";

export type ProcessArgs = { documentId: string; tenantId: string; botId: string; originalUrl: string; type: string };

export async function processDocument({ documentId, tenantId, botId, originalUrl, type }: ProcessArgs) {
  // Materialise the stored object as a local file the parser can read. For the
  // S3 driver this downloads to a temp file we must clean up afterwards; for the
  // local driver it is the file already on disk and cleanup is a no-op.
  let cleanup: () => Promise<void> = async () => undefined;
  try {
    await Document.updateOne({ _id: documentId, tenantId }, { status: "processing" });
    const local = await storage.toLocalPath(originalUrl);
    cleanup = local.cleanup;
    const chunks = chunkText(await parseDocument(local.path, type));
    const collection = await ensureCollection(tenantId);

    // Delete existing vectors for this document in case of re-indexing
    await qdrant.delete(collection, {
      wait: true,
      filter: { must: [{ key: "documentId", match: { value: documentId } }] },
    }).catch(() => undefined);

    let indexedCount = 0;
    for (let index = 0; index < chunks.length; index++) {
      const text = chunks[index]!;
      const vector = await embedText(text);

      // Skip chunk if embedding provider is unavailable — document will still be stored
      if (!vector) {
        console.warn(`[document] embedding unavailable, skipping chunk ${index} for doc ${documentId}`);
        continue;
      }

      // botId is what rag.service filters on, so every point must carry it.
      await qdrant.upsert(collection, {
        wait: true,
        points: [{ id: crypto.randomUUID(), vector, payload: { tenantId, botId, documentId, chunkIndex: index, text } }],
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
  } finally {
    await cleanup();
  }
}
