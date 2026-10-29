import { GoogleGenAI } from "@google/genai";

export type KeyProvider =
  | "gemini"
  | "vertex_express"
  | "openai"
  | "anthropic"
  | "groq"
  | "openrouter"
  | "unknown";

export function sanitizeApiKey(rawKey?: string): string {
  if (!rawKey) return "";
  return rawKey
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .replace(/^(GEMINI_API_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY|API_KEY)\s*=\s*/i, "")
    .replace(/^Bearer\s+/i, "")
    .replace(/[^\x21-\x7E]/g, ""); // Strip invisible Unicode / RTL marks
}

export function detectKeyProvider(rawKey?: string): KeyProvider {
  const key = sanitizeApiKey(rawKey);
  if (!key) return "unknown";
  if (key.startsWith("AQ.")) return "vertex_express";
  if (key.startsWith("AIza")) return "gemini";
  if (key.startsWith("sk-ant-")) return "anthropic";
  if (key.startsWith("sk-or-")) return "openrouter";
  if (key.startsWith("gsk_")) return "groq";
  if (key.startsWith("sk-")) return "openai";
  return "gemini"; // try Gemini by default if format is custom
}

export function getEffectiveApiKey(userProvidedKey?: string): string {
  return (
    sanitizeApiKey(userProvidedKey) ||
    sanitizeApiKey(process.env.GEMINI_API_KEY) ||
    sanitizeApiKey(process.env.GOOGLE_API_KEY) ||
    sanitizeApiKey(process.env.OPENAI_API_KEY) ||
    ""
  );
}

export function hasGeminiKey(userProvidedKey?: string): boolean {
  const apiKey = getEffectiveApiKey(userProvidedKey);
  return Boolean(apiKey && apiKey.length > 8);
}

export function getGeminiClient(userProvidedKey?: string) {
  const apiKey = getEffectiveApiKey(userProvidedKey);
  if (!apiKey) {
    throw new Error(
      "חסר מפתח API. אנא לחץ על 'הגדר API Key' בראש העמוד והדבק מפתח תקין."
    );
  }
  return new GoogleGenAI({ apiKey });
}

export async function generateStructuredContent(params: {
  apiKey?: string;
  model?: string;
  systemInstruction: string;
  userPrompt: string;
  temperature?: number;
  useGoogleSearch?: boolean;
}): Promise<{ text: string; groundingLinks: { title: string; url: string }[] }> {
  const {
    apiKey: rawKey,
    model = "gemini-2.5-pro",
    systemInstruction,
    userPrompt,
    temperature = 0.25,
    useGoogleSearch = true,
  } = params;

  const key = getEffectiveApiKey(rawKey);
  if (!key) {
    throw new Error("חסר מפתח API. אנא הזן מפתח בתיבה בראש העמוד.");
  }

  const provider = detectKeyProvider(key);

  // 1. OpenAI (sk-...) or Groq (gsk_...) or OpenRouter (sk-or-...)
  if (provider === "openai" || provider === "groq" || provider === "openrouter") {
    const endpoint =
      provider === "groq"
        ? "https://api.groq.com/openai/v1/chat/completions"
        : provider === "openrouter"
        ? "https://openrouter.ai/api/v1/chat/completions"
        : "https://api.openai.com/v1/chat/completions";

    const targetModel =
      provider === "groq"
        ? "openai/gpt-oss-120b"
        : provider === "openrouter"
        ? "google/gemini-2.5-pro-preview"
        : "gpt-4o";

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: targetModel,
        temperature,
        max_tokens: 8000,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `${systemInstruction.replace(/using Google Search|Use your Google Search tool/gi, "using the provided live research context")}\n\nCRITICAL: Do NOT call any tools or functions. Directly output a single valid JSON object matching the exact schema requested by the user.`,
          },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(
        data?.error?.message || `שגיאת ${provider.toUpperCase()}: ${res.statusText}`
      );
    }

    const text = data?.choices?.[0]?.message?.content || "";
    return { text, groundingLinks: [] };
  }

  // 2. Anthropic Claude (sk-ant-...)
  if (provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-7-sonnet-latest",
        max_tokens: 8000,
        temperature,
        system: systemInstruction,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(
        data?.error?.message || `שגיאת Anthropic: ${res.statusText}`
      );
    }

    const text = data?.content?.[0]?.text || "";
    return { text, groundingLinks: [] };
  }

  // 3. Google Gemini (AIza...) or Vertex AI Express Mode (AQ....)
  const isVertexExpress = provider === "vertex_express";
  const ai = new GoogleGenAI(
    isVertexExpress ? { vertexai: true, apiKey: key } : { apiKey: key }
  );
  let response;
  if (useGoogleSearch) {
    try {
      response = await ai.models.generateContent({
        model,
        contents: userPrompt,
        config: {
          systemInstruction,
          tools: [{ googleSearch: {} }],
          temperature,
        },
      });
    } catch (firstErr: any) {
      const errMsg = String(firstErr?.message || "");
      // If the key itself is invalid, don't retry with the same invalid key; throw immediately with diagnostics
      if (errMsg.includes("API_KEY_INVALID") || errMsg.includes("API key not valid")) {
        throw firstErr;
      }
      // Otherwise retry without googleSearch tool (e.g. if search grounding quota is restricted)
      response = await ai.models.generateContent({
        model,
        contents: userPrompt,
        config: {
          systemInstruction,
          temperature,
        },
      });
    }
  } else {
    response = await ai.models.generateContent({
      model,
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature,
      },
    });
  }

  const text = response.text || "";
  const groundingLinks = extractGroundingLinks(response);
  return { text, groundingLinks };
}

export function formatGeminiError(error: any, rawKeyProvided?: string): string {
  const msg = String(error?.message || error || "");
  const cleanKey = sanitizeApiKey(rawKeyProvided);
  const preview = cleanKey
    ? `(המפתח שהוזן מתחיל ב-"${cleanKey.slice(0, 6)}..." ואורכו ${cleanKey.length} תווים)`
    : "(לא התקבל מפתח)";

  if (msg.includes("BILLING_DISABLED") || msg.includes("requires billing to be enabled")) {
    return `מפתח ה-Vertex AI שלך (AQ...) דורש הפעלת Billing בפרויקט הגוגל שלך. כדי לעבוד בחינם לגמרי בלי כרטיס אשראי: 1) הפעל את ה-API החינמי בקישור https://console.developers.google.com/apis/api/generativelanguage.googleapis.com/overview?project=769363569955 ואז צור מפתח שמתחיל ב-AIzaSy ב-Google AI Studio, או 2) הפק מפתח חינמי בשנייה מ-Groq בקישור https://console.groq.com/keys (מתחיל ב-gsk_).`;
  }

  if (msg.includes("SERVICE_DISABLED") || msg.includes("aiplatform.googleapis.com")) {
    const urlMatch = msg.match(/https:\/\/console\.developers\.google\.com\/apis\/api\/aiplatform\.googleapis\.com\/overview\?project=\d+/);
    const enableUrl = urlMatch ? urlMatch[0] : "https://console.developers.google.com/apis/api/aiplatform.googleapis.com/overview";
    return `המפתח שלך (${preview}) הוא מפתח Vertex AI תקין לחלוטין! נותר רק ללחוץ על כפתור Enable בקישור הרשמי של הפרויקט שלך בגוגל: ${enableUrl}`;
  }

  if (msg.includes("API_KEY_INVALID") || msg.includes("API key not valid")) {
    if (cleanKey && !cleanKey.startsWith("AIza")) {
      return `המפתח שהזנת ${preview} אינו מפתח Gemini תקין (מפתח Gemini חייב להתחיל באותיות AIzaSy ואורכו 39 תווים). אם זה מפתח של OpenAI הוא צריך להתחיל ב-sk- ואם של Groq ב-gsk_.`;
    }
    return `גוגל דחתה את המפתח כלא תקין ${preview}. זה קורה אם: 1) המפתח לא הועתק במלואו (חייב להיות 39 תווים שמתחילים ב-AIzaSy), או 2) בפרויקט ה-Google Cloud שיצרת עדיין לא הופעל ה-Generative Language API. לחץ על 'בדוק מפתח' למעלה לבדיקה מהירה.`;
  }
  if (msg.includes("RESOURCE_EXHAUSTED") || msg.includes("429")) {
    return "חרגת ממכסת הבקשות לדקה (Rate Limit). המתן כ-30 שניות או עבור למודל Gemini 2.5 Flash בתיבה למעלה.";
  }
  return msg || "אירעה שגיאה בתקשורת מול שרת ה-AI.";
}

export function extractJsonFromText<T>(rawText: string): T {
  const cleaned = rawText.trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const jsonBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (jsonBlockMatch && jsonBlockMatch[1]) {
      try {
        return JSON.parse(jsonBlockMatch[1].trim()) as T;
      } catch {
        // continue
      }
    }
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const candidate = cleaned.slice(firstBrace, lastBrace + 1);
      return JSON.parse(candidate) as T;
    }
    throw new Error("Failed to parse structured JSON response from AI.");
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
    // ignore
  }

  return links;
}
