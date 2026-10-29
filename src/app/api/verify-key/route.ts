import { NextRequest, NextResponse } from "next/server";
import {
  getEffectiveApiKey,
  detectKeyProvider,
  generateStructuredContent,
  formatGeminiError,
} from "@/lib/gemini";

export async function POST(req: NextRequest) {
  let rawKey = "";
  try {
    const body = await req.json();
    rawKey = body.apiKey || "";
    const cleanKey = getEffectiveApiKey(rawKey);
    const provider = detectKeyProvider(cleanKey);

    if (!cleanKey) {
      return NextResponse.json(
        {
          valid: false,
          message: "No API key found — please paste an API key.",
        },
        { status: 400 }
      );
    }

    const res = await generateStructuredContent({
      apiKey: cleanKey,
      model: "gemini-2.5-flash",
      systemInstruction: "Return a JSON object: {\"status\": \"OK\"}",
      userPrompt: "Return {\"status\": \"OK\"} in JSON.",
      temperature: 0.1,
      useGoogleSearch: false,
    });

    return NextResponse.json({
      valid: true,
      provider,
      keyPreview: `${cleanKey.slice(0, 6)}... (${cleanKey.length} chars)`,
      message: `API Key is valid and active! (Provider: ${provider.toUpperCase()}, Response: ${res.text.trim().slice(0, 20)})`,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        valid: false,
        message: formatGeminiError(err, rawKey),
      },
      { status: 400 }
    );
  }
}
