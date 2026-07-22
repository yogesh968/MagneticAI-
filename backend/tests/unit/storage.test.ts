import "../setup.js";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { LocalDiskAdapter } from "../../src/services/storage/local.adapter.js";

/**
 * The local driver must behave exactly as the old on-disk code did: a saved file
 * is readable back for re-indexing and gone after remove(). This is the safety
 * net for STORAGE_DRIVER=local (the default) so the S3 abstraction is a no-op
 * regression risk for existing deployments.
 */
describe("LocalDiskAdapter", () => {
  const adapter = new LocalDiskAdapter();

  it("round-trips a buffer: save → read → remove", async () => {
    const key = `test/unit-${Date.now()}.txt`;
    const url = await adapter.save({ buffer: Buffer.from("hello knowledge base") }, key);

    const { path, cleanup } = await adapter.toLocalPath(url);
    expect(await readFile(path, "utf8")).toBe("hello knowledge base");
    await cleanup(); // no-op for local, but must not throw

    await adapter.remove(url);
    expect(existsSync(url)).toBe(false);
  });

  it("remove() is safe on an already-missing object", async () => {
    await expect(adapter.remove("/nonexistent/path/xyz.txt")).resolves.toBeUndefined();
  });
});
