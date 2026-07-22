import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { uploadDir } from "../../utils/upload-path.js";
import type { FileInput, StorageAdapter } from "./storage.interface.js";

/**
 * Files live on the local/attached disk, exactly as before this abstraction —
 * originalUrl is the absolute disk path, so documents uploaded earlier keep
 * working unchanged. Note this disk is ephemeral on the default Vercel/Railway
 * host and does NOT survive a redeploy; that is the whole reason STORAGE_DRIVER=s3
 * exists (blueprint A1).
 */
export class LocalDiskAdapter implements StorageAdapter {
  async save(input: FileInput, key: string): Promise<string> {
    await mkdir(uploadDir, { recursive: true });
    // Flatten the key into a single filename — the local store is a flat dir.
    const dest = resolve(uploadDir, key.replace(/[/\\]+/g, "_"));
    if (input.localPath) await rename(input.localPath, dest);
    else if (input.buffer) await writeFile(dest, input.buffer);
    else throw new Error("LocalDiskAdapter.save: no buffer or localPath provided");
    return dest;
  }

  async toLocalPath(url: string) {
    return { path: url, cleanup: async () => undefined };
  }

  async remove(url: string) {
    await unlink(url).catch(() => undefined);
  }
}
