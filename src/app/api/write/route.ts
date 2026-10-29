import { NextRequest, NextResponse } from "next/server";
import {
  hasGeminiKey,
  generateStructuredContent,
  extractJsonFromText,
  formatGeminiError,
} from "@/lib/gemini";
import { WRITER_SYSTEM_PROMPT } from "@/lib/prompts";
import { WriterOutputPackage } from "@/types/pipeline";

export const maxDuration = 60;

function sanitizeArticleText(markdown: string): { cleaned: string; emDashesRemoved: number } {
  const matches = markdown.match(/—/g);
  const count = matches ? matches.length : 0;
  const cleaned = markdown.replace(/\s*—\s*/g, ", ");
  return { cleaned, emDashesRemoved: count };
}

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
      standingRules,
      feasibilityContext,
      apiKey,
      model = "gemini-2.5-pro",
    } = body;
    providedKey = apiKey || "";

    if (!topic?.trim() || !targetLanguage?.trim() || !targetCountry?.trim()) {
      return NextResponse.json(
        { error: "Topic, Target Language, and Target Country/Market are required." },
        { status: 400 }
      );
    }

    if (!hasGeminiKey(apiKey)) {
      return NextResponse.json(
        {
          needsApiKey: true,
          error:
            "Please configure a valid API Key in the top bar (or in .env.local) to run the 9-stage writer.",
        },
        { status: 401 }
      );
    }

    const intelligenceBlock = feasibilityContext
      ? `
Verified Multi-Source Research Context (Integrate these real insights, latest news, Reddit u/username quotes & X perspectives, and authoritative sources):
- Latest News: ${JSON.stringify(feasibilityContext.latestNewsSummary || [])}
- Reddit Insights (with u/username): ${JSON.stringify(feasibilityContext.redditInsights || [])}
- X (Twitter) Insights: ${JSON.stringify(feasibilityContext.xTwitterInsights || [])}
- Verified Sources: ${JSON.stringify(feasibilityContext.authoritativeSources || [])}
`
      : "";

    const standingRulesBlock = standingRules?.trim()
      ? `\nStanding Client / Agency Rules to Enforce:\n${standingRules}\n`
      : "";

    const userPrompt = `Execute the complete 9-Stage SEO & GEO Writing Workflow for the following assignment:

Topic: "${topic}"
Target Language: "${targetLanguage}"
Target Country/Market: "${targetCountry}"
Target Audience: "${targetAudience || "Infer sensible default and list in assumptions"}"
Website/Brand: "${websiteBrand || "Infer sensible default and list in assumptions"}"
Target Word Count: ${wordCount}
${standingRulesBlock}
${intelligenceBlock}

IMPORTANT LANGUAGE, DEPTH & QUALITY RULES:
1. Write the article (Stage 4), Competitor/Keyword terms (Stage 1), GEO Prompts & Direct Answers (Stage 2), Outline (Stage 3), and Meta Titles/Descriptions (Stage 5) in 100% pure, idiomatic, native "${targetLanguage}" (except for the hyphenated English URL slug in Stage 5 and English filename in Stage 6, and exact Reddit usernames like u/... or r/...).
2. If "${targetLanguage}" is Hebrew (עברית), write like a veteran Israeli domain expert and senior journalist: natural, sharp, authoritative Hebrew syntax, zero translationese, zero awkward phrasing, and 100% pure Hebrew character set.
3. REDDIT USER ATTRIBUTION RULE: When referencing Reddit in the article, ALWAYS include the specific username (e.g., u/username in r/subreddit) and quote/describe what that user actually wrote. Never drop random unattributed questions into the text!
4. NEVER write generic filler or abstract templates. Every paragraph must contain concrete domain mechanics, real named entities, specific figures, practical edge cases, and insights synthesized from the live news, Reddit, and X research.
5. Write a comprehensive, deep, exhaustive article in 'stage4FullArticleMarkdown' (~${wordCount} words) with varied section structures, real-world scenarios, and a mathematically reconciled comparative table specific to "${topic}".
6. ZERO EM DASHES (—) anywhere in the output.
7. Start the article with a direct 2-3 sentence answer to the main query. Start every H2 section with a concise 1-2 sentence direct answer before expanding.

Return ONLY a valid JSON object matching this exact structure:
{
  "assumptions": {
    "targetLanguage": "${targetLanguage}",
    "targetMarket": "${targetCountry}",
    "targetAudience": "...",
    "websiteBrand": "...",
    "targetWordCount": ${wordCount}
  },
  "stage1CompetitorResearch": {
    "primaryKeyword": "...",
    "secondaryKeywords": ["...", "..."],
    "relatedEntities": ["...", "..."],
    "paaQuestions": ["...", "..."],
    "competitorAnalysisSummary": "...",
    "contentGapsIdentified": ["...", "..."]
  },
  "stage2GeoPrompts": [
    {
      "searchStyle": "Informational",
      "prompt": "Realistic user prompt (provide 10-12 prompts across Informational, How-To, Best / Top, Comparison, Edge-Case)",
      "quoteReadyDirectAnswer": "2-3 sentence quote-ready direct answer optimized for AI citation"
    }
  ],
  "stage3Outline": {
    "h1Title": "...",
    "directIntroDraft": "...",
    "sections": [
      {
        "headingLevel": "H2",
        "headingText": "...",
        "directOpeningDraft": "1-2 sentence direct answer opening this H2",
        "keyPointsToCover": ["...", "..."]
      }
    ],
    "faqQuestions": ["...", "..."],
    "practicalConclusionSummary": "..."
  },
  "stage4FullArticleMarkdown": "# Full H1 Title\\n\\nDirect opening paragraph...\\n\\n## First H2 Section\\n\\nDirect 1-2 sentence answer...",
  "stage5MetaAndSlug": {
    "metaTitles": [
      { "title": "Option 1 (50-60 chars)", "charCount": 55, "isRecommended": true },
      { "title": "Option 2 (50-60 chars)", "charCount": 54, "isRecommended": false },
      { "title": "Option 3 (50-60 chars)", "charCount": 58, "isRecommended": false }
    ],
    "metaDescriptions": [
      { "description": "Option 1 (140-155 chars with primary keyword & soft CTA)", "charCount": 148, "isRecommended": true },
      { "description": "Option 2 (140-155 chars)", "charCount": 145, "isRecommended": false },
      { "description": "Option 3 (140-155 chars)", "charCount": 151, "isRecommended": false }
    ],
    "urlSlug": "hyphenated-english-url-slug"
  },
  "stage6FeaturedImage": {
    "aspectRatio": "16:9",
    "imageGenerationPrompt": "Detailed 16:9 prompt for realistic editorial photography or modern abstract conceptual art (no text/logos)...",
    "altText": "Descriptive alt text including primary keyword",
    "englishFilename": "hyphenated-english-filename.jpg"
  },
  "stage7FactCheckTable": [
    {
      "claim": "Specific statistic, law, date, or market mechanic stated in the article",
      "status": "Verified",
      "sourceTitle": "Authoritative Source Name",
      "sourceUrl": "https://...",
      "verificationNote": "How this was verified"
    }
  ],
  "stage8And9QualityAudit": {
    "uniquenessVerified": true,
    "uniquenessNotes": "Verification of 100% original phrasing and structural asymmetry.",
    "mathematicalAndEmpiricalAudit": "Verification that all figures, percentages, and table values reconcile.",
    "bannedPatternsRemoved": ["delve", "unlock", "game changer", "seamless", "in conclusion", "em-dashes (—)"],
    "emDashCount": 0,
    "characterSetPurityVerified": true,
    "characterSetPurityNote": "100% pure ${targetLanguage} orthography verified.",
    "sentenceLengthVarietyScore": 95
  }
}`;

    const { text: rawText, groundingLinks } = await generateStructuredContent({
      apiKey,
      model,
      systemInstruction: WRITER_SYSTEM_PROMPT,
      userPrompt,
      temperature: 0.3,
      useGoogleSearch: true,
    });

    const parsed = extractJsonFromText<WriterOutputPackage>(rawText);

    if (parsed.stage4FullArticleMarkdown) {
      const { cleaned } = sanitizeArticleText(parsed.stage4FullArticleMarkdown);
      parsed.stage4FullArticleMarkdown = cleaned;
    }

    parsed.groundingUrls = groundingLinks;

    return NextResponse.json({ result: parsed, mode: "ai_live" });
  } catch (error: any) {
    console.error("Writer API error:", error);
    return NextResponse.json(
      { error: formatGeminiError(error, providedKey) },
      { status: 500 }
    );
  }
}
