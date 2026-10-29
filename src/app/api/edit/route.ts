import { NextRequest, NextResponse } from "next/server";
import {
  hasGeminiKey,
  generateStructuredContent,
  extractJsonFromText,
  formatGeminiError,
} from "@/lib/gemini";
import { EDITOR_SYSTEM_PROMPT } from "@/lib/prompts";
import { EditorOutputPackage } from "@/types/pipeline";

export const maxDuration = 60;

function applyEditorialFixesToMarkdown(
  originalMarkdown: string,
  parsed: EditorOutputPackage
): string {
  let updated = originalMarkdown;

  // Apply all Priority 1-5 required fixes where originalPhrasing matches
  for (const fix of parsed.requiredFixes || []) {
    const orig = fix.originalPhrasing?.trim();
    const repl = fix.suggestedPhrasing?.trim();
    if (orig && repl && orig.length > 4 && updated.includes(orig)) {
      updated = updated.replace(orig, repl);
    }
  }

  // Apply optional suggestions where an exact originalSnippet matches
  for (const sug of parsed.suggestionsForImprovement || []) {
    const orig = sug.originalSnippet?.trim();
    const repl = sug.suggestedImprovement?.trim();
    if (orig && repl && orig.length > 6 && updated.includes(orig)) {
      updated = updated.replace(orig, repl);
    }
  }

  // Enforce zero em-dashes (—)
  updated = updated.replace(/\s*—\s*/g, ", ");
  return updated;
}

export async function POST(req: NextRequest) {
  let providedKey = "";
  try {
    const body = await req.json();
    const {
      submittedText,
      taskCard,
      standingRules,
      includeFullEditedVersion = true,
      apiKey,
      model = "gemini-2.5-pro",
    } = body;
    providedKey = apiKey || "";

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
            "Please configure a valid API Key in the top bar (or in .env.local) to run the editorial audit.",
        },
        { status: 401 }
      );
    }

    const taskCardBlock = taskCard?.trim()
      ? `ATTACHED TASK CARD (Overrides defaults where specified):\n${taskCard.trim()}`
      : `NO TASK CARD ATTACHED (Infer goal, audience, and platform from the text and list them in 'assumptions').`;

    const standingRulesBlock = standingRules?.trim()
      ? `STANDING CLIENT / AGENCY RULES (Enforce strictly across the document):\n${standingRules.trim()}`
      : `STANDING CLIENT / AGENCY RULES: None specified.`;

    const isShortText = submittedText.length < 2500;

    const userPrompt = `Analyze and edit the following submitted text according to your Content Editor & Text Analyst instructions.

${taskCardBlock}

${standingRulesBlock}

SUBMITTED TEXT:
"""
${submittedText}
"""

IMPORTANT INSTRUCTIONS FOR REQUIRED FIXES:
- In "requiredFixes", "originalPhrasing" MUST be an exact, verbatim substring copied directly from SUBMITTED TEXT so it can be highlighted and replaced cleanly.
- Order "requiredFixes" strictly by priorityLevel (1 = Factual Errors, 2 = Logical/Completeness Gaps, 3 = Structure & Audience Fit, 4 = Clarity & Readability, 5 = Tone, Style & Word Choice).

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
    "Specific strength of the text #2",
    "Specific strength of the text #3"
  ],
  "requiredFixes": [
    {
      "priorityLevel": 1,
      "priorityCategory": "1. Factual Errors or Misleading Info",
      "originalPhrasing": "Exact verbatim quote from the submitted text",
      "suggestedPhrasing": "Concrete corrected phrasing in the text's native language",
      "explanation": "Why this fix is required"
    }
  ],
  "suggestionsForImprovement": [
    {
      "area": "SEO / GEO Quote-Readiness or Stylistic Polish",
      "originalSnippet": "Exact verbatim snippet from the text",
      "suggestedImprovement": "Concrete optional improvement",
      "rationale": "Why this optional improvement helps"
    }
  ],
  "itemsNeedingFurtherChecking": [
    {
      "claimOrItem": "Specific claim, statistic, or date",
      "reasonUnverified": "Why it requires verification or how it was verified",
      "status": "Verified Fact"
    }
  ],
  "editedPublishReadyMarkdown": ${
    includeFullEditedVersion && isShortText
      ? '"Full edited, publish-ready version of the text in Markdown with all required fixes applied and zero em-dashes (—)."'
      : "null"
  }
}`;

    const { text: rawText } = await generateStructuredContent({
      apiKey,
      model,
      preferredGroqModel: "openai/gpt-oss-safeguard-20b",
      systemInstruction: EDITOR_SYSTEM_PROMPT,
      userPrompt,
      temperature: 0.25,
      useGoogleSearch: true,
      jsonMode: true,
      maxTokens: 4096,
    });

    const parsed = extractJsonFromText<EditorOutputPackage>(rawText);

    // Ensure requiredFixes are sorted strictly 1 -> 5
    if (Array.isArray(parsed.requiredFixes)) {
      parsed.requiredFixes.sort(
        (a, b) => (a.priorityLevel || 5) - (b.priorityLevel || 5)
      );
    }

    if (includeFullEditedVersion) {
      if (
        !parsed.editedPublishReadyMarkdown ||
        parsed.editedPublishReadyMarkdown.length < submittedText.length * 0.75
      ) {
        parsed.editedPublishReadyMarkdown = applyEditorialFixesToMarkdown(
          submittedText,
          parsed
        );
      } else {
        parsed.editedPublishReadyMarkdown =
          parsed.editedPublishReadyMarkdown.replace(/\s*—\s*/g, ", ");
      }
    }

    return NextResponse.json({ result: parsed, mode: "ai_live" });
  } catch (error: any) {
    console.warn("Editor API error:", error?.message);
    return NextResponse.json(
      { error: formatGeminiError(error, providedKey) },
      { status: 500 }
    );
  }
}
