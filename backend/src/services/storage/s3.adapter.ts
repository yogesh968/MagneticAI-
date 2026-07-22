import { createWriteStream } from "node:fs";
import { mkdtemp, readFile, rm, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "../../config/env.js";
import type { FileInput, StorageAdapter } from "./storage.interface.js";

/**
 * Any S3-compatible bucket: AWS S3 (leave S3_ENDPOINT unset) or Cloudflare R2
 * (set S3_ENDPOINT to the R2 endpoint and S3_REGION=auto). originalUrl stores the
 * object key behind an "s3://" prefix so the driver round-trips it regardless of
 * whatever public URL scheme the bucket is fronted by.
 */
const PREFIX = "s3://";
const keyOf = (url: string) => (url.startsWith(PREFIX) ? url.slice(PREFIX.length) : url);

export class S3Adapter implements StorageAdapter {
  private client = new S3Client({
    region: env.S3_REGION,
    ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT } : {}),
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID ?? "",
      secretAccessKey: env.S3_SECRET_ACCESS_KEY ?? "",
    },
  });
  private bucket = env.S3_BUCKET ?? "";

  async save(input: FileInput, key: string): Promise<string> {
    const body = input.buffer ?? (input.localPath ? await readFile(input.localPath) : undefined);
    if (!body) throw new Error("S3Adapter.save: no buffer or localPath provided");
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: input.contentType }));
    // Drop multer's temp file once it is safely uploaded.
    if (input.localPath) await unlink(input.localPath).catch(() => undefined);
    return `${PREFIX}${key}`;
  }

  async toLocalPath(url: string) {
    const key = keyOf(url);
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    const dir = await mkdtemp(join(tmpdir(), "astrex-kb-"));
    const path = join(dir, key.split("/").pop() || "file");
    await pipeline(res.Body as Readable, createWriteStream(path));
    return {
      path,
      cleanup: async () => { await rm(dir, { recursive: true, force: true }).catch(() => undefined); },
    };
  }

  async remove(url: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: keyOf(url) })).catch(() => undefined);
  }
}
