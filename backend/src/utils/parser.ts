import { readFile } from "node:fs/promises";
import mammothPkg from "mammoth";
import pdfPkg from "pdf-parse";
const mammoth = (mammothPkg as any).default ?? mammothPkg;
const pdf = (pdfPkg as any).default ?? pdfPkg;

export async function parseDocument(path: string, type: string) {
  const buffer = await readFile(path);
  if (type === "pdf") return (await pdf(buffer)).text;
  if (type === "docx") return (await mammoth.extractRawText({ buffer })).value;
  return buffer.toString("utf8");
}
