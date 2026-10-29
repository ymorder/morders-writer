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
            "נא לבחור שפת יעד ומדינת יעד לפני תחילת המחקר.",
        },
        { status: 200 }
      );
    }

    if (!hasGeminiKey(apiKey)) {
      return NextResponse.json(
        {
          needsApiKey: true,
          error:
            "כדי לייצר תוכן אמיתי, מעמיק ומדויק, חובה להזין מפתח API תקין בכפתור למעלה.",
        },
        { status: 401 }
      );
    }

    // Gather live signals from Google News RSS & Reddit (with u/username + top comments)
    const liveSignals = await fetchLiveMultiSourceSignals(
      topic,
      targetLanguage,
      targetCountry
    );

    const userPrompt = `Evaluate autonomous writing feasibility and gather live multi-source intelligence for the following topic:

Topic: "${topic}"
Target Language: "${targetLanguage}"
Target Country/Market: "${targetCountry}"
Target Audience (optional): "${targetAudience || "Not specified - infer sensible default"}"
Website/Brand Tone (optional): "${websiteBrand || "Not specified - infer sensible default"}"
Target Word Count (optional): ${wordCount || 1800}

Pre-Fetched Live Signals from Google News & Reddit (including exact Reddit usernames and what they wrote):
- Google News: ${JSON.stringify(liveSignals.googleNews.slice(0, 5))}
- Reddit Threads & User Comments: ${JSON.stringify(liveSignals.redditThreads.slice(0, 4))}

CRITICAL REDDIT RULE:
When populating "redditInsights" (and later in the article), ALWAYS include the exact Reddit username (e.g. "u/username in r/subreddit") and quote/summarize what that specific user wrote (either from their post selfText or topComments), plus the thread URL in authoritativeSources. Never insert generic unattributed questions!

Synthesize the pre-fetched live signals from Google News, Reddit (including exact u/username quotes), X (Twitter), and official sources, and return a single valid JSON object with the exact following keys (write the summaries and verdict in "${targetLanguage}"):
{
  "canWriteAuthoritatively": true,
  "confidenceScore": 94,
  "feasibilityVerdict": "2-3 sentence explanation in ${targetLanguage} of why there is (or isn't) enough verified data to write an authoritative #1 ranking article right now.",
  "targetLanguageDetected": "${targetLanguage}",
  "targetCountryDetected": "${targetCountry}",
  "missingCriticalInfo": null,
  "assumptionsMade": {
    "targetAudience": "...",
    "websiteBrandTone": "...",
    "targetWordCount": ${wordCount || 1800}
  },
  "latestNewsSummary": [
    "Specific recent news/development #1 with dates/facts",
    "Specific recent news/development #2 with dates/facts",
    "Specific recent news/development #3 with dates/facts"
  ],
  "redditInsights": [
    "u/username (in r/subreddit): Exact summary/quote of what this user wrote and their practical insight #1",
    "u/username2 (in r/subreddit): Exact summary/quote of what this user wrote #2",
    "u/username3 (in r/subreddit): Exact summary/quote of what this user wrote #3"
  ],
  "xTwitterInsights": [
    "Real-time expert take, breaking sentiment, or industry commentary from X (Twitter) #1",
    "X (Twitter) trend or practitioner perspective #2"
  ],
  "authoritativeSources": [
    {
      "title": "Official Source Title",
      "url": "https://...",
      "snippet": "Key verified statistic, date, or rule from this source"
    }
  ]
}`;

    const { text: rawText, groundingLinks } = await generateStructuredContent({
      apiKey,
      model,
      systemInstruction: FEASIBILITY_SYSTEM_PROMPT,
      userPrompt,
      temperature: 0.2,
      useGoogleSearch: true,
    });

    const parsed = extractJsonFromText<FeasibilityResult>(rawText);

    if (groundingLinks.length > 0) {
      const existingUrls = new Set(
        (parsed.authoritativeSources || []).map((s) => s.url)
      );
      for (const link of groundingLinks) {
        if (!existingUrls.has(link.url)) {
          parsed.authoritativeSources = parsed.authoritativeSources || [];
          parsed.authoritativeSources.push({
            title: link.title,
            url: link.url,
            snippet: "Verified via Google Search Grounding",
          });
        }
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
