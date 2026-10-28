import { GoogleGenAI } from "@google/genai";

export function sanitizeApiKey(rawKey?: string): string {
  if (!rawKey) return "";
  return rawKey
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .replace(/^GEMINI_API_KEY\s*=\s*/i, "")
    .replace(/\s+/g, "");
}

export function hasGeminiKey(userProvidedKey?: string): boolean {
  const apiKey =
    sanitizeApiKey(userProvidedKey) ||
    sanitizeApiKey(process.env.GEMINI_API_KEY) ||
    sanitizeApiKey(process.env.GOOGLE_API_KEY);
  return Boolean(apiKey && apiKey.length > 5);
}

export function getGeminiClient(userProvidedKey?: string) {
  const apiKey =
    sanitizeApiKey(userProvidedKey) ||
    sanitizeApiKey(process.env.GEMINI_API_KEY) ||
    sanitizeApiKey(process.env.GOOGLE_API_KEY);
  if (!apiKey) {
    throw new Error(
      "חסר מפתח Gemini API. אנא לחץ על 'הגדר Gemini API Key' בראש העמוד והדבק מפתח תקין מ-Google AI Studio."
    );
  }
  return new GoogleGenAI({ apiKey });
}

export function formatGeminiError(error: any): string {
  const msg = String(error?.message || error || "");
  if (msg.includes("API_KEY_INVALID") || msg.includes("API key not valid")) {
    return "מפתח ה-API שהוזן אינו תקין (API_KEY_INVALID). ודא שהעתקת מפתח מלא מ-Google AI Studio שמתחיל ב-AIzaSy ללא רווחים מיותרים.";
  }
  if (msg.includes("RESOURCE_EXHAUSTED") || msg.includes("429")) {
    return "חרגת ממכסת הבקשות לדקה (Rate Limit) של המפתח ב-Google AI Studio. המתן כ-30 שניות או עבור למודל Gemini 2.5 Flash בתיבה למעלה.";
  }
  return msg || "אירעה שגיאה בתקשורת מול שרת ה-AI.";
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
