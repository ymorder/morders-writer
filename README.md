# NEXUS // Autonomous SEO, GEO & Editorial Intelligence Studio

**NEXUS** is an autonomous full-stack content research, writing, and editorial intelligence platform designed to produce publish-ready, #1 ranking **Google SERP** and **Generative Engine Optimization (GEO)** articles (cited by ChatGPT, Gemini, Perplexity, and Google AI Overviews).

Before writing a single word, NEXUS autonomously evaluates whether a topic can be covered authoritatively by pulling live signals across **Google News**, **Reddit** practitioner discussions, **X (Twitter)** commentary, and **Official Authoritative Sources**.

---

## Key Capabilities

### 1. Autonomous Topic Feasibility & Multi-Source Intelligence (`/api/feasibility`)
- **Live Web, News, Reddit & X Grounding:** Queries real-time Google News RSS feeds, the live Reddit search API (`r/...` discussions, upvotes, and edge cases), and Google Search Grounding via Gemini 2.5.
- **Feasibility Scoring (0–100):** Calculates an explicit confidence score and verdict (`APPROVED FOR AUTHORITATIVE WRITING` vs. `INSUFFICIENT VERIFIED DATA`).
- **Smart Input Handling:**
  1. Verifies that **Target Language** and **Target Country/Market** are specified before starting.
  2. Automatically infers sensible defaults for **Target Audience**, **Website/Brand Tone**, and **Word Count** if left blank, displaying them transparently in an **Explicit Assumptions** panel.

### 2. 9-Stage Senior SEO & GEO Writer Pipeline (`/api/write`)
Executes all 9 specialized stages in sequence:
- **Stage 1 — Competitor Research:** Primary keyword, secondary keywords, Knowledge Graph entities, People Also Ask (PAA) questions, and competitor content gaps.
- **Stage 2 — GEO (AI Prompt Research):** 10–15 realistic user prompts across search styles (*Informational, How-To, Best/Top, Comparison, Edge-Case*) paired with quote-ready 2–3 sentence direct answers engineered for RAG chunk extraction.
- **Stage 3 — Asymmetric Outline:** 1 H1, direct opening, H2/H3 sections with self-contained direct answers, FAQ section, and practical conclusion.
- **Stage 4 — Full Publish-Ready Article:**
  - Opens with a 2–3 sentence direct answer to the primary query.
  - Starts every H2 section with a 1–2 sentence self-contained resolution.
  - Includes mathematically reconciled quantitative comparison tables with explicit underlying formulas.
  - Embeds legal, contractual, and regulatory qualifications directly inside primary clauses.
  - Enforces **100% character set purity** in the target language (including full Right-to-Left support for Hebrew and Arabic), **zero em-dashes (`—`)**, and zero AI clichés (*"delve", "unlock", "game changer", "seamless", "לצלול", "הסיבה לכך פשוטה"*).
- **Stage 5 — Meta Tags & Slug:** 3 Meta Title options (50–60 chars) + recommended pick, 3 Meta Description options (140–155 chars) + recommended pick, and 1 hyphenated English URL slug.
- **Stage 6 — Featured Image:** 16:9 realistic editorial photography / abstract conceptual art prompt (zero text/logos), descriptive alt text with primary keyword, and hyphenated English filename.
- **Stage 7 — Fact Check & Source Verification Table:** Verifies claims, dates, laws, and figures against authoritative sources with clickable URLs.
- **Stage 8 — Uniqueness & Mathematical Audit:** Cross-verifies all table rows, percentages, and formulas for 100% reconciliation.
- **Stage 9 — Humanization & Style Verification:** Audits sentence cadence variety and confirms zero banned patterns or em-dashes.

### 3. Digital Marketing Agency Editor & Text Analyst (`/api/edit`)
Runs automatically at the end of the **Autonomous Full Pipeline** or as a standalone **Agency Editor** mode for any submitted client text:
- **Native Language & RTL Directionality:** Automatically detects the language of the submitted text (e.g., English, Hebrew, Arabic, Spanish), edits in that language, and audits RTL number/punctuation alignment.
- **Task Card & Standing Agency Rules:** Respects custom Task Cards (which override defaults) and Standing Client/Agency Rules.
- **Strict 1 → 5 Priority Ordering:**
  1. Factual errors or misleading information
  2. Logical failures, contradictions, and substantial gaps
  3. Structural issues and poor fit with the target audience
  4. Clarity and readability issues
  5. Stylistic polish and phrasing preferences
- **Side-by-Side Diffs:** Displays **Original Phrasing** vs. **Suggested Fix** side by side with a clear explanation of why each fix is required, strictly separating required fixes from optional suggestions.

---

## Dual Execution Engine (Works Out-of-the-Box!)

1. **Zero-Config Live Scraper Mode (Default):** Works immediately out of the box without requiring an API key—fetches live Google News RSS feeds and live Reddit JSON threads for your topic and synthesizes the full 9-stage SEO/GEO package and editorial audit.
2. **Gemini 2.5 Flash / Pro + Google Search Grounding Mode:** Click **"Live Scraper Active (Add Key Optional)"** in the top-right bar to enter a `GEMINI_API_KEY` (or configure it in `.env.local`) for full LLM synthesis with live Google Search Grounding.

---

## Getting Started Locally

```bash
# 1. Install dependencies
npm install

# 2. (Optional) Configure your Gemini API key in .env.local
echo "GEMINI_API_KEY=your_gemini_api_key_here" > .env.local

# 3. Start the development server
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## Deploying to Production (Vercel)

1. Push this repository to GitHub (`https://github.com/ymorder/nexus-seo-geo-studio`).
2. Import the repository at **https://vercel.com/new**.
3. *(Optional)* Add `GEMINI_API_KEY` under **Environment Variables**.
4. Click **Deploy**.
