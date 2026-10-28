import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient, extractJsonFromText, extractGroundingLinks } from "@/lib/gemini";
import { FEASIBILITY_SYSTEM_PROMPT } from "@/lib/prompts";
import { FeasibilityResult } from "@/types/pipeline";

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
      wordCount,
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

    const ai = getGeminiClient(apiKey);

    const userPrompt = `Evaluate autonomous writing feasibility and gather live multi-source intelligence for the following topic:

Topic: "${topic}"
Target Language: "${targetLanguage}"
Target Country/Market: "${targetCountry}"
Target Audience (optional): "${targetAudience || "Not specified - infer sensible default"}"
Website/Brand Tone (optional): "${websiteBrand || "Not specified - infer sensible default"}"
Target Word Count (optional): ${wordCount || 1800}

Perform live searches across:
1. Google News & latest web articles for "${topic}" in ${targetCountry}
2. Reddit discussions (e.g., site:reddit.com ${topic}) for real user experiences, pain points, and nuances
3. X / Twitter commentary (e.g., site:x.com OR site:twitter.com ${topic} or industry reactions)
4. Official/authoritative statistical or regulatory sources

Return a single valid JSON object with the exact following keys:
{
  "canWriteAuthoritatively": true,
  "confidenceScore": 92,
  "feasibilityVerdict": "2-3 sentence explanation of why there is (or isn't) enough verified data to write an authoritative #1 ranking article right now.",
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
    "Real-world user insight, common question, or edge case surfaced on Reddit #1",
    "Reddit community consensus or debate #2",
    "Practical tip or warning mentioned by practitioners on Reddit #3"
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

    const response = await ai.models.generateContent({
      model,
      contents: userPrompt,
      config: {
        systemInstruction: FEASIBILITY_SYSTEM_PROMPT,
        tools: [{ googleSearch: {} }],
        temperature: 0.2,
      },
    });

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

    return NextResponse.json({ result: parsed });
  } catch (error: any) {
    console.error("Feasibility API error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to run feasibility & multi-source intelligence check." },
      { status: 500 }
    );
  }
}
