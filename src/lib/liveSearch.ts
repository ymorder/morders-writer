export interface RedditCommentQuote {
  author: string; // e.g., u/username
  body: string;
  score: number;
}

export interface RedditThreadSignal {
  title: string;
  subreddit: string;
  author: string; // e.g., u/post_author
  url: string;
  score: number;
  numComments: number;
  selfText: string;
  topComments: RedditCommentQuote[];
}

export interface LiveFetchedSignals {
  webResults: { title: string; url: string; snippet: string }[];
  googleNews: { title: string; url: string; date: string; source: string }[];
  redditThreads: RedditThreadSignal[];
  xAndWebMentions: { title: string; url: string; snippet: string }[];
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .trim();
}

function stripHtmlTags(html: string): string {
  return decodeHtmlEntities(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/\[link\]|\[comments\]|submitted by\s+\/u\/\S+/gi, " ")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "how", "what", "why", "when", "where", "who",
  "from", "into", "about", "guide", "best", "top", "new", "2025", "2026",
  "איך", "מה", "למה", "כמה", "מתי", "איפה", "של", "על", "עם", "את", "זה",
  "או", "גם", "רק", "כל", "בין", "נגד", "לפי", "כדי", "ביותר", "מדריך",
]);

function extractSignificantTerms(topic: string): string[] {
  return topic
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
}

function isRelevantToTopic(text: string, topicTerms: string[]): boolean {
  if (topicTerms.length === 0) return true;
  const lower = text.toLowerCase();
  let matches = 0;
  for (const term of topicTerms) {
    const root =
      term.length >= 4 && /^[\u0590-\u05FF]+$/.test(term)
        ? term.slice(1)
        : term;
    if (lower.includes(term) || (root.length >= 3 && lower.includes(root))) {
      matches++;
    }
  }
  const minRequired =
    topicTerms.length === 1
      ? 1
      : Math.min(2, Math.ceil(topicTerms.length * 0.4));
  return matches >= minRequired;
}

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export async function fetchLiveMultiSourceSignals(
  topic: string,
  targetLanguage: string,
  targetCountry: string
): Promise<LiveFetchedSignals> {
  const cleanTopic = topic.trim();
  const topicTerms = extractSignificantTerms(cleanTopic);

  const isHebrew =
    /hebrew|עברית|israel|ישראל/i.test(targetLanguage) ||
    /hebrew|עברית|israel|ישראל/i.test(targetCountry) ||
    /[\u0590-\u05FF]/.test(cleanTopic);

  const hl = isHebrew ? "he" : "en-US";
  const gl = isHebrew ? "IL" : "US";
  const ceid = isHebrew ? "IL:he" : "US:en";

  const webResults: LiveFetchedSignals["webResults"] = [];
  const googleNews: LiveFetchedSignals["googleNews"] = [];
  const redditThreads: RedditThreadSignal[] = [];
  const xAndWebMentions: LiveFetchedSignals["xAndWebMentions"] = [];

  // 1. Fetch Live Organic Web Search Results via DuckDuckGo HTML (gives exact domain terminology, competitors, and verified URLs)
  try {
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(
      cleanTopic
    )}`;
    const res = await fetch(ddgUrl, {
      headers: { "User-Agent": BROWSER_UA },
      next: { revalidate: 300 },
    });
    if (res.ok) {
      const html = await res.text();
      const blocks = html.split("result__body").slice(1, 9);
      for (const block of blocks) {
        const titleMatch = block.match(/result__a[^>]*>([\s\S]*?)<\/a>/);
        const urlMatch = block.match(/uddg=([^&"']+)/);
        const snippetMatch = block.match(/result__snippet[^>]*>([\s\S]*?)<\/a>/);

        if (titleMatch && snippetMatch) {
          const title = stripHtmlTags(titleMatch[1]);
          const snippet = stripHtmlTags(snippetMatch[1]);
          let url = urlMatch ? decodeURIComponent(urlMatch[1]) : "";
          if (!url.startsWith("http")) {
            const directHref = block.match(/href="(https?:\/\/[^"]+)"/);
            if (directHref) url = directHref[1];
          }
          if (title && snippet && isRelevantToTopic(`${title} ${snippet}`, topicTerms)) {
            webResults.push({
              title,
              url: url || "https://duckduckgo.com",
              snippet,
            });
          }
        }
      }
    }
  } catch (e) {
    console.warn("DuckDuckGo web search warning:", e);
  }

  // 2. Fetch Live Google News RSS (strictly filtered for relevance to topic)
  try {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(
      cleanTopic
    )}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
    const res = await fetch(rssUrl, {
      headers: { "User-Agent": BROWSER_UA },
      next: { revalidate: 300 },
    });
    if (res.ok) {
      const xml = await res.text();
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let match: RegExpExecArray | null;
      while ((match = itemRegex.exec(xml)) !== null && googleNews.length < 5) {
        const block = match[1];
        const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/);
        const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/);
        const pubDateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
        const sourceMatch = block.match(/<source[^>]*>([\s\S]*?)<\/source>/);

        if (titleMatch && linkMatch) {
          const decodedTitle = decodeHtmlEntities(titleMatch[1]);
          if (isRelevantToTopic(decodedTitle, topicTerms)) {
            googleNews.push({
              title: decodedTitle,
              url: decodeHtmlEntities(linkMatch[1]),
              date: pubDateMatch ? decodeHtmlEntities(pubDateMatch[1]) : "Recent",
              source: sourceMatch
                ? decodeHtmlEntities(sourceMatch[1])
                : "Google News",
            });
          }
        }
      }
    }
  } catch (e) {
    console.warn("Google News RSS fetch warning:", e);
  }

  // 3. Fetch Live Reddit Atom RSS Feed + Thread Comments RSS (strictly filtered for relevance)
  try {
    const redditRssUrl = `https://www.reddit.com/search.rss?q=${encodeURIComponent(
      cleanTopic
    )}&type=link&sort=relevance&t=year`;
    const res = await fetch(redditRssUrl, {
      headers: { "User-Agent": BROWSER_UA },
      next: { revalidate: 300 },
    });

    if (res.ok) {
      const xml = await res.text();
      const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
      let match: RegExpExecArray | null;

      while (
        (match = entryRegex.exec(xml)) !== null &&
        redditThreads.length < 3
      ) {
        const entry = match[1];
        const authorMatch = entry.match(/<author>\s*<name>([\s\S]*?)<\/name>/);
        const categoryMatch = entry.match(/<category[^>]*label="([^"]+)"/);
        const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
        const linkMatch = entry.match(/<link\s+href="([^"]+)"/);
        const contentMatch = entry.match(/<content[^>]*>([\s\S]*?)<\/content>/);

        const rawAuthor = authorMatch
          ? decodeHtmlEntities(authorMatch[1]).replace(/^\/+/, "")
          : "u/redditor";
        const author = rawAuthor.startsWith("u/")
          ? rawAuthor
          : `u/${rawAuthor}`;
        const subreddit = categoryMatch
          ? decodeHtmlEntities(categoryMatch[1])
          : "r/reddit";
        const title = titleMatch
          ? decodeHtmlEntities(titleMatch[1])
          : cleanTopic;
        const url = linkMatch
          ? decodeHtmlEntities(linkMatch[1])
          : "https://www.reddit.com";
        const selfText = contentMatch
          ? stripHtmlTags(contentMatch[1]).slice(0, 300)
          : "";

        if (!isRelevantToTopic(`${title} ${selfText}`, topicTerms)) {
          continue;
        }

        const topComments: RedditCommentQuote[] = [];

        if (url.includes("/comments/")) {
          try {
            const cleanThreadUrl = url.replace(/\/$/, "");
            const commentsRssUrl = `${cleanThreadUrl}.rss?limit=4`;
            const cRes = await fetch(commentsRssUrl, {
              headers: { "User-Agent": BROWSER_UA },
            });
            if (cRes.ok) {
              const cXml = await cRes.text();
              const cEntryRegex = /<entry>([\s\S]*?)<\/entry>/g;
              let cMatch: RegExpExecArray | null;
              let idx = 0;
              while (
                (cMatch = cEntryRegex.exec(cXml)) !== null &&
                topComments.length < 2
              ) {
                idx++;
                if (idx === 1) continue;
                const cBlock = cMatch[1];
                const cAuthorMatch = cBlock.match(
                  /<author>\s*<name>([\s\S]*?)<\/name>/
                );
                const cContentMatch = cBlock.match(
                  /<content[^>]*>([\s\S]*?)<\/content>/
                );
                if (cAuthorMatch && cContentMatch) {
                  const rawCAuthor = decodeHtmlEntities(
                    cAuthorMatch[1]
                  ).replace(/^\/+/, "");
                  const cAuthor = rawCAuthor.startsWith("u/")
                    ? rawCAuthor
                    : `u/${rawCAuthor}`;
                  const cBody = stripHtmlTags(cContentMatch[1]).slice(0, 240);
                  if (
                    cAuthor !== "u/AutoModerator" &&
                    cBody.length > 20 &&
                    !cBody.includes("[deleted]")
                  ) {
                    topComments.push({
                      author: cAuthor,
                      body: cBody,
                      score: 10,
                    });
                  }
                }
              }
            }
          } catch {
            // ignore comment rss error
          }
        }

        redditThreads.push({
          title,
          subreddit,
          author,
          url,
          score: 25,
          numComments: topComments.length + 5,
          selfText: selfText || title,
          topComments,
        });
      }
    }
  } catch (e) {
    console.warn("Reddit RSS fetch warning:", e);
  }

  return { webResults, googleNews, redditThreads, xAndWebMentions };
}
