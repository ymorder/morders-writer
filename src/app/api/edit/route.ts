import { NextRequest, NextResponse } from "next/server";
import { hasGeminiKey, getGeminiClient, extractJsonFromText, formatGeminiError } from "@/lib/gemini";
import { EDITOR_SYSTEM_PROMPT } from "@/lib/prompts";
import { EditorOutputPackage } from "@/types/pipeline";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      submittedText,
      taskCard,
      standingRules,
      includeFullEditedVersion = true,
      apiKey,
      model = "gemini-2.5-flash",
    } = body;

    if (!submittedText || !submittedText.trim()) {
      return NextResponse.json(
        { error: "Submitted text is required for editorial analysis." },
        { status: 400 }
      );
    }

    if (!hasGeminiKey(apiKey)) {
      return NextResponse.json(
        {
          needsApiKey: true,
          error:
            "חובה להזין מפתח Gemini API בכפתור 'Set Gemini Key' למעלה כדי לבצע עריכה מקצועית אמיתית.",
        },
        { status: 401 }
      );
    }

    const ai = getGeminiClient(apiKey);

    const taskCardBlock = taskCard?.trim()
      ? `ATTACHED TASK CARD (Overrides defaults where specified):\n${taskCard.trim()}`
      : `NO TASK CARD ATTACHED (Infer goal, audience, and platform from the text and list them in 'assumptions').`;

    const standingRulesBlock = standingRules?.trim()
      ? `STANDING CLIENT / AGENCY RULES (Enforce strictly across the document):\n${standingRules.trim()}`
      : `STANDING CLIENT / AGENCY RULES: None specified.`;

    const userPrompt = `Analyze and edit the following submitted text according to your Content Editor & Text Analyst instructions.

${taskCardBlock}

${standingRulesBlock}

Include Full Edited Publish-Ready Version: ${includeFullEditedVersion ? "YES" : "NO"}

SUBMITTED TEXT:
"""
${submittedText}
"""

Return ONLY a valid JSON object matching this exact schema:
{
  "detectedLanguage": "Name of detected language (e.g., English, Hebrew, Spanish)",
  "isRtlLanguage": false,
  "rtlDirectionAuditNote": "For Hebrew/Arabic, note check on mixed numbers, English terms, and punctuation placement. Otherwise null or brief note.",
  "assumptions": [
    "Inferred assumption #1 (if no Task Card attached)",
    "Inferred assumption #2"
  ],
  "clarificationQuestionIfBlocked": null,
  "overallAssessment": "Two or three concise sentences summarizing the text's overall quality, credibility, and readiness.",
  "publicationReadyVerdict": "Ready to Publish",
  "purposeAndAudienceAnalysis": {
    "identifiedPurpose": "...",
    "targetAudience": "...",
    "coreMessage": "...",
    "intentVsExecutionGaps": ["..."]
  },
  "strengths": [
    "Specific strength of the text #1",
    "Specific strength of the text #2"
  ],
  "requiredFixes": [
    {
      "priorityLevel": 1,
      "priorityCategory": "1. Factual Errors or Misleading Info",
      "originalPhrasing": "Exact quote from the submitted text",
      "suggestedPhrasing": "Concrete corrected phrasing in the text's native language",
      "explanation": "Why this fix is required"
    }
  ],
  "suggestionsForImprovement": [
    {
      "area": "SEO / GEO Quote-Readiness or Stylistic Polish",
      "originalSnippet": "Optional original snippet",
      "suggestedImprovement": "Concrete optional improvement",
      "rationale": "Why this optional improvement helps"
    }
  ],
  "itemsNeedingFurtherChecking": [
    {
      "claimOrItem": "Specific claim, statistic, or date",
      "reasonUnverified": "Why it requires verification or how it was verified via search",
      "status": "Verified Fact"
    }
  ],
  "editedPublishReadyMarkdown": ${
    includeFullEditedVersion
      ? '"Full edited, publish-ready version of the text in Markdown, preserving the writer\'s voice while applying all required fixes and removing any em-dashes (—)."'
      : "null"
  }
}`;

    try {
      let response;
      try {
        response = await ai.models.generateContent({
          model,
          contents: userPrompt,
          config: {
            systemInstruction: EDITOR_SYSTEM_PROMPT,
            tools: [{ googleSearch: {} }],
            temperature: 0.25,
          },
        });
      } catch {
        response = await ai.models.generateContent({
          model,
          contents: userPrompt,
          config: {
            systemInstruction: EDITOR_SYSTEM_PROMPT,
            temperature: 0.25,
          },
        });
      }

      const rawText = response.text || "";
      const parsed = extractJsonFromText<EditorOutputPackage>(rawText);

      if (parsed.editedPublishReadyMarkdown) {
        parsed.editedPublishReadyMarkdown = parsed.editedPublishReadyMarkdown.replace(/\s*—\s*/g, ", ");
      }

      return NextResponse.json({ result: parsed, mode: "gemini_live" });
    } catch (gemErr: any) {
      console.error("Editor Gemini API error:", gemErr);
      return NextResponse.json(
        { error: formatGeminiError(gemErr) },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.warn("Editor API error:", error?.message);
    return NextResponse.json(
      { error: formatGeminiError(error) },
      { status: 500 }
    );
  }
}
