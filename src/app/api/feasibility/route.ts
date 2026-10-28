import { NextRequest, NextResponse } from "next/server";
import { hasGeminiKey, getGeminiClient, extractJsonFromText, extractGroundingLinks } from "@/lib/gemini";
import { FEASIBILITY_SYSTEM_PROMPT } from "@/lib/prompts";
import { FeasibilityResult } from "@/types/pipeline";
import { fetchLiveMultiSourceSignals } from "@/lib/liveSearch";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
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
      model = "gemini-2.5-flash",
    } = body;

    if (!topic || !topic.trim()) {
      return NextResponse.json({ error: "Topic is required." }, { status: 400 });
    }

    // Input Handling Rule 1: Check if Target Language and Target Country/Market are provided.
    if (!targetLanguage?.trim() || !targetCountry?.trim()) {
      return NextResponse.json(
        {
          needsClarification: true,
          clarificationMessage:
            "Before starting research and writing, please confirm your Target Language and Target Country/Market so we can ground SERP, Reddit, and X research accurately.",
        },
        { status: 200 }
      );
    }

    // Always gather real live signals from Google News RSS, Reddit JSON API, and Web/X pulse
    const liveSignals = await fetchLiveMultiSourceSignals(
      topic,
      targetLanguage,
      targetCountry
    );

    if (!hasGeminiKey(apiKey)) {
      return NextResponse.json(
        {
          needsApiKey: true,
          error:
            "כדי לייצר תוכן אמיתי, מעמיק ומדויק (ולא תבנית גנרית), חובה להזין מפתח Gemini API בכפתור 'Set Gemini Key' למעלה.",
        },
        { status: 401 }
      );
    }

    const ai = getGeminiClient(apiKey);

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

Perform additional live searches across Google News, Reddit, X (Twitter), and official sources, and return a single valid JSON object with the exact following keys (write the summaries and verdict in "${targetLanguage}"):
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

    let response;
    try {
      response = await ai.models.generateContent({
        model,
        contents: userPrompt,
        config: {
          systemInstruction: FEASIBILITY_SYSTEM_PROMPT,
          tools: [{ googleSearch: {} }],
          temperature: 0.2,
        },
      });
    } catch {
      response = await ai.models.generateContent({
        model,
        contents: userPrompt,
        config: {
          systemInstruction: FEASIBILITY_SYSTEM_PROMPT,
          temperature: 0.2,
        },
      });
    }

    const rawText = response.text || "";
    const parsed = extractJsonFromText<FeasibilityResult>(rawText);
    const groundingLinks = extractGroundingLinks(response);

    if (groundingLinks.length > 0) {
      const existingUrls = new Set((parsed.authoritativeSources || []).map((s) => s.url));
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

    return NextResponse.json({ result: parsed, mode: "gemini_live" });
  } catch (error: any) {
    console.error("Feasibility API error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to run feasibility & multi-source intelligence check." },
      { status: 500 }
    );
  }
}
