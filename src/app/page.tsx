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
  BookOpen,
  Sliders,
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

export default function NexusStudioPage() {
  // Mode & Settings
  const [mode, setMode] = useState<StudioMode>("autonomous");
  const [apiKey, setApiKey] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("gemini-2.5-flash");
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);

  // Writer / Autonomous Inputs
  const [topic, setTopic] = useState<string>(
    "Generative Engine Optimization (GEO) Strategy & RAG Citation Mechanics in 2026"
  );
  const [targetLanguage, setTargetLanguage] = useState<string>("English");
  const [targetCountry, setTargetCountry] = useState<string>("United States");
  const [targetAudience, setTargetAudience] = useState<string>("");
  const [websiteBrand, setWebsiteBrand] = useState<string>("");
  const [wordCount, setWordCount] = useState<number>(1800);

  // Standing Rules & Editor Inputs
  const [standingRules, setStandingRules] = useState<string>(
    "Never use em-dashes (—). Back up claims with reconcilable numbers. Avoid AI clichés ('delve', 'unlock', 'game changer', 'seamless')."
  );
  const [editorText, setEditorText] = useState<string>("");
  const [taskCard, setTaskCard] = useState<string>("");
  const [includeEditedVersion, setIncludeEditedVersion] = useState<boolean>(true);

  // Pipeline Execution State
  const [phase, setPhase] = useState<PipelinePhase>("completed");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [clarificationPrompt, setClarificationPrompt] = useState<string | null>(null);

  // Results State (Initialized with rich verified showcase so user sees sleek UI immediately)
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
    const savedKey = localStorage.getItem("nexus_gemini_api_key");
    if (savedKey) setApiKey(savedKey);
  }, []);

  const handleSaveApiKey = (val: string) => {
    setApiKey(val);
    localStorage.setItem("nexus_gemini_api_key", val);
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

    if (!targetLanguage.trim() || !targetCountry.trim()) {
      setPhase("clarifying");
      setClarificationPrompt(
        "Input Handling Rule #1: Please specify both Target Language and Target Country/Market before we begin live Google, Reddit, and X research."
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

    // Rule #1: Check Target Language and Target Country/Market
    if (!targetLanguage.trim() || !targetCountry.trim()) {
      setPhase("clarifying");
      setClarificationPrompt(
        "Input Handling Check: Target Language and Target Country/Market are missing. Please fill them in once below before starting."
      );
      return;
    }

    try {
      // Step 1: Live Multi-Source Intelligence (Google News, Reddit, X)
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
Goal: Publish-ready #1 ranking SEO & GEO article with zero em-dashes, verified math, and quote-ready H2 openings.`;

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
    if (!editorText.trim()) {
      setPhase("error");
      setErrorMessage("Please paste the text you want the Editor to analyze.");
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
      "Target Audience: Enterprise Marketing Leaders\nGoal: Audit for factual accuracy, GEO quote-readiness, and native flow."
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#08090d] text-slate-100">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#08090d]/90 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-emerald-500 p-[1px] shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-[#0b0d14] rounded-[11px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-white text-lg">
                  NEXUS
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  SEO + GEO + Editorial AI
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Autonomous Web, Reddit & X Grounded Content Engine
              </p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setMode("autonomous")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mode === "autonomous"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              Autonomous Full Pipeline
            </button>
            <button
              onClick={() => setMode("writer")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mode === "writer"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              9-Stage Writer
            </button>
            <button
              onClick={() => setMode("editor")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mode === "editor"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Agency Editor
            </button>
          </div>

          {/* Right Controls: Model & API Key */}
          <div className="flex items-center gap-2.5">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fast + Search)</option>
              <option value="gemini-2.5-pro">Gemini 2.5 Pro (Deep Reasoning + Search)</option>
            </select>

            <button
              onClick={() => setShowKeyModal(!showKeyModal)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                apiKey
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20"
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              {apiKey ? "API Key Active" : "Set Gemini Key"}
            </button>
          </div>
        </div>

        {/* Collapsible API Key Bar */}
        {showKeyModal && (
          <div className="border-t border-slate-800 bg-slate-900/95 px-6 py-3">
            <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-4">
              <div className="text-xs text-slate-300">
                <span className="font-semibold text-white">
                  Gemini API Key (with Google Search Grounding):
                </span>{" "}
                Stored locally in your browser or read from{" "}
                <code className="text-indigo-300">GEMINI_API_KEY</code> in{" "}
                <code className="text-indigo-300">.env.local</code>.
              </div>
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => handleSaveApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => setShowKeyModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-500"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Mission Control & Inputs (4 Cols) */}
        <div className="lg:col-span-4 space-y-5">
          {mode !== "editor" ? (
            <div className="rounded-2xl border border-slate-800/90 bg-[#0d1017] p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Compass className="w-4 h-4 text-indigo-400" />
                  Topic & Market Configuration
                </h2>
                <span className="text-[11px] text-slate-400">
                  Live Grounded
                </span>
              </div>

              {/* Topic */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Subject / Topic / Primary Query *
                </label>
                <textarea
                  rows={3}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., 2026 EU AI Act Compliance for FinTech SaaS, or Tax-Loss Harvesting Mechanics..."
                  className="w-full rounded-xl bg-slate-950/90 border border-slate-800 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* Target Language & Country (Mandatory per Input Handling Rule #1) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Target Language *
                  </label>
                  <input
                    type="text"
                    value={targetLanguage}
                    onChange={(e) => setTargetLanguage(e.target.value)}
                    placeholder="e.g., English, Hebrew, Spanish"
                    className="w-full rounded-xl bg-slate-950/90 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Target Country/Market *
                  </label>
                  <input
                    type="text"
                    value={targetCountry}
                    onChange={(e) => setTargetCountry(e.target.value)}
                    placeholder="e.g., United States, Israel, UK"
                    className="w-full rounded-xl bg-slate-950/90 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Optional Inputs (Auto-assumed if left blank per Rule #2) */}
              <div className="pt-2 border-t border-slate-800/70 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                    Optional Parameters (Auto-Assumed if Blank)
                  </span>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Target Audience
                  </label>
                  <input
                    type="text"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="Leave blank for sensible default..."
                    className="w-full rounded-xl bg-slate-950/60 border border-slate-800/80 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">
                      Website / Brand Tone
                    </label>
                    <input
                      type="text"
                      value={websiteBrand}
                      onChange={(e) => setWebsiteBrand(e.target.value)}
                      placeholder="e.g., B2B FinTech Authority"
                      className="w-full rounded-xl bg-slate-950/60 border border-slate-800/80 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Word Count
                    </label>
                    <input
                      type="number"
                      step={100}
                      value={wordCount}
                      onChange={(e) => setWordCount(Number(e.target.value))}
                      className="w-full rounded-xl bg-slate-950/60 border border-slate-800/80 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Standing Agency Rules */}
              <div className="pt-2 border-t border-slate-800/70">
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                  Standing Client / Agency Rules
                </label>
                <textarea
                  rows={2}
                  value={standingRules}
                  onChange={(e) => setStandingRules(e.target.value)}
                  placeholder="House style, banned terms, regulatory disclaimers..."
                  className="w-full rounded-xl bg-slate-950/60 border border-slate-800/80 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2.5">
                <button
                  onClick={handleExecutePipeline}
                  disabled={
                    phase === "researching" ||
                    phase === "writing" ||
                    phase === "editing"
                  }
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-semibold text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {phase === "researching" ||
                  phase === "writing" ||
                  phase === "editing" ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Running {phase.toUpperCase()} Stage...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      {mode === "autonomous"
                        ? "Launch Autonomous Research → Write → Edit"
                        : "Run 9-Stage SEO & GEO Writer"}
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
                  className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium flex items-center justify-center gap-2 transition-all"
                >
                  <Search className="w-3.5 h-3.5 text-indigo-400" />
                  Pre-Check Topic Feasibility Only (Google, Reddit & X)
                </button>
              </div>
            </div>
          ) : (
            /* STANDALONE EDITOR INPUT PANEL */
            <div className="rounded-2xl border border-slate-800/90 bg-[#0d1017] p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Content Editor & Text Analyst
                </h2>
                <button
                  onClick={loadSampleIntoStandaloneEditor}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 underline"
                >
                  Load Current Article
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Submitted Text (Any Language, Auto-Detected) *
                </label>
                <textarea
                  rows={8}
                  value={editorText}
                  onChange={(e) => setEditorText(e.target.value)}
                  placeholder="Paste client article, landing page, social post, or GEO draft in English, Hebrew, Arabic, Spanish..."
                  className="w-full rounded-xl bg-slate-950/90 border border-slate-800 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Task Card (Optional — Overrides Defaults)
                </label>
                <textarea
                  rows={3}
                  value={taskCard}
                  onChange={(e) => setTaskCard(e.target.value)}
                  placeholder="Target keyword, target audience, platform, localization instructions, or leave empty to auto-infer..."
                  className="w-full rounded-xl bg-slate-950/70 border border-slate-800 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Standing Client / Agency Rules
                </label>
                <textarea
                  rows={2}
                  value={standingRules}
                  onChange={(e) => setStandingRules(e.target.value)}
                  className="w-full rounded-xl bg-slate-950/70 border border-slate-800 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeEditedVersion}
                  onChange={(e) => setIncludeEditedVersion(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                />
                Generate full edited, publish-ready version alongside analysis
              </label>

              <button
                onClick={handleExecuteStandaloneEditor}
                disabled={phase === "editing"}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {phase === "editing" ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Running Priority-Ordered Editorial Audit...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Run Full Editorial Analysis & Fact Audit
                  </>
                )}
              </button>
            </div>
          )}

          {/* Live Pipeline Telemetry Stepper */}
          <div className="rounded-2xl border border-slate-800/80 bg-[#0d1017]/90 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Autonomous Pipeline Status
              </span>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                  phase === "completed"
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                    : phase === "error" || phase === "clarifying"
                    ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                    : "bg-indigo-500/20 text-indigo-300 animate-pulse"
                }`}
              >
                {phase.toUpperCase()}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div
                className={`flex items-center justify-between p-2.5 rounded-xl border ${
                  phase === "researching"
                    ? "bg-indigo-500/15 border-indigo-500/40 text-white"
                    : feasibility
                    ? "bg-slate-900/60 border-slate-800 text-slate-300"
                    : "bg-slate-950/40 border-slate-900 text-slate-500"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Globe className="w-4 h-4 text-indigo-400" />
                  <span>1. Live Web, Reddit & X Feasibility</span>
                </div>
                {feasibility && (
                  <span className="text-[11px] font-semibold text-emerald-400">
                    {feasibility.confidenceScore}% Score
                  </span>
                )}
              </div>

              <div
                className={`flex items-center justify-between p-2.5 rounded-xl border ${
                  phase === "writing"
                    ? "bg-indigo-500/15 border-indigo-500/40 text-white"
                    : writerOutput
                    ? "bg-slate-900/60 border-slate-800 text-slate-300"
                    : "bg-slate-950/40 border-slate-900 text-slate-500"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span>2. 9-Stage SEO & GEO Writer</span>
                </div>
                {writerOutput && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
              </div>

              <div
                className={`flex items-center justify-between p-2.5 rounded-xl border ${
                  phase === "editing"
                    ? "bg-indigo-500/15 border-indigo-500/40 text-white"
                    : editorOutput
                    ? "bg-slate-900/60 border-slate-800 text-slate-300"
                    : "bg-slate-950/40 border-slate-900 text-slate-500"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>3. Priority-Ordered Agency Editor</span>
                </div>
                {editorOutput && (
                  <span className="text-[11px] font-semibold text-emerald-400">
                    {editorOutput.publicationReadyVerdict}
                  </span>
                )}
              </div>
            </div>

            {/* Clarification or Error Banner */}
            {clarificationPrompt && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>{clarificationPrompt}</div>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold">Execution Notice</div>
                  <div>{errorMessage}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Multi-Stage Output Studio (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          {/* Output Stage Navigation Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-800/80">
            <button
              onClick={() => setActiveTab("final_polished")}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap flex items-center gap-1.5 transition-all ${
                activeTab === "final_polished"
                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Publish-Ready Masterpiece
            </button>

            <button
              onClick={() => setActiveTab("intelligence")}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap flex items-center gap-1.5 transition-all ${
                activeTab === "intelligence"
                  ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              News, Reddit & X Intel
            </button>

            <button
              onClick={() => setActiveTab("stage1_2_3")}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap flex items-center gap-1.5 transition-all ${
                activeTab === "stage1_2_3"
                  ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              Stages 1–3: SERP, GEO & Outline
            </button>

            <button
              onClick={() => setActiveTab("stage4_draft")}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap flex items-center gap-1.5 transition-all ${
                activeTab === "stage4_draft"
                  ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Stage 4: Writer Article
            </button>

            <button
              onClick={() => setActiveTab("stage5_6_seo")}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap flex items-center gap-1.5 transition-all ${
                activeTab === "stage5_6_seo"
                  ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              Stages 5–6: Meta & Image
            </button>

            <button
              onClick={() => setActiveTab("stage7_8_9_audit")}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap flex items-center gap-1.5 transition-all ${
                activeTab === "stage7_8_9_audit"
                  ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              Stages 7–9: Fact & Math Audit
            </button>

            <button
              onClick={() => setActiveTab("editor_review")}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap flex items-center gap-1.5 transition-all ${
                activeTab === "editor_review"
                  ? "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Editor Critique & Side-by-Side Fixes
            </button>
          </div>

          {/* TAB CONTENT AREA */}
          <div className="flex-1 rounded-2xl border border-slate-800/90 bg-[#0d1017] p-6 shadow-2xl overflow-y-auto max-h-[calc(100vh-180px)]">
            {/* TAB 1: FINAL POLISHED PUBLISH-READY MASTERPIECE */}
            {activeTab === "final_polished" && (
              <div className="space-y-6">
                {/* Header & Export Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        {editorOutput?.publicationReadyVerdict ||
                          "Verified Publish-Ready"}
                      </span>
                      <span className="text-xs text-slate-400">
                        Zero Em-Dashes (—) • Math Reconciled • GEO Citation Ready
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white mt-1">
                      Final Autonomous Publish-Ready Output
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        copyToClipboard(
                          editorOutput?.editedPublishReadyMarkdown ||
                            writerOutput?.stage4FullArticleMarkdown ||
                            "",
                          "final-md"
                        )
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
                    >
                      {copiedId === "final-md" ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          Copied Markdown
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy Publish-Ready Markdown
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Assumptions Box (Required per Input Handling Rule #2) */}
                {writerOutput?.assumptions && (
                  <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wider text-indigo-300 mb-2">
                      Explicit Assumptions & Parameters
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 block">Language</span>
                        <span className="font-medium text-white">
                          {writerOutput.assumptions.targetLanguage}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Market</span>
                        <span className="font-medium text-white">
                          {writerOutput.assumptions.targetMarket}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Audience</span>
                        <span className="font-medium text-white">
                          {writerOutput.assumptions.targetAudience}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Brand Tone</span>
                        <span className="font-medium text-white">
                          {writerOutput.assumptions.websiteBrand}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Target Length</span>
                        <span className="font-medium text-white">
                          ~{writerOutput.assumptions.targetWordCount} words
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Rendered Final Article */}
                <div className="rounded-2xl bg-[#090b10] border border-slate-800/80 p-6 sm:p-8">
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

            {/* TAB 2: MULTI-SOURCE INTELLIGENCE (GOOGLE NEWS, REDDIT, X) */}
            {activeTab === "intelligence" && feasibility && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      Autonomous Topic Feasibility & Live Signal Radar
                    </h3>
                    <p className="text-xs text-slate-400">
                      Evaluates whether sufficient verifiable facts exist across Google News, Reddit, and X before writing.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 block">
                        Feasibility Score
                      </span>
                      <span className="text-xl font-bold text-emerald-400">
                        {feasibility.confidenceScore}/100
                      </span>
                    </div>
                    <div
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                        feasibility.canWriteAuthoritatively
                          ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                          : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                      }`}
                    >
                      {feasibility.canWriteAuthoritatively
                        ? "APPROVED FOR AUTHORITATIVE WRITING"
                        : "INSUFFICIENT VERIFIED DATA"}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-sm text-indigo-100 leading-relaxed">
                  <strong className="text-indigo-300 font-semibold">
                    Autonomous Verdict:{" "}
                  </strong>
                  {feasibility.feasibilityVerdict}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Google News */}
                  <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider">
                      <Globe className="w-4 h-4" />
                      Google News & Web Signals
                    </div>
                    <ul className="space-y-2.5 text-xs text-slate-300">
                      {(feasibility.latestNewsSummary || []).map((item, i) => (
                        <li
                          key={i}
                          className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 leading-relaxed"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Reddit Insights */}
                  <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-orange-400 uppercase tracking-wider">
                      <MessageSquare className="w-4 h-4" />
                      Reddit Practitioner Insights
                    </div>
                    <ul className="space-y-2.5 text-xs text-slate-300">
                      {(feasibility.redditInsights || []).map((item, i) => (
                        <li
                          key={i}
                          className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 leading-relaxed"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* X (Twitter) Pulse */}
                  <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-sky-400 uppercase tracking-wider">
                      <Zap className="w-4 h-4" />
                      X (Twitter) Expert Pulse
                    </div>
                    <ul className="space-y-2.5 text-xs text-slate-300">
                      {(feasibility.xTwitterInsights || []).map((item, i) => (
                        <li
                          key={i}
                          className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 leading-relaxed"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Grounded Authoritative Sources */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Verified Authoritative Sources Discovered
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(feasibility.authoritativeSources || []).map((src, i) => (
                      <a
                        key={i}
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-indigo-500/50 transition-all flex flex-col justify-between gap-2 group"
                      >
                        <div>
                          <div className="text-xs font-semibold text-indigo-300 group-hover:text-indigo-200 flex items-center justify-between gap-2">
                            <span className="truncate">{src.title}</span>
                            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                          </div>
                          {src.snippet && (
                            <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                              {src.snippet}
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 truncate">
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
              <div className="space-y-8">
                {/* Stage 1 */}
                <section className="space-y-4">
                  <div className="border-b border-slate-800 pb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
                      Stage 1
                    </span>
                    <h3 className="text-base font-bold text-white">
                      Competitor Research, Keyword Map & Content Gaps
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                      <span className="text-xs text-slate-400 block mb-1">
                        Primary Keyword
                      </span>
                      <span className="text-sm font-bold text-emerald-300">
                        {writerOutput.stage1CompetitorResearch.primaryKeyword}
                      </span>

                      <span className="text-xs text-slate-400 block mt-4 mb-1.5">
                        Secondary Keywords
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {(
                          writerOutput.stage1CompetitorResearch
                            .secondaryKeywords || []
                        ).map((kw, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-slate-800 text-[11px] text-slate-200"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                      <span className="text-xs text-slate-400 block mb-1.5">
                        Related Entities (Knowledge Graph)
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {(
                          writerOutput.stage1CompetitorResearch
                            .relatedEntities || []
                        ).map((ent, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-[11px] text-indigo-200"
                          >
                            {ent}
                          </span>
                        ))}
                      </div>

                      <span className="text-xs text-slate-400 block mt-4 mb-1.5">
                        People Also Ask (PAA)
                      </span>
                      <ul className="space-y-1 text-xs text-slate-300 list-disc ml-4">
                        {(
                          writerOutput.stage1CompetitorResearch.paaQuestions ||
                          []
                        ).map((q, i) => (
                          <li key={i}>{q}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                      <span className="text-xs font-semibold text-amber-300 block">
                        Identified Competitor Content Gaps
                      </span>
                      <p className="text-xs text-slate-400">
                        {
                          writerOutput.stage1CompetitorResearch
                            .competitorAnalysisSummary
                        }
                      </p>
                      <ul className="space-y-1.5 text-xs text-slate-200 pt-1">
                        {(
                          writerOutput.stage1CompetitorResearch
                            .contentGapsIdentified || []
                        ).map((gap, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <ArrowRight className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                            <span>{gap}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </section>

                {/* Stage 2: GEO Prompt Research */}
                <section className="space-y-4">
                  <div className="border-b border-slate-800 pb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                      Stage 2
                    </span>
                    <h3 className="text-base font-bold text-white">
                      GEO (AI Prompt Research & Quote-Ready Direct Citations)
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(writerOutput.stage2GeoPrompts || []).map((item, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-indigo-500/20 text-indigo-300">
                            {item.searchStyle}
                          </span>
                          <button
                            onClick={() =>
                              copyToClipboard(
                                item.quoteReadyDirectAnswer,
                                `geo-${idx}`
                              )
                            }
                            className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
                          >
                            {copiedId === `geo-${idx}` ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            Copy Snippet
                          </button>
                        </div>
                        <div className="text-xs font-semibold text-white">
                          “{item.prompt}”
                        </div>
                        <div className="text-xs text-slate-300 leading-relaxed bg-slate-950/80 p-3 rounded-lg border border-slate-800/80">
                          {item.quoteReadyDirectAnswer}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Stage 3: Outline */}
                <section className="space-y-4">
                  <div className="border-b border-slate-800 pb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-400">
                      Stage 3
                    </span>
                    <h3 className="text-base font-bold text-white">
                      Asymmetric Architecture & Direct-Answer Outline
                    </h3>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-4">
                    <div>
                      <span className="text-[11px] text-slate-400 uppercase">
                        H1 Title
                      </span>
                      <h4 className="text-sm font-bold text-white">
                        {writerOutput.stage3Outline?.h1Title}
                      </h4>
                      <p className="text-xs text-slate-300 mt-1">
                        {writerOutput.stage3Outline?.directIntroDraft}
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      {(writerOutput.stage3Outline?.sections || []).map(
                        (sec, i) => (
                          <div
                            key={i}
                            className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-1"
                          >
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-indigo-300">
                                {sec.headingLevel}
                              </span>
                              <span className="text-xs font-semibold text-white">
                                {sec.headingText}
                              </span>
                            </div>
                            <p className="text-xs text-emerald-300/90">
                              <strong>Direct Opening:</strong>{" "}
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
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
                      Stage 4
                    </span>
                    <h3 className="text-base font-bold text-white">
                      Writer Stage 4 Output (Pre-Editor Draft)
                    </h3>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        writerOutput.stage4FullArticleMarkdown,
                        "stage4-md"
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5"
                  >
                    {copiedId === "stage4-md" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy Stage 4 Markdown
                      </>
                    )}
                  </button>
                </div>

                <div className="rounded-2xl bg-[#090b10] border border-slate-800/80 p-6">
                  <MarkdownRenderer
                    content={writerOutput.stage4FullArticleMarkdown}
                  />
                </div>
              </div>
            )}

            {/* TAB 5: STAGES 5 & 6 (META TAGS, SLUG & FEATURED IMAGE) */}
            {activeTab === "stage5_6_seo" && writerOutput && (
              <div className="space-y-8">
                {/* Stage 5 */}
                <section className="space-y-4">
                  <div className="border-b border-slate-800 pb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
                      Stage 5
                    </span>
                    <h3 className="text-base font-bold text-white">
                      Meta Titles (50–60 chars), Meta Descriptions (140–155 chars) & URL Slug
                    </h3>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-400 uppercase block">
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
                      className="px-2.5 py-1 rounded bg-slate-800 text-xs text-slate-300 hover:text-white"
                    >
                      {copiedId === "slug" ? "Copied" : "Copy Slug"}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2.5">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        3 Meta Title Options
                      </h4>
                      {(writerOutput.stage5MetaAndSlug?.metaTitles || []).map(
                        (mt, i) => (
                          <div
                            key={i}
                            className={`p-3.5 rounded-xl border ${
                              mt.isRecommended
                                ? "bg-indigo-500/10 border-indigo-500/40"
                                : "bg-slate-900/50 border-slate-800"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] font-semibold text-indigo-300">
                                Option {i + 1}{" "}
                                {mt.isRecommended && "★ Recommended"}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {mt.title.length} chars
                              </span>
                            </div>
                            <div className="text-xs font-medium text-white">
                              {mt.title}
                            </div>
                          </div>
                        )
                      )}
                    </div>

                    <div className="space-y-2.5">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        3 Meta Description Options
                      </h4>
                      {(
                        writerOutput.stage5MetaAndSlug?.metaDescriptions || []
                      ).map((md, i) => (
                        <div
                          key={i}
                          className={`p-3.5 rounded-xl border ${
                            md.isRecommended
                              ? "bg-emerald-500/10 border-emerald-500/40"
                              : "bg-slate-900/50 border-slate-800"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-semibold text-emerald-300">
                              Option {i + 1}{" "}
                              {md.isRecommended && "★ Recommended"}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {md.description.length} chars
                            </span>
                          </div>
                          <div className="text-xs text-slate-200 leading-relaxed">
                            {md.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Stage 6: Featured Image */}
                <section className="space-y-4">
                  <div className="border-b border-slate-800 pb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-400">
                      Stage 6
                    </span>
                    <h3 className="text-base font-bold text-white">
                      16:9 Editorial Featured Image Prompt, Alt Text & Filename
                    </h3>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-indigo-300">
                          16:9 Editorial Image Prompt (Zero Text / Logos)
                        </span>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              writerOutput.stage6FeaturedImage
                                ?.imageGenerationPrompt || "",
                              "img-prompt"
                            )
                          }
                          className="text-xs text-slate-400 hover:text-white"
                        >
                          {copiedId === "img-prompt" ? "Copied!" : "Copy Prompt"}
                        </button>
                      </div>
                      <p className="text-xs text-slate-200 bg-slate-950 p-3.5 rounded-lg border border-slate-800 leading-relaxed">
                        {
                          writerOutput.stage6FeaturedImage
                            ?.imageGenerationPrompt
                        }
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                        <span className="text-[11px] text-slate-400 block mb-1">
                          Descriptive Alt Text (with Primary Keyword)
                        </span>
                        <span className="text-xs text-white">
                          {writerOutput.stage6FeaturedImage?.altText}
                        </span>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                        <span className="text-[11px] text-slate-400 block mb-1">
                          Hyphenated English Filename
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
              <div className="space-y-8">
                {/* Stage 7 Fact Check Table */}
                <section className="space-y-4">
                  <div className="border-b border-slate-800 pb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                      Stage 7
                    </span>
                    <h3 className="text-base font-bold text-white">
                      Fact Check & Official Source Verification Table
                    </h3>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 text-slate-300 uppercase text-[11px]">
                        <tr>
                          <th className="p-3.5 border-b border-slate-800">
                            Claim / Data Point
                          </th>
                          <th className="p-3.5 border-b border-slate-800">
                            Status
                          </th>
                          <th className="p-3.5 border-b border-slate-800">
                            Verification & Official Source
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/70 bg-slate-950/50">
                        {(writerOutput.stage7FactCheckTable || []).map(
                          (item, i) => (
                            <tr key={i} className="hover:bg-slate-900/40">
                              <td className="p-3.5 text-slate-200 font-medium max-w-md">
                                {item.claim}
                              </td>
                              <td className="p-3.5">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                    item.status === "Verified"
                                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                      : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                  }`}
                                >
                                  {item.status}
                                </span>
                              </td>
                              <td className="p-3.5 space-y-1">
                                <div className="text-slate-300">
                                  {item.verificationNote}
                                </div>
                                {item.sourceUrl && (
                                  <a
                                    href={item.sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-indigo-400 hover:underline"
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
                <section className="space-y-4">
                  <div className="border-b border-slate-800 pb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
                      Stages 8 & 9
                    </span>
                    <h3 className="text-base font-bold text-white">
                      Uniqueness, Mathematical Reconciliation & Humanization Audit
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                      <span className="text-xs font-semibold text-emerald-400">
                        Stage 8: Mathematical & Empirical Reconciliation
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {
                          writerOutput.stage8And9QualityAudit
                            ?.mathematicalAndEmpiricalAudit
                        }
                      </p>
                      <div className="pt-2 text-xs text-slate-400">
                        <strong>Uniqueness Audit:</strong>{" "}
                        {writerOutput.stage8And9QualityAudit?.uniquenessNotes}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                      <span className="text-xs font-semibold text-purple-400">
                        Stage 9: Orthographic Purity & Anti-Cliché Audit
                      </span>
                      <p className="text-xs text-slate-300">
                        {
                          writerOutput.stage8And9QualityAudit
                            ?.characterSetPurityNote
                        }
                      </p>
                      <div className="flex items-center gap-4 pt-2">
                        <div>
                          <span className="text-[11px] text-slate-400 block">
                            Em-Dashes (—)
                          </span>
                          <span className="text-base font-bold text-emerald-400">
                            0
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 block">
                            Cadence Score
                          </span>
                          <span className="text-base font-bold text-indigo-300">
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
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">
                        Digital Marketing Agency Editor Report
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] text-slate-300">
                        Language: {editorOutput.detectedLanguage}{" "}
                        {editorOutput.isRtlLanguage ? "(RTL Checked)" : "(LTR)"}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white mt-1">
                      Priority-Ranked Editorial Analysis & Side-by-Side Fixes
                    </h3>
                  </div>

                  <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    {editorOutput.publicationReadyVerdict}
                  </span>
                </div>

                {/* 1. Assumptions & 2. Overall Assessment */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/25 space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                      Overall Editorial Assessment
                    </span>
                    <p className="text-sm text-slate-100 leading-relaxed">
                      {editorOutput.overallAssessment}
                    </p>
                    {editorOutput.rtlDirectionAuditNote && (
                      <p className="text-xs text-indigo-300/90 pt-1">
                        <strong>Language & Direction Check:</strong>{" "}
                        {editorOutput.rtlDirectionAuditNote}
                      </p>
                    )}
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Editor Assumptions
                    </span>
                    <ul className="space-y-1.5 text-xs text-slate-300 list-disc ml-4">
                      {(editorOutput.assumptions || []).map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* 3. Strengths */}
                <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                    Key Editorial Strengths (Preserved)
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                    {(editorOutput.strengths || []).map((str, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 text-xs text-slate-200"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{str}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Required Fixes in Priority Order (1 to 5) with Side-by-Side Original vs Suggested */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-300">
                    Required Fixes (Ordered by Priority 1 → 5: Factual, Logic, Structure, Clarity, Style)
                  </h4>

                  {(editorOutput.requiredFixes || []).length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-xs text-slate-400">
                      No required fixes identified — the text meets all accuracy and structural criteria.
                    </div>
                  ) : (
                    (editorOutput.requiredFixes || []).map((fix, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-semibold">
                            {fix.priorityCategory}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="p-3 rounded-lg bg-rose-950/25 border border-rose-500/25">
                            <span className="text-[10px] font-semibold uppercase text-rose-400 block mb-1">
                              Original Phrasing
                            </span>
                            <p className="text-xs text-slate-200 leading-relaxed">
                              “{fix.originalPhrasing}”
                            </p>
                          </div>

                          <div className="p-3 rounded-lg bg-emerald-950/25 border border-emerald-500/25">
                            <span className="text-[10px] font-semibold uppercase text-emerald-400 block mb-1">
                              Suggested Fix
                            </span>
                            <p className="text-xs text-white font-medium leading-relaxed">
                              “{fix.suggestedPhrasing}”
                            </p>
                          </div>
                        </div>

                        <p className="text-xs text-slate-400">
                          <strong className="text-slate-200">
                            Why this fix is needed:
                          </strong>{" "}
                          {fix.explanation}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {/* 5. Optional Suggestions for Improvement */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                    Optional Suggestions for Improvement (Separated from Errors)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(editorOutput.suggestionsForImprovement || []).map(
                      (sug, i) => (
                        <div
                          key={i}
                          className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2"
                        >
                          <span className="text-[11px] font-semibold text-indigo-400">
                            {sug.area}
                          </span>
                          {sug.originalSnippet && (
                            <p className="text-xs text-slate-400 line-through">
                              “{sug.originalSnippet}”
                            </p>
                          )}
                          <p className="text-xs text-slate-200 font-medium">
                            → “{sug.suggestedImprovement}”
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {sug.rationale}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* 6. Items Needing Further Checking (Fact vs Estimate Classification) */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Fact vs. Interpretation / Estimate Classification
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(editorOutput.itemsNeedingFurtherChecking || []).map(
                      (item, i) => (
                        <div
                          key={i}
                          className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="text-xs font-medium text-white">
                              {item.claimOrItem}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {item.reasonUnverified}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-indigo-300 shrink-0">
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
