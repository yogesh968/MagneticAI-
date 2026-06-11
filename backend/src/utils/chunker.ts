export function cleanText(text: string) {
  return text.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

export function chunkText(text: string, size = 512, overlap = 50) {
  const words = cleanText(text).split(/\s+/);
  const chunks: string[] = [];
  for (let start = 0; start < words.length; start += size - overlap) chunks.push(words.slice(start, start + size).join(" "));
  return chunks.filter(Boolean);
}
