/**
 * A pluggable place to keep raw KB uploads. The value returned by save() is what
 * gets persisted in Document.originalUrl and later handed back to toLocalPath()
 * (for re-parsing/re-indexing) and remove() (on delete). Keeping it an opaque
 * string lets the local driver store a disk path and the S3 driver store an
 * object key without either call site knowing which is in use.
 */
export interface FileInput {
  /** Present when multer used memoryStorage (STORAGE_DRIVER=s3). */
  buffer?: Buffer;
  /** Present when multer used disk storage (STORAGE_DRIVER=local). */
  localPath?: string;
  contentType?: string;
}

export interface StorageAdapter {
  /** Persist the bytes under `key`; returns the reference to store on the Document. */
  save(input: FileInput, key: string): Promise<string>;
  /**
   * Materialise the object as a readable local file for the parser, plus a
   * cleanup() to remove any temp copy afterwards (a no-op for the local driver,
   * which already has the file on disk).
   */
  toLocalPath(url: string): Promise<{ path: string; cleanup: () => Promise<void> }>;
  /** Delete the object. Best-effort — never throws for an already-missing object. */
  remove(url: string): Promise<void>;
}
