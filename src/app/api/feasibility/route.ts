import { NextRequest, NextResponse } from "next/server";
import {
  hasGeminiKey,
  generateStructuredContent,
  extractJsonFromText,
  formatGeminiError,
} from "@/lib/gemini";
import { FEASIBILITY_SYSTEM_PROMPT } from "@/lib/prompts";
import { FeasibilityResult } from "@/types/pipeline";
import { fetchLiveMultiSourceSignals } from "@/lib/liveSearch";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let providedKey = "";
  try {
    const body = await req.json();
    const {
      topic,
      targetLanguage,
      targetCountry,
      targetAudience,
      websiteBrand,
      wordCount = 1800,
      apiKey,
      model = "gemini-2.5-pro",
    } = body;
    providedKey = apiKey || "";

    if (!topic || !topic.trim()) {
      return NextResponse.json({ error: "Topic is required." }, { status: 400 });
    }

    if (!targetLanguage?.trim() || !targetCountry?.trim()) {
      return NextResponse.json(
        {
          needsClarification: true,
          clarificationMessage:
            "Please select a Target Language and Target Country/Market from the dropdowns before starting research.",
        },
        { status: 200 }
      );
    }

    if (!hasGeminiKey(apiKey)) {
      return NextResponse.json(
        {
          needsApiKey: true,
          error:
            "Please configure a valid API Key in the top bar (or in .env.local) to run live AI research and writing.",
        },
        { status: 401 }
      );
    }

    // Gather live signals from Organic Web Search (DuckDuckGo), Google News RSS, & Reddit (with u/username + top comments)
    const liveSignals = await fetchLiveMultiSourceSignals(
      topic,
      targetLanguage,
      targetCountry
    );

    const isHebrew =
      /hebrew|עברית/i.test(targetLanguage) || /[\u0590-\u05FF]/.test(topic);

    const hebrewRules = isHebrew
      ? `
STRICT NATIVE HEBREW RULES:
- Write all Hebrew fields in 100% natural, idiomatic, standard Israeli Hebrew.
- NEVER invent fake words or literal calques from English (such as "אי-סכנות").
- NEVER drift off the user's exact topic ("${topic}").
- Use the exact Hebrew domain terminology found in the Live Organic Web Search Results below.`
      : "";

    const userPrompt = `Evaluate autonomous writing feasibility and gather live multi-source intelligence for the EXACT topic below:

EXACT TOPIC (LOCK 100% TO THIS SUBJECT): "${topic}"
Target Language: "${targetLanguage}"
Target Country/Market: "${targetCountry}"
Target Audience (optional): "${targetAudience || "Not specified - infer sensible default"}"
Website/Brand Tone (optional): "${websiteBrand || "Not specified - infer sensible default"}"
Target Word Count (optional): ${wordCount || 1800}
${hebrewRules}

Live Pre-Fetched Signals for "${topic}":
- Top Organic Web Search Results (Terminology, Facts & Competitors): ${JSON.stringify(
      liveSignals.webResults.slice(0, 6)
    )}
- Google News Headlines: ${JSON.stringify(liveSignals.googleNews.slice(0, 5))}
- Reddit Threads & User Comments: ${JSON.stringify(
      liveSignals.redditThreads.slice(0, 3)
    )}

CRITICAL RULES:
1. STAY 100% LOCKED ON "${topic}". Ignore any pre-fetched item if it is not directly about "${topic}".
2. NEVER invent fake studies, fake university surveys, or fake report names. Only list real URLs from the pre-fetched signals above in "authoritativeSources".
3. When populating "redditInsights", if real Reddit threads are present above, include the exact Reddit username (e.g. "u/username in r/subreddit") and summarize what that user wrote.

Return a single valid JSON object with the exact following keys (write the summaries and verdict in "${targetLanguage}"):
{
  "canWriteAuthoritatively": true,
  "confidenceScore": 95,
  "feasibilityVerdict": "2-3 sentence explanation in ${targetLanguage} of why there is enough verified domain data to write an authoritative #1 ranking article on '${topic}'.",
  "targetLanguageDetected": "${targetLanguage}",
  "targetCountryDetected": "${targetCountry}",
  "missingCriticalInfo": null,
  "assumptionsMade": {
    "targetAudience": "...",
    "websiteBrandTone": "...",
    "targetWordCount": ${wordCount || 1800}
  },
  "latestNewsSummary": [
    "Key verified domain insight or recent development strictly about '${topic}' #1",
    "Key verified domain insight or recent development strictly about '${topic}' #2",
    "Key verified domain insight or recent development strictly about '${topic}' #3"
  ],
  "redditInsights": [
    "u/username (in r/subreddit): Real user question, pain point, or practitioner insight strictly about '${topic}' #1",
    "u/username2 (in r/subreddit): Real user question or insight strictly about '${topic}' #2"
  ],
  "xTwitterInsights": [
    "Practitioner perspective or market discussion strictly about '${topic}' #1",
    "Practitioner perspective or market discussion strictly about '${topic}' #2"
  ],
  "authoritativeSources": [
    {
      "title": "Official Source Title from Web/News Results",
      "url": "https://...",
      "snippet": "Key verified fact or domain rule from this source"
    }
  ]
}`;

    const { text: rawText, groundingLinks } = await generateStructuredContent({
      apiKey,
      model,
      preferredGroqModel: "openai/gpt-oss-120b",
      systemInstruction: FEASIBILITY_SYSTEM_PROMPT,
      userPrompt,
      temperature: 0.2,
      useGoogleSearch: true,
      maxTokens: 1600,
    });

    const parsed = extractJsonFromText<FeasibilityResult>(rawText);

    // Ensure real scraped webResults and googleNews URLs are included in authoritativeSources
    const existingUrls = new Set(
      (parsed.authoritativeSources || []).map((s) => s.url)
    );
    for (const w of liveSignals.webResults.slice(0, 5)) {
      if (w.url && w.url.startsWith("http") && !existingUrls.has(w.url)) {
        existingUrls.add(w.url);
        parsed.authoritativeSources = parsed.authoritativeSources || [];
        parsed.authoritativeSources.push({
          title: w.title,
          url: w.url,
          snippet: w.snippet,
        });
      }
    }
    for (const link of groundingLinks) {
      if (!existingUrls.has(link.url)) {
        existingUrls.add(link.url);
        parsed.authoritativeSources = parsed.authoritativeSources || [];
        parsed.authoritativeSources.push({
          title: link.title,
          url: link.url,
          snippet: "Verified via Live Search Grounding",
        });
      }
    }

    return NextResponse.json({ result: parsed, mode: "ai_live" });
  } catch (error: any) {
    console.error("Feasibility API error:", error);
    return NextResponse.json(
      { error: formatGeminiError(error, providedKey) },
      { status: 500 }
    );
  }
}
