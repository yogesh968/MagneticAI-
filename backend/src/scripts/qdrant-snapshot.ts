import "dotenv/config";
import { qdrant } from "../config/qdrant.js";

/**
 * Creates a Qdrant snapshot for every collection. Qdrant Cloud does NOT snapshot
 * automatically, so run this on a schedule (e.g. a daily cron) and copy the
 * resulting snapshots to durable storage. Restore is documented in
 * docs/RUNBOOK-backup-restore.md.
 *
 *   npm run backup:qdrant -w backend
 */
async function main() {
  const { collections } = await qdrant.getCollections();
  if (!collections.length) {
    console.log("[snapshot] no collections to snapshot");
    return;
  }

  let ok = 0;
  for (const c of collections) {
    try {
      const snap = await qdrant.createSnapshot(c.name);
      console.log(`[snapshot] ✓ ${c.name} → ${snap?.name ?? "created"}`);
      ok++;
    } catch (err: any) {
      console.error(`[snapshot] ✗ ${c.name}: ${err?.message ?? err}`);
    }
  }
  console.log(`[snapshot] done — ${ok}/${collections.length} collection(s) snapshotted`);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error("[snapshot] failed:", e);
  process.exit(1);
});
