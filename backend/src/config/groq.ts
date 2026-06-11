import GroqPkg from "groq-sdk";
const GroqClient = (GroqPkg as any).default ?? GroqPkg;

export const groq = new GroqClient({ apiKey: process.env.GROQ_API_KEY ?? "missing" });
