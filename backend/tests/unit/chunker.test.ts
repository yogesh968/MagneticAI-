import "../setup.js";
import { chunkText, cleanText } from "../../src/utils/chunker.js";

describe("cleanText", () => {
  it("collapses multiple spaces", () => {
    expect(cleanText("hello   world")).toBe("hello world");
  });

  it("collapses 3+ newlines to 2", () => {
    expect(cleanText("a\n\n\n\nb")).toBe("a\n\nb");
  });

  it("removes carriage returns", () => {
    expect(cleanText("hello\r\nworld")).toBe("hello\nworld");
  });

  it("trims leading/trailing whitespace", () => {
    expect(cleanText("  hello  ")).toBe("hello");
  });
});

describe("chunkText", () => {
  const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(" ");

  it("returns single chunk for short text", () => {
    const chunks = chunkText("hello world foo bar");
    expect(chunks.length).toBe(1);
    expect(chunks[0]).toContain("hello");
  });

  it("chunks text longer than size", () => {
    const text = words(1000);
    const chunks = chunkText(text, 512, 50);
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((c) => {
      expect(c.split(/\s+/).length).toBeLessThanOrEqual(512);
    });
  });

  it("applies overlap — last words of chunk N appear in chunk N+1", () => {
    const text = words(600);
    const chunks = chunkText(text, 512, 50);
    if (chunks.length >= 2) {
      const endOfFirst = chunks[0]!.split(/\s+/).slice(-10).join(" ");
      expect(chunks[1]).toContain(endOfFirst.split(" ")[0]!);
    }
  });

  it("filters empty chunks", () => {
    const chunks = chunkText("   ");
    expect(chunks.length).toBe(0);
  });

  it("respects custom size and overlap", () => {
    const text = words(200);
    const chunks = chunkText(text, 100, 10);
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((c) => expect(c.split(/\s+/).length).toBeLessThanOrEqual(100));
  });
});
