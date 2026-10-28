import { GoogleGenAI } from "@google/genai";

export function hasGeminiKey(userProvidedKey?: string): boolean {
  const apiKey =
    userProvidedKey?.trim() ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY;
  return Boolean(apiKey && apiKey.length > 5);
}

export function getGeminiClient(userProvidedKey?: string) {
  const apiKey =
    userProvidedKey?.trim() ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing Gemini API Key. Please enter your Gemini API Key in the top-right Settings bar or set GEMINI_API_KEY in .env.local."
    );
  }
  return new GoogleGenAI({ apiKey });
}

export function extractJsonFromText<T>(rawText: string): T {
  const cleaned = rawText.trim();
  // Try direct parse first
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Try extracting from ```json ... ``` or first { to last }
    const jsonBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (jsonBlockMatch && jsonBlockMatch[1]) {
      try {
        return JSON.parse(jsonBlockMatch[1].trim()) as T;
      } catch {
        // continue to brace extraction
      }
    }
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const candidate = cleaned.slice(firstBrace, lastBrace + 1);
      return JSON.parse(candidate) as T;
    }
    throw new Error("Failed to parse structured JSON response from Gemini.");
  }
}

export function extractGroundingLinks(response: any): { title: string; url: string }[] {
  const links: { title: string; url: string }[] = [];
  const seen = new Set<string>();

  try {
    const chunks =
      response?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    for (const chunk of chunks) {
      if (chunk?.web?.uri && !seen.has(chunk.web.uri)) {
        seen.add(chunk.web.uri);
        links.push({
          title: chunk.web.title || chunk.web.uri,
          url: chunk.web.uri,
        });
      }
    }
  } catch {
    // ignore metadata extraction errors
  }

  return links;
}
