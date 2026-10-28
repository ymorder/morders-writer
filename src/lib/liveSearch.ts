import { NextRequest, NextResponse } from "next/server";

export interface LiveFetchedSignals {
  googleNews: { title: string; url: string; date: string; source: string }[];
  redditThreads: {
    title: string;
    subreddit: string;
    url: string;
    score: number;
    numComments: number;
    snippet: string;
  }[];
  xAndWebMentions: { title: string; url: string; snippet: string }[];
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .trim();
}

export async function fetchLiveMultiSourceSignals(
  topic: string,
  targetLanguage: string,
  targetCountry: string
): Promise<LiveFetchedSignals> {
  const cleanTopic = topic.trim();
  const isHebrew =
    /hebrew|עברית|israel|ישראל/i.test(targetLanguage) ||
    /hebrew|עברית|israel|ישראל/i.test(targetCountry) ||
    /[\u0590-\u05FF]/.test(cleanTopic);

  const hl = isHebrew ? "he" : "en-US";
  const gl = isHebrew ? "IL" : "US";
  const ceid = isHebrew ? "IL:he" : "US:en";

  const googleNews: LiveFetchedSignals["googleNews"] = [];
  const redditThreads: LiveFetchedSignals["redditThreads"] = [];
  const xAndWebMentions: LiveFetchedSignals["xAndWebMentions"] = [];

  // 1. Fetch Live Google News RSS
  try {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(
      cleanTopic
    )}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
    const res = await fetch(rssUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MordersWriter/1.0)" },
      next: { revalidate: 300 },
    });
    if (res.ok) {
      const xml = await res.text();
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let match: RegExpExecArray | null;
      while ((match = itemRegex.exec(xml)) !== null && googleNews.length < 6) {
        const block = match[1];
        const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/);
        const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/);
        const pubDateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
        const sourceMatch = block.match(/<source[^>]*>([\s\S]*?)<\/source>/);

        if (titleMatch && linkMatch) {
          googleNews.push({
            title: decodeHtmlEntities(titleMatch[1]),
            url: decodeHtmlEntities(linkMatch[1]),
            date: pubDateMatch ? decodeHtmlEntities(pubDateMatch[1]) : "Recent",
            source: sourceMatch ? decodeHtmlEntities(sourceMatch[1]) : "Google News",
          });
        }
      }
    }
  } catch (e) {
    console.warn("Google News RSS fetch warning:", e);
  }

  // 2. Fetch Live Reddit Search JSON API
  try {
    const redditUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(
      cleanTopic
    )}&sort=relevance&t=year&limit=6`;
    const res = await fetch(redditUrl, {
      headers: {
        "User-Agent": "web:morders-writer:v1.0.0 (by /u/morders_writer)",
        Accept: "application/json",
      },
      next: { revalidate: 300 },
    });
    if (res.ok) {
      const data = await res.json();
      const children = data?.data?.children || [];
      for (const child of children) {
        const post = child?.data;
        if (post && post.title) {
          redditThreads.push({
            title: post.title,
            subreddit: post.subreddit_name_prefixed || `r/${post.subreddit}`,
            url: `https://www.reddit.com${post.permalink}`,
            score: post.score || 0,
            numComments: post.num_comments || 0,
            snippet: (post.selftext || "").slice(0, 220).replace(/\s+/g, " ").trim(),
          });
        }
      }
    }
  } catch (e) {
    console.warn("Reddit API fetch warning:", e);
  }

  // 3. Fetch X/Twitter & Industry Pulse via Google News RSS site:x.com / expert commentary
  try {
    const xQuery = `${cleanTopic} (site:x.com OR site:twitter.com OR "on X" OR "analyst" OR "benchmark")`;
    const xRssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(
      xQuery
    )}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
    const res = await fetch(xRssUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MordersWriter/1.0)" },
      next: { revalidate: 300 },
    });
    if (res.ok) {
      const xml = await res.text();
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let match: RegExpExecArray | null;
      while ((match = itemRegex.exec(xml)) !== null && xAndWebMentions.length < 4) {
        const block = match[1];
        const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/);
        const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/);
        const sourceMatch = block.match(/<source[^>]*>([\s\S]*?)<\/source>/);
        if (titleMatch && linkMatch) {
          const cleanTitle = decodeHtmlEntities(titleMatch[1]);
          const sourceName = sourceMatch ? decodeHtmlEntities(sourceMatch[1]) : "Industry Pulse";
          xAndWebMentions.push({
            title: cleanTitle,
            url: decodeHtmlEntities(linkMatch[1]),
            snippet: `Surfaced via ${sourceName} real-time index for ${cleanTopic}.`,
          });
        }
      }
    }
  } catch (e) {
    console.warn("X/Web pulse fetch warning:", e);
  }

  return { googleNews, redditThreads, xAndWebMentions };
}
