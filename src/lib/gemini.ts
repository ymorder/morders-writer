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
      "Missing API Key. Please click 'API Key Settings' in the top bar and paste a valid key."
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
    throw new Error("Missing API Key. Please enter an API key in the top bar.");
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

    // For Groq free tier, rotate across independent model pools so 3 sequential stages never hit the 8,000 TPM per-model limit
    const groqModelQueue = [
      "openai/gpt-oss-120b",
      "qwen/qwen3.8-27b",
      "openai/gpt-oss-20b",
    ];
    const modelsToTry =
      provider === "groq"
        ? groqModelQueue
        : provider === "openrouter"
        ? ["google/gemini-2.5-pro-preview"]
        : ["gpt-4o"];

    let lastError = "";
    for (const candidateModel of modelsToTry) {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: candidateModel,
          temperature,
          max_tokens: 4096,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `${systemInstruction.replace(
                /using Google Search|Use your Google Search tool/gi,
                "using the provided live research context"
              )}\n\nCRITICAL: Do NOT call any tools or functions. Directly output a single valid JSON object matching the exact schema requested by the user.`,
            },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      const data = await res.json();
      if (res.ok) {
        const text = data?.choices?.[0]?.message?.content || "";
        return { text, groundingLinks: [] };
      }

      const errMsg = data?.error?.message || res.statusText || "";
      lastError = errMsg;

      // If this specific Groq model hit its TPM limit or doesn't support json_object, immediately try the next model in the pool
      if (
        provider === "groq" &&
        (res.status === 429 ||
          errMsg.includes("Rate limit") ||
          errMsg.includes("tokens per minute") ||
          errMsg.includes("response_format"))
      ) {
        console.warn(
          `Groq model ${candidateModel} hit limit/constraint, switching to next model in pool...`
        );
        continue;
      }

      throw new Error(
        errMsg || `${provider.toUpperCase()} API Error: ${res.statusText}`
      );
    }

    throw new Error(
      lastError ||
        "All models in the pool reached their per-minute token limit. Please wait 20 seconds and try again."
    );
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
    ? `(Key starts with "${cleanKey.slice(0, 6)}...", length: ${cleanKey.length} chars)`
    : "(Using server .env.local key)";

  if (msg.includes("BILLING_DISABLED") || msg.includes("requires billing to be enabled")) {
    return `Your Vertex AI key (${preview}) requires billing to be enabled in Google Cloud. To run for free without billing, use a Google AI Studio key (starts with AIzaSy) or a free Groq key (starts with gsk_).`;
  }

  if (msg.includes("SERVICE_DISABLED") || msg.includes("aiplatform.googleapis.com")) {
    const urlMatch = msg.match(/https:\/\/console\.developers\.google\.com\/apis\/api\/aiplatform\.googleapis\.com\/overview\?project=\d+/);
    const enableUrl = urlMatch ? urlMatch[0] : "https://console.developers.google.com/apis/api/aiplatform.googleapis.com/overview";
    return `Your Vertex AI key ${preview} is valid, but you need to click Enable on the Google Cloud API page: ${enableUrl}`;
  }

  if (msg.includes("API_KEY_INVALID") || msg.includes("API key not valid")) {
    if (cleanKey && !cleanKey.startsWith("AIza")) {
      return `The key provided ${preview} is not a standard Gemini AI Studio key (must start with AIzaSy). Note: If you have an old invalid key in the top bar, clear the input box so the app uses the working server key in .env.local.`;
    }
    return `Google rejected the API key as invalid ${preview}. Please verify the key or clear the input box to use the default server key.`;
  }
  if (msg.includes("RESOURCE_EXHAUSTED") || msg.includes("429") || msg.includes("Rate limit")) {
    return "Per-minute token rate limit reached. Please wait ~20 seconds and run again.";
  }
  return msg || "An unexpected error occurred while communicating with the AI provider.";
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
