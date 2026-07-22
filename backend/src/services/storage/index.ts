import { randomUUID } from "node:crypto";
import { env } from "../../config/env.js";
import { LocalDiskAdapter } from "./local.adapter.js";
import { S3Adapter } from "./s3.adapter.js";
import type { StorageAdapter } from "./storage.interface.js";

export type { StorageAdapter, FileInput } from "./storage.interface.js";

/**
 * Chosen once at boot. The S3 client is only constructed when selected, so a dev
 * box running STORAGE_DRIVER=local never needs AWS/R2 credentials present.
 */
export const storage: StorageAdapter =
  env.STORAGE_DRIVER === "s3" ? new S3Adapter() : new LocalDiskAdapter();

/** A collision-free object key that still keeps the readable original filename. */
export function makeStorageKey(tenantId: string, originalName: string): string {
  const safe = originalName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  return `kb/${tenantId}/${randomUUID()}-${safe}`;
}
