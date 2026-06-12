import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const uploadDir = process.env.UPLOAD_DIR
  ?? (process.env.VERCEL ? resolve(tmpdir(), "magnetic-ai-uploads") : resolve(__dirname, "../../uploads"));
