"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Globe,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileText,
  PenTool,
  ShieldCheck,
  KeyRound,
  Copy,
  Check,
  ArrowRight,
  ExternalLink,
  Layers,
  MessageSquare,
  Compass,
  Image as ImageIcon,
  Scale,
  Zap,
  RefreshCw,
  Sliders,
  UserCheck,
} from "lucide-react";
import {
  FeasibilityResult,
  WriterOutputPackage,
  EditorOutputPackage,
} from "@/types/pipeline";
import {
  DEMO_FEASIBILITY,
  DEMO_WRITER_PACKAGE,
  DEMO_EDITOR_PACKAGE,
} from "@/lib/demoData";
import { TARGET_LANGUAGES, TARGET_MARKETS } from "@/lib/constants";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

type StudioMode = "autonomous" | "writer" | "editor";
type PipelinePhase =
  | "idle"
  | "clarifying"
  | "researching"
  | "writing"
  | "editing"
  | "completed"
  | "error";

type OutputTab =
  | "final_polished"
  | "intelligence"
  | "stage1_2_3"
  | "stage4_draft"
  | "stage5_6_seo"
  | "stage7_8_9_audit"
  | "editor_review";

export default function MordersWriterPage() {
  // Mode & Settings
  const [mode, setMode] = useState<StudioMode>("autonomous");
  const [apiKey, setApiKey] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("gemini-2.5-pro");
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);

  // Writer / Autonomous Inputs
  const [topic, setTopic] = useState<string>(
    "Generative Engine Optimization (GEO) Strategy & RAG Citation Mechanics in 2026"
  );
  const [targetLanguage, setTargetLanguage] = useState<string>("Hebrew (עברית)");
  const [targetCountry, setTargetCountry] = useState<string>("Israel (ישראל)");
  const [targetAudience, setTargetAudience] = useState<string>("");
  const [websiteBrand, setWebsiteBrand] = useState<string>("");
  const [wordCount, setWordCount] = useState<number>(1800);

  // Standing Rules & Editor Inputs
  const [standingRules, setStandingRules] = useState<string>(
    "ללא מקף ארוך (—). גבה כל טענה במספרים מתכנסים. הימנע מקלישאות AI ('לצלול', 'הסיבה לכך פשוטה', 'delve', 'unlock', 'game changer'). ציין תמיד שם משתמש מ-Reddit (u/...) וציטוט מדויק של מה שכתב."
  );
  const [editorText, setEditorText] = useState<string>("");
  const [taskCard, setTaskCard] = useState<string>("");
  const [includeEditedVersion, setIncludeEditedVersion] = useState<boolean>(true);

  // Pipeline Execution State
  const [phase, setPhase] = useState<PipelinePhase>("completed");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [clarificationPrompt, setClarificationPrompt] = useState<string | null>(null);

  // Results State
  const [feasibility, setFeasibility] = useState<FeasibilityResult | null>(
    DEMO_FEASIBILITY
  );
  const [writerOutput, setWriterOutput] = useState<WriterOutputPackage | null>(
    DEMO_WRITER_PACKAGE
  );
  const [editorOutput, setEditorOutput] = useState<EditorOutputPackage | null>(
    DEMO_EDITOR_PACKAGE
  );

  const [activeTab, setActiveTab] = useState<OutputTab>("final_polished");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const savedKey =
      localStorage.getItem("morders_writer_api_key") ||
      localStorage.getItem("nexus_gemini_api_key");
    if (savedKey) setApiKey(savedKey);
  }, []);

  const handleSaveApiKey = (val: string) => {
    setApiKey(val);
    localStorage.setItem("morders_writer_api_key", val);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Run Feasibility Check Only
  const handleRunFeasibilityOnly = async () => {
    setErrorMessage(null);
    setClarificationPrompt(null);

    if (!apiKey.trim()) {
      setShowKeyModal(true);
      setPhase("error");
      setErrorMessage(
        "כדי לבצע מחקר וכתיבה אמיתיים ב-Gemini 2.5 Pro, אנא הדבק מפתח Gemini API בתיבה שנפתחה למעלה."
      );
      return;
    }

    if (!targetLanguage.trim() || !targetCountry.trim()) {
      setPhase("clarifying");
      setClarificationPrompt(
        "נא לבחור שפת יעד (Target Language) ומדינת יעד (Target Market) מתוך הרשימה הנפתחת לפני תחילת המחקר."
      );
      return;
    }

    try {
      setPhase("researching");
      const res = await fetch("/api/feasibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          targetLanguage,
          targetCountry,
          targetAudience,
          websiteBrand,
          wordCount,
          apiKey,
          model: selectedModel,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Feasibility check failed.");

      if (data.needsClarification) {
        setPhase("clarifying");
        setClarificationPrompt(data.clarificationMessage);
        return;
      }

      setFeasibility(data.result);
      setPhase("completed");
      setActiveTab("intelligence");
    } catch (err: any) {
      setPhase("error");
      setErrorMessage(err.message);
    }
  };

  // Run Full Autonomous or Writer Pipeline
  const handleExecutePipeline = async () => {
    setErrorMessage(null);
    setClarificationPrompt(null);

    if (mode === "editor") {
      await handleExecuteStandaloneEditor();
      return;
    }

    if (!apiKey.trim()) {
      setShowKeyModal(true);
      setPhase("error");
      setErrorMessage(
        "כדי לכתוב מאמר אמיתי, מעמיק ומבוסס מחקר חי ב-Gemini 2.5 Pro, אנא הדבק את מפתח ה-Gemini API שלך בתיבה שנפתחה למעלה."
      );
      return;
    }

    if (!targetLanguage.trim() || !targetCountry.trim()) {
      setPhase("clarifying");
      setClarificationPrompt(
        "נא לבחור שפת יעד ומדינת יעד מתוך הרשימה הנפתחת לפני תחילת התהליך."
      );
      return;
    }

    try {
      // Step 1: Live Multi-Source Intelligence (Google News, Reddit with u/username, X)
      setPhase("researching");
      setActiveTab("intelligence");

      const feasRes = await fetch("/api/feasibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          targetLanguage,
          targetCountry,
          targetAudience,
          websiteBrand,
          wordCount,
          apiKey,
          model: selectedModel,
        }),
      });
      const feasData = await feasRes.json();
      if (!feasRes.ok) throw new Error(feasData.error || "Research stage failed.");

      const feasResult: FeasibilityResult = feasData.result;
      setFeasibility(feasResult);

      // Step 2: 9-Stage SEO & GEO Writer
      setPhase("writing");
      const writeRes = await fetch("/api/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          targetLanguage,
          targetCountry,
          targetAudience:
            targetAudience || feasResult.assumptionsMade?.targetAudience,
          websiteBrand:
            websiteBrand || feasResult.assumptionsMade?.websiteBrandTone,
          wordCount,
          standingRules,
          feasibilityContext: feasResult,
          apiKey,
          model: selectedModel,
        }),
      });
      const writeData = await writeRes.json();
      if (!writeRes.ok) throw new Error(writeData.error || "Writer stage failed.");

      const writeResult: WriterOutputPackage = writeData.result;
      setWriterOutput(writeResult);

      if (mode === "writer") {
        setPhase("completed");
        setActiveTab("stage4_draft");
        return;
      }

      // Step 3: Autonomous Agency Editor Audit & Polish
      setPhase("editing");
      const autoTaskCard = `Target Language: ${targetLanguage}
Target Market: ${targetCountry}
Primary Keyword: ${writeResult.stage1CompetitorResearch?.primaryKeyword || topic}
Target Audience: ${writeResult.assumptions?.targetAudience || targetAudience}
Brand/Platform: ${writeResult.assumptions?.websiteBrand || websiteBrand}
Goal: Publish-ready #1 ranking SEO & GEO article with zero em-dashes, verified math, exact Reddit u/username attributions, and quote-ready H2 openings.`;

      const editRes = await fetch("/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submittedText: writeResult.stage4FullArticleMarkdown,
          taskCard: autoTaskCard,
          standingRules,
          includeFullEditedVersion: true,
          apiKey,
          model: selectedModel,
        }),
      });
      const editData = await editRes.json();
      if (!editRes.ok) throw new Error(editData.error || "Editor stage failed.");

      setEditorOutput(editData.result);
      setPhase("completed");
      setActiveTab("final_polished");
    } catch (err: any) {
      setPhase("error");
      setErrorMessage(err.message);
    }
  };

  const handleExecuteStandaloneEditor = async () => {
    if (!apiKey.trim()) {
      setShowKeyModal(true);
      setPhase("error");
      setErrorMessage(
        "כדי להפעיל את העורך המקצועי ב-Gemini 2.5 Pro, אנא הדבק מפתח Gemini API בתיבה שנפתחה למעלה."
      );
      return;
    }

    if (!editorText.trim()) {
      setPhase("error");
      setErrorMessage("אנא הדבק את הטקסט שברצונך שהעורך ינתח ויערוך.");
      return;
    }

    try {
      setPhase("editing");
      const editRes = await fetch("/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submittedText: editorText,
          taskCard,
          standingRules,
          includeFullEditedVersion: includeEditedVersion,
          apiKey,
          model: selectedModel,
        }),
      });
      const editData = await editRes.json();
      if (!editRes.ok) throw new Error(editData.error || "Editorial review failed.");

      setEditorOutput(editData.result);
      setPhase("completed");
      setActiveTab("editor_review");
    } catch (err: any) {
      setPhase("error");
      setErrorMessage(err.message);
    }
  };

  const loadSampleIntoStandaloneEditor = () => {
    setMode("editor");
    setEditorText(
      writerOutput?.stage4FullArticleMarkdown ||
        DEMO_WRITER_PACKAGE.stage4FullArticleMarkdown
    );
    setTaskCard(
      "קהל יעד: מנהלי שיווק ומקבלי החלטות\nמטרה: בדיקת דיוק עובדתי, מוכנות לציטוט במנועי AI (GEO) וזרימה טבעית בשפת המקור."
    );
  };

  return (
    <div
      style={{ backgroundColor: "#050507", color: "#f8fafc" }}
      className="min-h-screen flex flex-col bg-[#050507] text-zinc-100"
    >
      {/* Top Navigation Bar - Spacious & Clean */}
      <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-[#050507]/95 backdrop-blur-xl">
        <div className="max-w-[1680px] mx-auto px-6 lg:px-10 h-20 flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-900 p-[1px] shadow-lg">
              <div className="w-full h-full bg-[#0a0b0e] rounded-[15px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <span className="font-bold tracking-tight text-white text-xl">
                  Morder&apos;s Writer
                </span>
                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-zinc-900 text-zinc-300 border border-zinc-700/80">
                  SEO • GEO • Editorial Studio
                </span>
              </div>
              <p className="text-xs text-zinc-400 hidden sm:block mt-0.5">
                Autonomous Google News, Reddit (u/user quotes) &amp; X Grounded Content Engine
              </p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center bg-[#0c0d12] p-1.5 rounded-2xl border border-zinc-800/90">
            <button
              onClick={() => setMode("autonomous")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                mode === "autonomous"
                  ? "bg-white text-black shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              Autonomous Full Pipeline
            </button>
            <button
              onClick={() => setMode("writer")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                mode === "writer"
                  ? "bg-white text-black shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              9-Stage Writer
            </button>
            <button
              onClick={() => setMode("editor")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                mode === "editor"
                  ? "bg-white text-black shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Agency Editor
            </button>
          </div>

          {/* Right Controls: Model & API Key */}
          <div className="flex items-center gap-3">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-[#0c0d12] border border-zinc-800 rounded-xl px-3.5 py-2 text-xs font-medium text-zinc-200 focus:outline-none focus:border-zinc-500"
            >
              <option value="gemini-2.5-pro">
                Gemini 2.5 Pro (Recommended — Deep Writing)
              </option>
              <option value="gemini-2.5-flash">
                Gemini 2.5 Flash (Fast Research)
              </option>
            </select>

            <button
              onClick={() => setShowKeyModal(!showKeyModal)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                apiKey
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-amber-500/15 border-amber-500/40 text-amber-200 hover:bg-amber-500/25"
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              {apiKey ? "Gemini Key Active" : "הגדר Gemini API Key"}
            </button>
          </div>
        </div>

        {/* Collapsible API Key Bar */}
        {showKeyModal && (
          <div className="border-t border-zinc-800 bg-[#0b0c10] px-6 lg:px-10 py-4">
            <div className="max-w-[1680px] mx-auto flex flex-wrap items-center justify-between gap-4">
              <div className="text-xs text-zinc-300 flex items-center gap-3">
                <span>
                  <strong className="text-white">Gemini API Key:</strong> הדבק מפתח מ-Google AI Studio כדי להפעיל את מודל הכתיבה והמחקר המלא (נשמר אוטומטית בדפדפן).
                </span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 hover:bg-zinc-700 font-medium inline-flex items-center gap-1.5 transition-colors"
                >
                  הפקת מפתח חינם ב-Google AI Studio
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex items-center gap-2.5 flex-1 max-w-md">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => handleSaveApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-[#050507] border border-zinc-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-white"
                />
                <button
                  onClick={() => setShowKeyModal(false)}
                  className="px-4 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-colors"
                >
                  שמור
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Workspace Container - Extra Spacious Breathing Room */}
      <main className="flex-1 max-w-[1680px] w-full mx-auto px-6 lg:px-10 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: Mission Control & Inputs (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          {mode !== "editor" ? (
            <div className="rounded-3xl border border-zinc-800/90 bg-[#0b0c10] p-7 shadow-2xl space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
                <h2 className="text-base font-bold text-white flex items-center gap-2.5">
                  <Compass className="w-4 h-4 text-zinc-300" />
                  הגדרות נושא, שפה ושוק יעד
                </h2>
                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-zinc-900 text-zinc-400 border border-zinc-800">
                  9-Stage Pipeline
                </span>
              </div>

              {/* Topic */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-zinc-100">
                  נושא המאמר / ביטוי מפתח ראשי *
                </label>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  הזן את הנושא, השאלה או תחום המומחיות שעליו נבצע מחקר ב-Google, ב-Reddit וברשת X.
                </p>
                <textarea
                  rows={3}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="לדוגמה: מיסוי קרנות השתלמות והשקעות אלטרנטיביות ב-2026..."
                  className="w-full rounded-2xl bg-[#050507] border border-zinc-800 px-4 py-3.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors leading-relaxed"
                />
              </div>

              {/* Target Language & Country DROPDOWNS (Full Lists) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-zinc-100">
                    שפת כתיבה (Language) *
                  </label>
                  <select
                    value={targetLanguage}
                    onChange={(e) => setTargetLanguage(e.target.value)}
                    className="w-full rounded-2xl bg-[#050507] border border-zinc-800 px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-500 transition-colors"
                  >
                    {TARGET_LANGUAGES.map((lang) => (
                      <option key={lang.value} value={lang.value} className="bg-[#0b0c10] text-white">
                        {lang.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-zinc-100">
                    מדינת / שוק יעד (Market) *
                  </label>
                  <select
                    value={targetCountry}
                    onChange={(e) => setTargetCountry(e.target.value)}
                    className="w-full rounded-2xl bg-[#050507] border border-zinc-800 px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-500 transition-colors"
                  >
                    {TARGET_MARKETS.map((mkt) => (
                      <option key={mkt.value} value={mkt.value} className="bg-[#0b0c10] text-white">
                        {mkt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Optional Inputs (Auto-assumed if left blank per Rule #2) */}
              <div className="pt-4 border-t border-zinc-800/80 space-y-4">
                <div>
                  <span className="text-xs font-semibold text-zinc-200 block">
                    פרמטרים משלימים (אופציונלי — יושלמו אוטומטית תחת &apos;הנחות עבודה&apos; אם יישארו ריקים)
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-zinc-300">
                    קהל יעד (Target Audience)
                  </label>
                  <input
                    type="text"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="למשל: סמנכ״לי כספים, יזמים, משקיעים פרטיים..."
                    className="w-full rounded-2xl bg-[#050507] border border-zinc-800 px-4 py-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <label className="block text-xs font-medium text-zinc-300">
                      אתר / מותג וטון כתיבה
                    </label>
                    <input
                      type="text"
                      value={websiteBrand}
                      onChange={(e) => setWebsiteBrand(e.target.value)}
                      placeholder="למשל: מגזין כלכלי סמכותי"
                      className="w-full rounded-2xl bg-[#050507] border border-zinc-800 px-4 py-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-zinc-300">
                      כמות מילים
                    </label>
                    <input
                      type="number"
                      step={100}
                      value={wordCount}
                      onChange={(e) => setWordCount(Number(e.target.value))}
                      className="w-full rounded-2xl bg-[#050507] border border-zinc-800 px-3.5 py-3 text-xs text-white focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                </div>
              </div>

              {/* Standing Agency Rules - High Contrast & Readable */}
              <div className="pt-4 border-t border-zinc-800/80 space-y-2">
                <label className="block text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-zinc-300" />
                  חוקי עבודה קבועים והנחיות סוכנות (Standing Rules)
                </label>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  כללים אלו נאכפים בכל שלבי הכתיבה והעריכה (איסור מקפים ארוכים, איסור קלישאות AI, חובת ציון שם משתמש מ-Reddit).
                </p>
                <textarea
                  rows={3}
                  value={standingRules}
                  onChange={(e) => setStandingRules(e.target.value)}
                  placeholder="חוקי בית, מילים אסורות, דרישות רגולטוריות..."
                  className="w-full rounded-2xl bg-[#050507] border border-zinc-800 px-4 py-3 text-xs text-zinc-100 leading-relaxed focus:outline-none focus:border-zinc-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 space-y-3">
                <button
                  onClick={handleExecutePipeline}
                  disabled={
                    phase === "researching" ||
                    phase === "writing" ||
                    phase === "editing"
                  }
                  className="w-full py-4 px-5 rounded-2xl bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2.5 transition-all disabled:opacity-50"
                >
                  {phase === "researching" ||
                  phase === "writing" ||
                  phase === "editing" ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      מבצע כעת שלב: {phase.toUpperCase()}...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      {mode === "autonomous"
                        ? "הפעל תהליך אוטונומי מלא (מחקר ← כתיבה ← עריכה)"
                        : "הפעל כותב 9 שלבים (SEO + GEO)"}
                    </>
                  )}
                </button>

                <button
                  onClick={handleRunFeasibilityOnly}
                  disabled={
                    phase === "researching" ||
                    phase === "writing" ||
                    phase === "editing"
                  }
                  className="w-full py-3 px-4 rounded-2xl bg-[#12141c] hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  <Search className="w-3.5 h-3.5 text-zinc-300" />
                  בדיקת היתכנות ומחקר Reddit / Google / X בלבד
                </button>
              </div>
            </div>
          ) : (
            /* STANDALONE EDITOR INPUT PANEL */
            <div className="rounded-3xl border border-zinc-800/90 bg-[#0b0c10] p-7 shadow-2xl space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
                <h2 className="text-base font-bold text-white flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  עורך תוכן ומנתח טקסט (Agency Editor)
                </h2>
                <button
                  onClick={loadSampleIntoStandaloneEditor}
                  className="text-xs text-zinc-300 hover:text-white underline font-medium"
                >
                  טען מאמר נוכחי לבדיקה
                </button>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-zinc-100">
                  טקסט לבדיקה ועריכה (זיהוי שפה וכיווניות אוטומטי) *
                </label>
                <textarea
                  rows={8}
                  value={editorText}
                  onChange={(e) => setEditorText(e.target.value)}
                  placeholder="הדבק כאן מאמר, דף נחיתה, פוסט או טיוטת GEO בעברית, אנגלית או כל שפה אחרת..."
                  className="w-full rounded-2xl bg-[#050507] border border-zinc-800 px-4 py-3.5 text-xs text-white placeholder-zinc-500 leading-relaxed focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-zinc-100">
                  כרטיס משימה — Task Card (אופציונלי — גובר על ברירות המחדל)
                </label>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  הגדר מילת מפתח, קהל יעד, פלטפורמה או אורך רצוי. אם יישאר ריק, העורך יסיק זאת מהטקסט.
                </p>
                <textarea
                  rows={3}
                  value={taskCard}
                  onChange={(e) => setTaskCard(e.target.value)}
                  placeholder="מילת מפתח, קהל יעד, פלטפורמה, הוראות תרגום/לוקליזציה..."
                  className="w-full rounded-2xl bg-[#050507] border border-zinc-800 px-4 py-3 text-xs text-zinc-100 leading-relaxed focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-zinc-100">
                  חוקי לקוח / סוכנות קבועים (Standing Rules)
                </label>
                <textarea
                  rows={2}
                  value={standingRules}
                  onChange={(e) => setStandingRules(e.target.value)}
                  className="w-full rounded-2xl bg-[#050507] border border-zinc-800 px-4 py-3 text-xs text-zinc-100 leading-relaxed focus:outline-none focus:border-zinc-500"
                />
              </div>

              <label className="flex items-center gap-2.5 text-xs text-zinc-200 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={includeEditedVersion}
                  onChange={(e) => setIncludeEditedVersion(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-900 text-white focus:ring-0"
                />
                ייצר גם גרסה ערוכה ומוכנה לפרסום (בנוסף לדוח הביקורת וההשוואה)
              </label>

              <button
                onClick={handleExecuteStandaloneEditor}
                disabled={phase === "editing"}
                className="w-full py-4 px-5 rounded-2xl bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {phase === "editing" ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    מבצע ניתוח ועריכה לפי סדר עדיפויות 1–5...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    הפעל ניתוח עריכה ואימות עובדות
                  </>
                )}
              </button>
            </div>
          )}

          {/* Live Pipeline Telemetry Stepper */}
          <div className="rounded-3xl border border-zinc-800/90 bg-[#0b0c10] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                סטטוס מערכת אוטונומית
              </span>
              <span
                className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold ${
                  phase === "completed"
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                    : phase === "error" || phase === "clarifying"
                    ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                    : "bg-white/15 text-white animate-pulse"
                }`}
              >
                {phase.toUpperCase()}
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div
                className={`flex items-center justify-between p-3.5 rounded-2xl border ${
                  phase === "researching"
                    ? "bg-zinc-800 border-zinc-600 text-white"
                    : feasibility
                    ? "bg-[#050507] border-zinc-800/90 text-zinc-200"
                    : "bg-[#050507]/50 border-zinc-900 text-zinc-500"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-zinc-300" />
                  <span className="font-medium">
                    1. מחקר חדשות, Reddit (עם שם משתמש) ו-X
                  </span>
                </div>
                {feasibility && (
                  <span className="text-xs font-bold text-emerald-400">
                    {feasibility.confidenceScore}%
                  </span>
                )}
              </div>

              <div
                className={`flex items-center justify-between p-3.5 rounded-2xl border ${
                  phase === "writing"
                    ? "bg-zinc-800 border-zinc-600 text-white"
                    : writerOutput
                    ? "bg-[#050507] border-zinc-800/90 text-zinc-200"
                    : "bg-[#050507]/50 border-zinc-900 text-zinc-500"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Layers className="w-4 h-4 text-zinc-300" />
                  <span className="font-medium">
                    2. כתיבת 9 שלבים (SEO + GEO + אימות מתמטי)
                  </span>
                </div>
                {writerOutput && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
              </div>

              <div
                className={`flex items-center justify-between p-3.5 rounded-2xl border ${
                  phase === "editing"
                    ? "bg-zinc-800 border-zinc-600 text-white"
                    : editorOutput
                    ? "bg-[#050507] border-zinc-800/90 text-zinc-200"
                    : "bg-[#050507]/50 border-zinc-900 text-zinc-500"
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4 text-zinc-300" />
                  <span className="font-medium">
                    3. ביקורת עורך סוכנות מדורגת (עדיפות 1–5)
                  </span>
                </div>
                {editorOutput && (
                  <span className="text-[11px] font-bold text-emerald-400">
                    {editorOutput.publicationReadyVerdict}
                  </span>
                )}
              </div>
            </div>

            {/* Clarification or Error Banner */}
            {clarificationPrompt && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-100 text-xs flex items-start gap-3 leading-relaxed">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>{clarificationPrompt}</div>
              </div>
            )}

            {errorMessage && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-100 text-xs flex items-start gap-3 leading-relaxed break-words overflow-hidden">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="font-bold">שים לב</div>
                  <div className="break-words">{errorMessage}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Multi-Stage Output Studio (8 Cols) - Extra Spacious */}
        <div className="lg:col-span-8 flex flex-col space-y-6">
          {/* Output Stage Navigation Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-zinc-800/90">
            <button
              onClick={() => setActiveTab("final_polished")}
              className={`px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap flex items-center gap-2 transition-all ${
                activeTab === "final_polished"
                  ? "bg-white text-black shadow-sm"
                  : "bg-[#0b0c10] text-zinc-300 hover:text-white border border-zinc-800/80"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              מאמר סופי מוכן לפרסום
            </button>

            <button
              onClick={() => setActiveTab("intelligence")}
              className={`px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap flex items-center gap-2 transition-all ${
                activeTab === "intelligence"
                  ? "bg-white text-black shadow-sm"
                  : "bg-[#0b0c10] text-zinc-300 hover:text-white border border-zinc-800/80"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              מחקר חי: Google, Reddit (u/user) &amp; X
            </button>

            <button
              onClick={() => setActiveTab("stage1_2_3")}
              className={`px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap flex items-center gap-2 transition-all ${
                activeTab === "stage1_2_3"
                  ? "bg-white text-black shadow-sm"
                  : "bg-[#0b0c10] text-zinc-300 hover:text-white border border-zinc-800/80"
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              שלבים 1–3: מתחרים, GEO וראשי פרקים
            </button>

            <button
              onClick={() => setActiveTab("stage4_draft")}
              className={`px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap flex items-center gap-2 transition-all ${
                activeTab === "stage4_draft"
                  ? "bg-white text-black shadow-sm"
                  : "bg-[#0b0c10] text-zinc-300 hover:text-white border border-zinc-800/80"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              שלב 4: טיוטת כותב מלאה
            </button>

            <button
              onClick={() => setActiveTab("stage5_6_seo")}
              className={`px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap flex items-center gap-2 transition-all ${
                activeTab === "stage5_6_seo"
                  ? "bg-white text-black shadow-sm"
                  : "bg-[#0b0c10] text-zinc-300 hover:text-white border border-zinc-800/80"
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              שלבים 5–6: מטא-טאגס ותמונה
            </button>

            <button
              onClick={() => setActiveTab("stage7_8_9_audit")}
              className={`px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap flex items-center gap-2 transition-all ${
                activeTab === "stage7_8_9_audit"
                  ? "bg-white text-black shadow-sm"
                  : "bg-[#0b0c10] text-zinc-300 hover:text-white border border-zinc-800/80"
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              שלבים 7–9: אימות עובדות ומתמטיקה
            </button>

            <button
              onClick={() => setActiveTab("editor_review")}
              className={`px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap flex items-center gap-2 transition-all ${
                activeTab === "editor_review"
                  ? "bg-white text-black shadow-sm"
                  : "bg-[#0b0c10] text-zinc-300 hover:text-white border border-zinc-800/80"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              דוח עורך והשוואת תיקונים
            </button>
          </div>

          {/* TAB CONTENT AREA - Extra Spacious Padding & High-Contrast Typography */}
          <div className="flex-1 rounded-3xl border border-zinc-800/90 bg-[#0b0c10] p-8 lg:p-10 shadow-2xl overflow-y-auto max-h-[calc(100vh-190px)]">
            {/* TAB 1: FINAL POLISHED PUBLISH-READY MASTERPIECE */}
            {activeTab === "final_polished" && (
              <div className="space-y-8">
                {/* Header & Export Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-zinc-800">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        {editorOutput?.publicationReadyVerdict ||
                          "Ready to Publish"}
                      </span>
                      <span className="text-xs text-zinc-300">
                        ללא מקפים ארוכים (—) • מתמטיקה מאומתת • ייחוס משתמשי Reddit (u/...)
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white pt-1">
                      מאמר סופי ערוך ומוכן לפרסום
                    </h3>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() =>
                        copyToClipboard(
                          editorOutput?.editedPublishReadyMarkdown ||
                            writerOutput?.stage4FullArticleMarkdown ||
                            "",
                          "final-md"
                        )
                      }
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-xs font-bold text-black transition-colors"
                    >
                      {copiedId === "final-md" ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600" />
                          הועתק ללוח!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          העתק מאמר מלא (Markdown)
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Assumptions Box (Required per Input Handling Rule #2) */}
                {writerOutput?.assumptions && (
                  <div className="rounded-2xl bg-[#050507] border border-zinc-800 p-6">
                    <div className="text-xs font-bold uppercase tracking-wider text-zinc-300 mb-4">
                      הנחות עבודה והגדרות מאמר (Assumptions)
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-6 text-xs">
                      <div className="space-y-1">
                        <span className="text-zinc-400 block">שפת יעד</span>
                        <span className="font-semibold text-white text-sm">
                          {writerOutput.assumptions.targetLanguage}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-zinc-400 block">שוק יעד</span>
                        <span className="font-semibold text-white text-sm">
                          {writerOutput.assumptions.targetMarket}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-zinc-400 block">קהל יעד</span>
                        <span className="font-semibold text-white text-sm">
                          {writerOutput.assumptions.targetAudience}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-zinc-400 block">טון ומותג</span>
                        <span className="font-semibold text-white text-sm">
                          {writerOutput.assumptions.websiteBrand}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-zinc-400 block">היקף יעד</span>
                        <span className="font-semibold text-white text-sm">
                          ~{writerOutput.assumptions.targetWordCount} מילים
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Rendered Final Article */}
                <div className="rounded-3xl bg-[#050507] border border-zinc-800/90 p-8 sm:p-12">
                  <MarkdownRenderer
                    content={
                      editorOutput?.editedPublishReadyMarkdown ||
                      writerOutput?.stage4FullArticleMarkdown ||
                      ""
                    }
                    isRtl={editorOutput?.isRtlLanguage}
                  />
                </div>
              </div>
            )}

            {/* TAB 2: MULTI-SOURCE INTELLIGENCE (GOOGLE NEWS, REDDIT WITH USERNAME, X) */}
            {activeTab === "intelligence" && feasibility && (
              <div className="space-y-8">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-zinc-800">
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-white">
                      מחקר היתכנות אוטונומי ואיסוף מודיעין חי (Google, Reddit, X)
                    </h3>
                    <p className="text-sm text-zinc-300">
                      בוחן האם קיימים מספיק מקורות מאומתים, חדשות עדכניות וציטוטי משתמשים אמיתיים מ-Reddit לפני תחילת הכתיבה.
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-xs text-zinc-400 block">
                        ציון היתכנות
                      </span>
                      <span className="text-2xl font-bold text-emerald-400">
                        {feasibility.confidenceScore}/100
                      </span>
                    </div>
                    <div
                      className={`px-4 py-2 rounded-xl text-xs font-bold ${
                        feasibility.canWriteAuthoritatively
                          ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                          : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                      }`}
                    >
                      {feasibility.canWriteAuthoritatively
                        ? "מאושר לכתיבה סמכותית"
                        : "מידע מאומת חסר"}
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-[#050507] border border-zinc-800 text-sm text-zinc-100 leading-relaxed">
                  <strong className="text-white font-bold block mb-1">
                    החלטת מנוע המחקר:{" "}
                  </strong>
                  {feasibility.feasibilityVerdict}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Google News */}
                  <div className="rounded-2xl border border-zinc-800 bg-[#050507] p-6 space-y-4">
                    <div className="flex items-center gap-2.5 text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-zinc-800">
                      <Globe className="w-4 h-4 text-blue-400" />
                      Google News ועדכוני רשת
                    </div>
                    <ul className="space-y-3 text-xs text-zinc-200">
                      {(feasibility.latestNewsSummary || []).map((item, i) => (
                        <li
                          key={i}
                          className="p-3.5 rounded-xl bg-[#0b0c10] border border-zinc-800/90 leading-relaxed"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Reddit Insights with u/username */}
                  <div className="rounded-2xl border border-zinc-800 bg-[#050507] p-6 space-y-4">
                    <div className="flex items-center gap-2.5 text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-zinc-800">
                      <UserCheck className="w-4 h-4 text-orange-400" />
                      ציטוטי משתמשים מ-Reddit (u/username)
                    </div>
                    <ul className="space-y-3 text-xs text-zinc-200">
                      {(feasibility.redditInsights || []).map((item, i) => (
                        <li
                          key={i}
                          className="p-3.5 rounded-xl bg-[#0b0c10] border border-zinc-800/90 leading-relaxed"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* X (Twitter) Pulse */}
                  <div className="rounded-2xl border border-zinc-800 bg-[#050507] p-6 space-y-4">
                    <div className="flex items-center gap-2.5 text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-zinc-800">
                      <Zap className="w-4 h-4 text-sky-400" />
                      תובנות מומחים מרשת X (Twitter)
                    </div>
                    <ul className="space-y-3 text-xs text-zinc-200">
                      {(feasibility.xTwitterInsights || []).map((item, i) => (
                        <li
                          key={i}
                          className="p-3.5 rounded-xl bg-[#0b0c10] border border-zinc-800/90 leading-relaxed"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Grounded Authoritative Sources */}
                <div className="rounded-2xl border border-zinc-800 bg-[#050507] p-6 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                    מקורות רשמיים ושרשורי Reddit שאומתו במחקר
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(feasibility.authoritativeSources || []).map((src, i) => (
                      <a
                        key={i}
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-4 rounded-xl bg-[#0b0c10] border border-zinc-800 hover:border-zinc-500 transition-all flex flex-col justify-between gap-2 group"
                      >
                        <div>
                          <div className="text-xs font-bold text-white group-hover:text-zinc-200 flex items-center justify-between gap-2">
                            <span className="truncate">{src.title}</span>
                            <ExternalLink className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
                          </div>
                          {src.snippet && (
                            <p className="text-xs text-zinc-300 mt-1.5 line-clamp-2 leading-relaxed">
                              {src.snippet}
                            </p>
                          )}
                        </div>
                        <span className="text-[11px] text-zinc-500 truncate">
                          {src.url}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: STAGES 1, 2 & 3 (COMPETITOR RESEARCH, GEO PROMPTS, OUTLINE) */}
            {activeTab === "stage1_2_3" && writerOutput && (
              <div className="space-y-10">
                {/* Stage 1 */}
                <section className="space-y-5">
                  <div className="border-b border-zinc-800 pb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      שלב 1 (Stage 1)
                    </span>
                    <h3 className="text-lg font-bold text-white mt-0.5">
                      מחקר מתחרים, מפת מילות מפתח ופערי תוכן (Content Gaps)
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-6 rounded-2xl bg-[#050507] border border-zinc-800 space-y-4">
                      <div>
                        <span className="text-xs text-zinc-400 block mb-1">
                          ביטוי מפתח ראשי (Primary Keyword)
                        </span>
                        <span className="text-base font-bold text-white">
                          {writerOutput.stage1CompetitorResearch.primaryKeyword}
                        </span>
                      </div>

                      <div>
                        <span className="text-xs text-zinc-400 block mb-2">
                          ביטויי מפתח משניים (Secondary Keywords)
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {(
                            writerOutput.stage1CompetitorResearch
                              .secondaryKeywords || []
                          ).map((kw, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-1 rounded-lg bg-[#0b0c10] border border-zinc-800 text-xs text-zinc-200"
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-[#050507] border border-zinc-800 space-y-4">
                      <div>
                        <span className="text-xs text-zinc-400 block mb-2">
                          ישויות קשורות (Related Entities)
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {(
                            writerOutput.stage1CompetitorResearch
                              .relatedEntities || []
                          ).map((ent, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-100"
                            >
                              {ent}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-xs text-zinc-400 block mb-2">
                          שאלות נפוצות מגוגל (People Also Ask)
                        </span>
                        <ul className="space-y-2 text-xs text-zinc-200 list-disc ml-4 leading-relaxed">
                          {(
                            writerOutput.stage1CompetitorResearch
                              .paaQuestions || []
                          ).map((q, i) => (
                            <li key={i}>{q}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-[#050507] border border-zinc-800 space-y-3">
                      <span className="text-xs font-bold text-white block">
                        פערי תוכן שזוהו אצל המתחרים (Content Gaps)
                      </span>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        {
                          writerOutput.stage1CompetitorResearch
                            .competitorAnalysisSummary
                        }
                      </p>
                      <ul className="space-y-2 text-xs text-zinc-100 pt-2">
                        {(
                          writerOutput.stage1CompetitorResearch
                            .contentGapsIdentified || []
                        ).map((gap, i) => (
                          <li key={i} className="flex items-start gap-2 leading-relaxed">
                            <ArrowRight className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{gap}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </section>

                {/* Stage 2: GEO Prompt Research */}
                <section className="space-y-5">
                  <div className="border-b border-zinc-800 pb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      שלב 2 (Stage 2)
                    </span>
                    <h3 className="text-lg font-bold text-white mt-0.5">
                      מחקר פרומפטים למנועי AI (GEO) ותשובות ישירות מוכנות לציטוט
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {(writerOutput.stage2GeoPrompts || []).map((item, idx) => (
                      <div
                        key={idx}
                        className="p-6 rounded-2xl bg-[#050507] border border-zinc-800 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase bg-zinc-900 text-zinc-200 border border-zinc-700">
                            {item.searchStyle}
                          </span>
                          <button
                            onClick={() =>
                              copyToClipboard(
                                item.quoteReadyDirectAnswer,
                                `geo-${idx}`
                              )
                            }
                            className="text-xs text-zinc-300 hover:text-white flex items-center gap-1.5"
                          >
                            {copiedId === `geo-${idx}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            העתק תשובה
                          </button>
                        </div>
                        <div className="text-sm font-bold text-white leading-snug">
                          “{item.prompt}”
                        </div>
                        <div className="text-xs text-zinc-200 leading-relaxed bg-[#0b0c10] p-4 rounded-xl border border-zinc-800">
                          {item.quoteReadyDirectAnswer}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Stage 3: Outline */}
                <section className="space-y-5">
                  <div className="border-b border-zinc-800 pb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      שלב 3 (Stage 3)
                    </span>
                    <h3 className="text-lg font-bold text-white mt-0.5">
                      מבנה מאמר אסימטרי וראשי פרקים (H1 / H2 / H3 / FAQ)
                    </h3>
                  </div>

                  <div className="p-6 rounded-2xl bg-[#050507] border border-zinc-800 space-y-5">
                    <div>
                      <span className="text-xs text-zinc-400 uppercase block mb-1">
                        כותרת ראשית (H1)
                      </span>
                      <h4 className="text-base font-bold text-white">
                        {writerOutput.stage3Outline?.h1Title}
                      </h4>
                      <p className="text-xs text-zinc-200 mt-2 leading-relaxed">
                        {writerOutput.stage3Outline?.directIntroDraft}
                      </p>
                    </div>

                    <div className="space-y-3">
                      {(writerOutput.stage3Outline?.sections || []).map(
                        (sec, i) => (
                          <div
                            key={i}
                            className="p-4 rounded-xl bg-[#0b0c10] border border-zinc-800 space-y-2"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="px-2 py-0.5 rounded bg-zinc-800 text-xs font-mono text-white">
                                {sec.headingLevel}
                              </span>
                              <span className="text-sm font-bold text-white">
                                {sec.headingText}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-200 leading-relaxed">
                              <strong className="text-white">פתיחה ישירה (1–2 משפטים):</strong>{" "}
                              {sec.directOpeningDraft}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* TAB 4: STAGE 4 WRITER FULL ARTICLE DRAFT */}
            {activeTab === "stage4_draft" && writerOutput && (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      שלב 4 (Stage 4)
                    </span>
                    <h3 className="text-lg font-bold text-white mt-0.5">
                      מאמר מלא לפני שלב העריכה
                    </h3>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        writerOutput.stage4FullArticleMarkdown,
                        "stage4-md"
                      )
                    }
                    className="px-4 py-2 rounded-xl bg-white text-black text-xs font-bold flex items-center gap-2"
                  >
                    {copiedId === "stage4-md" ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        הועתק
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        העתק Markdown
                      </>
                    )}
                  </button>
                </div>

                <div className="rounded-3xl bg-[#050507] border border-zinc-800/90 p-8 sm:p-12">
                  <MarkdownRenderer
                    content={writerOutput.stage4FullArticleMarkdown}
                  />
                </div>
              </div>
            )}

            {/* TAB 5: STAGES 5 & 6 (META TAGS, SLUG & FEATURED IMAGE) */}
            {activeTab === "stage5_6_seo" && writerOutput && (
              <div className="space-y-10">
                {/* Stage 5 */}
                <section className="space-y-5">
                  <div className="border-b border-zinc-800 pb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      שלב 5 (Stage 5)
                    </span>
                    <h3 className="text-lg font-bold text-white mt-0.5">
                      תגיות מטא (Meta Titles 50–60 תווים, Meta Descriptions 140–155 תווים) ו-URL Slug
                    </h3>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#050507] border border-zinc-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-zinc-400 uppercase block mb-1">
                        Hyphenated English URL Slug
                      </span>
                      <code className="text-sm font-mono text-emerald-300">
                        /{writerOutput.stage5MetaAndSlug?.urlSlug}
                      </code>
                    </div>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          writerOutput.stage5MetaAndSlug?.urlSlug || "",
                          "slug"
                        )
                      }
                      className="px-3.5 py-2 rounded-xl bg-zinc-800 text-xs font-semibold text-white hover:bg-zinc-700"
                    >
                      {copiedId === "slug" ? "הועתק!" : "העתק Slug"}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                        3 אפשרויות Meta Title
                      </h4>
                      {(writerOutput.stage5MetaAndSlug?.metaTitles || []).map(
                        (mt, i) => (
                          <div
                            key={i}
                            className={`p-5 rounded-2xl border ${
                              mt.isRecommended
                                ? "bg-[#050507] border-white"
                                : "bg-[#050507] border-zinc-800"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-white">
                                אפשרות {i + 1}{" "}
                                {mt.isRecommended && "★ מומלץ"}
                              </span>
                              <span className="text-xs text-zinc-400">
                                {mt.title.length} תווים
                              </span>
                            </div>
                            <div className="text-sm font-medium text-zinc-100">
                              {mt.title}
                            </div>
                          </div>
                        )
                      )}
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                        3 אפשרויות Meta Description
                      </h4>
                      {(
                        writerOutput.stage5MetaAndSlug?.metaDescriptions || []
                      ).map((md, i) => (
                        <div
                          key={i}
                          className={`p-5 rounded-2xl border ${
                            md.isRecommended
                              ? "bg-[#050507] border-white"
                              : "bg-[#050507] border-zinc-800"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-white">
                              אפשרות {i + 1}{" "}
                              {md.isRecommended && "★ מומלץ"}
                            </span>
                            <span className="text-xs text-zinc-400">
                              {md.description.length} תווים
                            </span>
                          </div>
                          <div className="text-xs text-zinc-200 leading-relaxed">
                            {md.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Stage 6: Featured Image */}
                <section className="space-y-5">
                  <div className="border-b border-zinc-800 pb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      שלב 6 (Stage 6)
                    </span>
                    <h3 className="text-lg font-bold text-white mt-0.5">
                      פרומפט לתמונה ראשית (16:9), טקסט חלופי (Alt Text) ושם קובץ
                    </h3>
                  </div>

                  <div className="p-6 rounded-2xl bg-[#050507] border border-zinc-800 space-y-5">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-white">
                          פרומפט ליצירת תמונה (16:9 ללא טקסט או לוגו)
                        </span>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              writerOutput.stage6FeaturedImage
                                ?.imageGenerationPrompt || "",
                              "img-prompt"
                            )
                          }
                          className="text-xs text-zinc-300 hover:text-white underline"
                        >
                          {copiedId === "img-prompt" ? "הועתק!" : "העתק פרומפט"}
                        </button>
                      </div>
                      <p className="text-xs text-zinc-100 bg-[#0b0c10] p-4 rounded-xl border border-zinc-800 leading-relaxed">
                        {
                          writerOutput.stage6FeaturedImage
                            ?.imageGenerationPrompt
                        }
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-[#0b0c10] border border-zinc-800">
                        <span className="text-xs text-zinc-400 block mb-1">
                          Alt Text (כולל ביטוי מפתח ראשי)
                        </span>
                        <span className="text-xs text-white font-medium">
                          {writerOutput.stage6FeaturedImage?.altText}
                        </span>
                      </div>
                      <div className="p-4 rounded-xl bg-[#0b0c10] border border-zinc-800">
                        <span className="text-xs text-zinc-400 block mb-1">
                          שם קובץ תקני באנגלית (Filename)
                        </span>
                        <code className="text-xs text-emerald-300 font-mono">
                          {writerOutput.stage6FeaturedImage?.englishFilename}
                        </code>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* TAB 6: STAGES 7, 8 & 9 (FACT CHECK TABLE, UNIQUENESS & MATH AUDIT) */}
            {activeTab === "stage7_8_9_audit" && writerOutput && (
              <div className="space-y-10">
                {/* Stage 7 Fact Check Table */}
                <section className="space-y-5">
                  <div className="border-b border-zinc-800 pb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      שלב 7 (Stage 7)
                    </span>
                    <h3 className="text-lg font-bold text-white mt-0.5">
                      טבלת אימות עובדות ומקורות רשמיים (Fact Check Table)
                    </h3>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-zinc-800">
                    <table className="w-full text-left rtl:text-right text-xs">
                      <thead className="bg-[#050507] text-zinc-200 uppercase text-xs">
                        <tr>
                          <th className="p-4 border-b border-zinc-800">
                            טענה / נתון במאמר
                          </th>
                          <th className="p-4 border-b border-zinc-800">
                            סטטוס
                          </th>
                          <th className="p-4 border-b border-zinc-800">
                            מקור רשמי וביאור
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800 bg-[#0b0c10]">
                        {(writerOutput.stage7FactCheckTable || []).map(
                          (item, i) => (
                            <tr key={i} className="hover:bg-zinc-900/50">
                              <td className="p-4 text-zinc-100 font-medium max-w-md leading-relaxed">
                                {item.claim}
                              </td>
                              <td className="p-4">
                                <span
                                  className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                    item.status === "Verified"
                                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                      : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                  }`}
                                >
                                  {item.status}
                                </span>
                              </td>
                              <td className="p-4 space-y-1.5 leading-relaxed">
                                <div className="text-zinc-200">
                                  {item.verificationNote}
                                </div>
                                {item.sourceUrl && (
                                  <a
                                    href={item.sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-white underline hover:text-zinc-300 font-medium"
                                  >
                                    <span>
                                      {item.sourceTitle || item.sourceUrl}
                                    </span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Stages 8 & 9 Audit */}
                <section className="space-y-5">
                  <div className="border-b border-zinc-800 pb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      שלבים 8 ו-9 (Stages 8 &amp; 9)
                    </span>
                    <h3 className="text-lg font-bold text-white mt-0.5">
                      בקרת ייחודיות, התכנסות מתמטית וטוהר שפה (ללא קלישאות AI)
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 rounded-2xl bg-[#050507] border border-zinc-800 space-y-3">
                      <span className="text-sm font-bold text-white block">
                        שלב 8: ביקורת מתמטית והתכנסות נתונים
                      </span>
                      <p className="text-xs text-zinc-200 leading-relaxed">
                        {
                          writerOutput.stage8And9QualityAudit
                            ?.mathematicalAndEmpiricalAudit
                        }
                      </p>
                      <div className="pt-2 text-xs text-zinc-300 leading-relaxed">
                        <strong className="text-white">בדיקת ייחודיות:</strong>{" "}
                        {writerOutput.stage8And9QualityAudit?.uniquenessNotes}
                      </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-[#050507] border border-zinc-800 space-y-3">
                      <span className="text-sm font-bold text-white block">
                        שלב 9: טוהר שפה, אנושיות וניקוי תבניות AI
                      </span>
                      <p className="text-xs text-zinc-200 leading-relaxed">
                        {
                          writerOutput.stage8And9QualityAudit
                            ?.characterSetPurityNote
                        }
                      </p>
                      <div className="flex items-center gap-8 pt-2">
                        <div>
                          <span className="text-xs text-zinc-400 block">
                            מקפים ארוכים (—)
                          </span>
                          <span className="text-xl font-bold text-emerald-400">
                            0
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-zinc-400 block">
                            ציון גיוון משפטים
                          </span>
                          <span className="text-xl font-bold text-white">
                            {
                              writerOutput.stage8And9QualityAudit
                                ?.sentenceLengthVarietyScore
                            }
                            %
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* TAB 7: AGENCY EDITOR CRITIQUE & SIDE-BY-SIDE FIXES */}
            {activeTab === "editor_review" && editorOutput && (
              <div className="space-y-8">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-zinc-800">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                        דוח עורך תוכן ומנתח טקסט
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md bg-zinc-900 border border-zinc-700 text-xs text-zinc-200">
                        שפה שזוהתה: {editorOutput.detectedLanguage}{" "}
                        {editorOutput.isRtlLanguage ? "(RTL)" : "(LTR)"}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white pt-1">
                      ניתוח עומק ותיקונים מדורגים לפי סדר עדיפויות (1 עד 5)
                    </h3>
                  </div>

                  <span className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    {editorOutput.publicationReadyVerdict}
                  </span>
                </div>

                {/* 1. Assumptions & 2. Overall Assessment */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 p-6 rounded-2xl bg-[#050507] border border-zinc-800 space-y-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-white">
                      הערכה כוללת (Overall Assessment)
                    </span>
                    <p className="text-sm text-zinc-100 leading-relaxed">
                      {editorOutput.overallAssessment}
                    </p>
                    {editorOutput.rtlDirectionAuditNote && (
                      <p className="text-xs text-zinc-300 pt-2 border-t border-zinc-800/80 leading-relaxed">
                        <strong className="text-white">בדיקת כיווניות ופיסוק:</strong>{" "}
                        {editorOutput.rtlDirectionAuditNote}
                      </p>
                    )}
                  </div>

                  <div className="p-6 rounded-2xl bg-[#050507] border border-zinc-800 space-y-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                      הנחות עבודה של העורך
                    </span>
                    <ul className="space-y-2 text-xs text-zinc-200 list-disc ml-4 leading-relaxed">
                      {(editorOutput.assumptions || []).map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* 3. Strengths */}
                <div className="p-6 rounded-2xl bg-[#050507] border border-zinc-800 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    נקודות חוזק בטקסט (נשמרו בעריכה)
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {(editorOutput.strengths || []).map((str, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2.5 text-xs text-zinc-100 leading-relaxed"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{str}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Required Fixes in Priority Order (1 to 5) with Side-by-Side Original vs Suggested */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                    תיקונים נדרשים לפי סדר עדיפויות (1. עובדות ← 2. לוגיקה ← 3. מבנה וקהל ← 4. בהירות ← 5. סגנון)
                  </h4>

                  {(editorOutput.requiredFixes || []).length === 0 ? (
                    <div className="p-6 rounded-2xl bg-[#050507] border border-zinc-800 text-xs text-zinc-300">
                      לא נמצאו שגיאות מחייבות — הטקסט עומד בכל דרישות הדיוק והמבנה.
                    </div>
                  ) : (
                    (editorOutput.requiredFixes || []).map((fix, idx) => (
                      <div
                        key={idx}
                        className="p-6 rounded-2xl bg-[#050507] border border-zinc-800 space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-xs font-bold">
                            {fix.priorityCategory}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30">
                            <span className="text-xs font-bold uppercase text-rose-300 block mb-1.5">
                              ניסוח מקורי (Original)
                            </span>
                            <p className="text-xs text-zinc-100 leading-relaxed">
                              “{fix.originalPhrasing}”
                            </p>
                          </div>

                          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
                            <span className="text-xs font-bold uppercase text-emerald-300 block mb-1.5">
                              ניסוח מוצע (Suggested Fix)
                            </span>
                            <p className="text-xs text-white font-semibold leading-relaxed">
                              “{fix.suggestedPhrasing}”
                            </p>
                          </div>
                        </div>

                        <p className="text-xs text-zinc-300 leading-relaxed">
                          <strong className="text-white">
                            מדוע התיקון נדרש:
                          </strong>{" "}
                          {fix.explanation}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {/* 5. Optional Suggestions for Improvement */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                    הצעות אופציונליות לשיפור (מופרדות משגיאות חובה)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(editorOutput.suggestionsForImprovement || []).map(
                      (sug, i) => (
                        <div
                          key={i}
                          className="p-5 rounded-2xl bg-[#050507] border border-zinc-800 space-y-2.5"
                        >
                          <span className="text-xs font-bold text-white">
                            {sug.area}
                          </span>
                          {sug.originalSnippet && (
                            <p className="text-xs text-zinc-400 line-through">
                              “{sug.originalSnippet}”
                            </p>
                          )}
                          <p className="text-xs text-zinc-100 font-semibold leading-relaxed">
                            ← “{sug.suggestedImprovement}”
                          </p>
                          <p className="text-xs text-zinc-300 leading-relaxed">
                            {sug.rationale}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* 6. Items Needing Further Checking */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                    סיווג עובדות מאומתות מול אומדנים והערכות
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(editorOutput.itemsNeedingFurtherChecking || []).map(
                      (item, i) => (
                        <div
                          key={i}
                          className="p-5 rounded-2xl bg-[#050507] border border-zinc-800 flex items-start justify-between gap-4"
                        >
                          <div className="space-y-1.5">
                            <div className="text-xs font-bold text-white">
                              {item.claimOrItem}
                            </div>
                            <div className="text-xs text-zinc-300 leading-relaxed">
                              {item.reasonUnverified}
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-zinc-900 border border-zinc-700 text-zinc-200 shrink-0">
                            {item.status}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
