// Cohere embed-english-v3.0 — 1024 dimensions, free tier 1000 calls/min
export const VECTOR_SIZE = 1024;

export async function embedText(input: string): Promise<number[] | null> {
  try {
    const res = await fetch("https://api.cohere.com/v1/embed", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.COHERE_API_KEY!}`,
      },
      body: JSON.stringify({
        model: "embed-english-v3.0",
        texts: [input],
        input_type: "search_document",
      }),
    });
    if (!res.ok) throw new Error(`Cohere ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const vector: number[] = data.embeddings?.[0];
    if (!vector?.length) throw new Error("Cohere returned no vector");
    return vector;
  } catch (err) {
    console.warn("[embedding] Cohere failed:", (err as Error).message);
    return null;
  }
}

// Query-time embedding uses search_query input type for better retrieval
export async function embedQuery(input: string): Promise<number[] | null> {
  try {
    const res = await fetch("https://api.cohere.com/v1/embed", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.COHERE_API_KEY!}`,
      },
      body: JSON.stringify({
        model: "embed-english-v3.0",
        texts: [input],
        input_type: "search_query",
      }),
    });
    if (!res.ok) throw new Error(`Cohere ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const vector: number[] = data.embeddings?.[0];
    if (!vector?.length) throw new Error("Cohere returned no vector");
    return vector;
  } catch (err) {
    console.warn("[embedding] Cohere query failed:", (err as Error).message);
    return null;
  }
}
