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
  const redditThreads: RedditThreadSignal[] = [];
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

  // 2. Fetch Live Reddit Search JSON API + Top User Comments with u/username
  try {
    const redditUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(
      cleanTopic
    )}&sort=relevance&t=year&limit=4`;
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
        if (post && post.title && post.permalink) {
          const topComments: RedditCommentQuote[] = [];

          // Fetch top comments from the thread permalink to get exact u/username and what they wrote
          try {
            const threadJsonUrl = `https://www.reddit.com${post.permalink}.json?limit=6&sort=top`;
            const cRes = await fetch(threadJsonUrl, {
              headers: {
                "User-Agent": "web:morders-writer:v1.0.0 (by /u/morders_writer)",
                Accept: "application/json",
              },
            });
            if (cRes.ok) {
              const cData = await cRes.json();
              const commentListing = cData?.[1]?.data?.children || [];
              for (const cItem of commentListing) {
                const c = cItem?.data;
                if (
                  c &&
                  c.body &&
                  c.author &&
                  c.author !== "AutoModerator" &&
                  c.body !== "[deleted]" &&
                  c.body !== "[removed]" &&
                  topComments.length < 2
                ) {
                  topComments.push({
                    author: `u/${c.author}`,
                    body: String(c.body).replace(/\s+/g, " ").trim().slice(0, 320),
                    score: c.score || 1,
                  });
                }
              }
            }
          } catch {
            // ignore individual comment thread failure
          }

          redditThreads.push({
            title: post.title,
            subreddit: post.subreddit_name_prefixed || `r/${post.subreddit}`,
            author: post.author ? `u/${post.author}` : "u/redditor",
            url: `https://www.reddit.com${post.permalink}`,
            score: post.score || 0,
            numComments: post.num_comments || 0,
            selfText: (post.selftext || "").replace(/\s+/g, " ").trim().slice(0, 350),
            topComments,
          });
        }
      }
    }
  } catch (e) {
    console.warn("Reddit API fetch warning:", e);
  }

  // 3. Fetch X/Twitter & Industry Pulse
  try {
    const xQuery = `${cleanTopic} (site:x.com OR site:twitter.com OR "on X" OR "analyst")`;
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
