export interface FeasibilitySignal {
  source: "google_news" | "reddit" | "x_twitter" | "authoritative_web";
  title: string;
  summary: string;
  url?: string;
  date?: string;
}

export interface FeasibilityResult {
  canWriteAuthoritatively: boolean;
  confidenceScore: number; // 0-100
  feasibilityVerdict: string;
  targetLanguageDetected: string;
  targetCountryDetected: string;
  missingCriticalInfo?: string | null;
  assumptionsMade: {
    targetAudience: string;
    websiteBrandTone: string;
    targetWordCount: number;
  };
  latestNewsSummary: string[];
  redditInsights: string[];
  xTwitterInsights: string[];
  authoritativeSources: { title: string; url: string; snippet?: string }[];
}

export interface Stage1CompetitorResearch {
  primaryKeyword: string;
  secondaryKeywords: string[];
  relatedEntities: string[];
  paaQuestions: string[];
  competitorAnalysisSummary: string;
  contentGapsIdentified: string[];
}

export interface Stage2GeoPrompt {
  searchStyle: "Informational" | "How-To" | "Best / Top" | "Comparison" | "Edge-Case";
  prompt: string;
  quoteReadyDirectAnswer: string;
}

export interface Stage3OutlineSection {
  headingLevel: "H2" | "H3";
  headingText: string;
  directOpeningDraft: string;
  keyPointsToCover: string[];
}

export interface Stage3Outline {
  h1Title: string;
  directIntroDraft: string;
  sections: Stage3OutlineSection[];
  faqQuestions: string[];
  practicalConclusionSummary: string;
}

export interface Stage5MetaOption {
  title: string;
  charCount: number;
  isRecommended?: boolean;
}

export interface Stage5MetaDescOption {
  description: string;
  charCount: number;
  isRecommended?: boolean;
}

export interface Stage5MetaAndSlug {
  metaTitles: Stage5MetaOption[];
  metaDescriptions: Stage5MetaDescOption[];
  urlSlug: string;
}

export interface Stage6FeaturedImage {
  aspectRatio: "16:9";
  imageGenerationPrompt: string;
  altText: string;
  englishFilename: string;
}

export interface Stage7FactCheckItem {
  claim: string;
  status: "Verified" | "Corrected" | "Removed";
  sourceTitle: string;
  sourceUrl: string;
  verificationNote: string;
}

export interface Stage8And9Audit {
  uniquenessVerified: boolean;
  uniquenessNotes: string;
  mathematicalAndEmpiricalAudit: string;
  bannedPatternsRemoved: string[];
  emDashCount: number;
  characterSetPurityVerified: boolean;
  characterSetPurityNote: string;
  sentenceLengthVarietyScore: number;
}

export interface WriterOutputPackage {
  assumptions: {
    targetLanguage: string;
    targetMarket: string;
    targetAudience: string;
    websiteBrand: string;
    targetWordCount: number;
  };
  stage1CompetitorResearch: Stage1CompetitorResearch;
  stage2GeoPrompts: Stage2GeoPrompt[];
  stage3Outline: Stage3Outline;
  stage4FullArticleMarkdown: string;
  stage5MetaAndSlug: Stage5MetaAndSlug;
  stage6FeaturedImage: Stage6FeaturedImage;
  stage7FactCheckTable: Stage7FactCheckItem[];
  stage8And9QualityAudit: Stage8And9Audit;
  groundingUrls?: { title: string; url: string }[];
}

export interface EditorRequiredFix {
  priorityLevel: 1 | 2 | 3 | 4 | 5;
  priorityCategory:
    | "1. Factual Errors or Misleading Info"
    | "2. Logical Failures, Contradictions & Gaps"
    | "3. Structural Issues & Audience Fit"
    | "4. Clarity & Readability"
    | "5. Stylistic Polish & Phrasing";
  originalPhrasing: string;
  suggestedPhrasing: string;
  explanation: string;
}

export interface EditorOutputPackage {
  detectedLanguage: string;
  isRtlLanguage: boolean;
  rtlDirectionAuditNote?: string;
  assumptions: string[];
  clarificationQuestionIfBlocked?: string | null;
  overallAssessment: string;
  publicationReadyVerdict: "Ready to Publish" | "Needs Minor Revisions" | "Needs Major Revisions";
  purposeAndAudienceAnalysis: {
    identifiedPurpose: string;
    targetAudience: string;
    coreMessage: string;
    intentVsExecutionGaps: string[];
  };
  strengths: string[];
  requiredFixes: EditorRequiredFix[];
  suggestionsForImprovement: {
    area: string;
    originalSnippet?: string;
    suggestedImprovement: string;
    rationale: string;
  }[];
  itemsNeedingFurtherChecking: {
    claimOrItem: string;
    reasonUnverified: string;
    status: "Verified Fact" | "Interpretation" | "Estimate" | "Speculation" | "Needs Verification";
  }[];
  editedPublishReadyMarkdown?: string;
}
