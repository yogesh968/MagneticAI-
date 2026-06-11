import { readFile } from "node:fs/promises";
import mammoth from "mammoth";
import pdf from "pdf-parse";

export async function parseDocument(path: string, type: string) {
  const buffer = await readFile(path);
  if (type === "pdf") return (await pdf(buffer)).text;
  if (type === "docx") return (await mammoth.extractRawText({ buffer })).value;
  return buffer.toString("utf8");
}
