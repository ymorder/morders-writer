import { NextRequest, NextResponse } from "next/server";
import {
  hasGeminiKey,
  generateStructuredContent,
  extractJsonFromText,
  formatGeminiError,
} from "@/lib/gemini";
import { EDITOR_SYSTEM_PROMPT } from "@/lib/prompts";
import { EditorOutputPackage } from "@/types/pipeline";
import { sanitizeArticleText } from "@/app/api/write/route";

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
    if (orig && repl && orig.length > 3 && updated.includes(orig)) {
      updated = updated.replace(orig, repl);
    }
  }

  // Apply optional suggestions where an exact originalSnippet matches
  for (const sug of parsed.suggestionsForImprovement || []) {
    const orig = sug.originalSnippet?.trim();
    const repl = sug.suggestedImprovement?.trim();
    if (orig && repl && orig.length > 5 && updated.includes(orig)) {
      updated = updated.replace(orig, repl);
    }
  }

  return sanitizeArticleText(updated).cleaned;
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

    const textForAuditPrompt =
      submittedText.length > 3800
        ? submittedText.slice(0, 3800)
        : submittedText;

    const userPrompt = `Analyze and ruthlessly edit the following submitted text according to your Chief Content Editor & Copy-Editor instructions.
CURRENT DATE: October 2026 (2026 is the PRESENT year, NOT the future!).

${taskCardBlock}

${standingRulesBlock}

SUBMITTED TEXT:
"""
${textForAuditPrompt}
"""

MANDATORY EDITORIAL AUDIT CHECKS:
1. TEMPORAL ERRORS (2026 IS NOW, NOT THE FUTURE): Flag any sentence that talks about 2026 in the future tense (such as "מה עומד לקרות ב-2026?", "צפוי להיות ב-2026", "שנת 2026 תביא") and rewrite it in the present tense ("מה קורה בפועל ב-2026?", "במהלך 2026").
2. BROKEN SYNTAX & SUBJECT-PREDICATE MISMATCHES: Flag illogical sentences like "סייבר ב-2026 צפוי להיות נקודת מפנה" (a field like "cyber" cannot "be a turning point"!) and rewrite into natural, logical prose.
3. PUNCTUATION & GRAMMAR: Flag any comma after a question mark ("?,") or exclamation mark ("!,"), any construct-state error ("הקרן הפנסיה" -> "קרן הפנסיה"), and any gender-number mismatch ("שתי מוצרים" -> "שני מוצרים").
4. In "requiredFixes", "originalPhrasing" MUST be an exact, verbatim substring copied directly from SUBMITTED TEXT so it can be replaced cleanly.
5. Order "requiredFixes" strictly by priorityLevel (1 = Factual/Temporal Errors, 2 = Logical/Subject-Predicate Failures, 3 = Structure & Audience Fit, 4 = Clarity, Grammar & Punctuation, 5 = Tone & Style).

Return ONLY a valid JSON object matching this exact schema:
{
  "detectedLanguage": "Name of detected language (e.g., English, Hebrew, Spanish)",
  "isRtlLanguage": false,
  "rtlDirectionAuditNote": "For Hebrew/Arabic, note check on construct state (סמיכות), number-gender agreement, tense accuracy (2026 = present), and punctuation placement.",
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
      "priorityCategory": "1. Factual or Temporal Errors",
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
  "editedPublishReadyMarkdown": null
}`;

    const { text: rawText } = await generateStructuredContent({
      apiKey,
      model,
      preferredGroqModel: "openai/gpt-oss-120b",
      systemInstruction: EDITOR_SYSTEM_PROMPT,
      userPrompt,
      temperature: 0.2,
      useGoogleSearch: true,
      jsonMode: true,
      maxTokens: 1600,
    });

    const parsed = extractJsonFromText<EditorOutputPackage>(rawText);

    if (Array.isArray(parsed.requiredFixes)) {
      parsed.requiredFixes.sort(
        (a, b) => (a.priorityLevel || 5) - (b.priorityLevel || 5)
      );
    }

    if (includeFullEditedVersion) {
      // First apply deterministic replacements + punctuation/grammar cleanup
      let preCleaned = applyEditorialFixesToMarkdown(submittedText, parsed);

      // Next, run a dedicated AI Copy-Editor rewrite pass on the text (up to 3,600 chars) so every sentence is genuinely copy-edited
      if (preCleaned.length <= 4200) {
        try {
          const rewritePrompt = `You are a veteran Chief Copy-Editor (עורך לשון ועורך תוכן ראשי).
Rewrite and polish the following article so every sentence is 100% natural, grammatically flawless, and publication-ready.

MANDATORY COPY-EDITING RULES:
1. CURRENT DATE IS OCTOBER 2026: 2026 is the PRESENT, NOT the future! Rewrite any future-tense reference to 2026 (such as "מה עומד לקרות ב-2026?", "צפוי להיות ב-2026", "שנת 2026 תביא") into present-tense 2026 reality ("מה קורה בפועל ב-2026?", "במהלך 2026").
2. LOGICAL HEBREW SYNTAX: Fix any broken subject-predicate phrasing (e.g., never write "סייבר ב-2026 צפוי להיות נקודת מפנה" — write "תחום הסייבר עובר במהלך 2026 שינוי מהותי..."). Remove all translated AI clichés ("נקודת מפנה", "שלב קריטי", "בעולם המשתנה").
3. STRICT HEBREW GRAMMAR: Enforce proper construct state (סמיכות: "קרן הפנסיה", "דמי הניהול", never "הקרן הפנסיה") and number-gender agreement (שם המספר: "שני מוצרים", "שתי אפשרויות").
4. PUNCTUATION PERFECTION: Never put a comma after a question mark (?,) or exclamation mark (!,). Never use em-dashes (—) or spaced hyphens ( - ) as sentence pause punctuation.
5. Preserve all Markdown headings (#, ##, ###), Markdown tables, and factual depth. Output ONLY the full edited Markdown text starting with "#".

TEXT TO EDIT:
${preCleaned}`;

          const { text: rewrittenText } = await generateStructuredContent({
            apiKey,
            model,
            preferredGroqModel: "openai/gpt-oss-120b",
            systemInstruction: EDITOR_SYSTEM_PROMPT,
            userPrompt: rewritePrompt,
            temperature: 0.2,
            useGoogleSearch: false,
            jsonMode: false,
            maxTokens: 3200,
          });

          const finalCleaned = sanitizeArticleText(rewrittenText).cleaned;
          if (finalCleaned.length >= preCleaned.length * 0.65) {
            preCleaned = finalCleaned;
          }
        } catch (rewriteErr) {
          console.warn(
            "Dedicated copy-edit pass fallback to deterministic fixes:",
            rewriteErr
          );
        }
      }

      parsed.editedPublishReadyMarkdown = preCleaned;
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
