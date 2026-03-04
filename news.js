(function () {
  const config = {
    newsApiKey: "",
    gdeltEndpoint: "https://api.gdeltproject.org/api/v2/doc/doc",
    rssToJsonEndpoint: "https://api.rss2json.com/v1/api.json",
    xRssEndpoint: "https://nitter.net/search/rss",
    curatedConflictFeeds: [
      "https://www.aljazeera.com/xml/rss/all.xml",
      "https://www.reuters.com/world/middle-east/rss",
      "https://feeds.bbci.co.uk/news/world/middle_east/rss.xml",
      "https://www.jpost.com/rss/rssfeedsheadlines.aspx"
    ]
  };

  const middleEastKeywords = [
    "gaza", "israel", "palestinian", "west bank", "lebanon", "hezbollah", "syria", "damascus", "aleppo",
    "iraq", "iran", "tehran", "yemen", "houthi", "red sea", "aden", "saudi", "uae", "qatar", "jordan",
    "doha", "abu dhabi", "dubai"
  ];

  function isMiddleEastWarUpdate(...segments) {
    const text = segments.join(" ").toLowerCase();
    const hasRegion = middleEastKeywords.some((kw) => text.includes(kw));
    const hasConflict = /(war|conflict|strike|missile|drone|attack|raid|shell|artillery|military|troop|airstrike|ceasefire|truce|negotiation|talks|hostage)/.test(text);
    return hasRegion && hasConflict;
  }

  async function fetchFromGDELT(query = "(war OR conflict OR strike OR missile OR drone OR ceasefire OR truce OR talks OR negotiation) AND (Israel OR Gaza OR Lebanon OR Syria OR Iran OR Iraq OR Yemen OR Red Sea OR Qatar OR UAE OR Doha OR Abu Dhabi)", max = 12) {
    const params = new URLSearchParams({
      query,
      mode: "ArtList",
      format: "json",
      maxrecords: String(max),
      sort: "HybridRel"
    });

    const response = await fetch(`${config.gdeltEndpoint}?${params}`);
    if (!response.ok) throw new Error(`GDELT request failed (${response.status})`);
    const data = await response.json();
    const articles = data.articles || [];

    return articles
      .filter((article) => isMiddleEastWarUpdate(article.title, article.sourcecountry, article.url))
      .map((article, idx) => ({
        id: `gdelt-${Date.now()}-${idx}`,
        title: article.title || "Middle East conflict update",
        summary: article.seendate ? `Seen ${article.seendate}` : "No summary available.",
        description: article.socialimage ? `Related media: ${article.socialimage}` : (article.url || "No additional details"),
        category: "Middle East War",
        severity: inferSeverity(article.title),
        coords: inferCoordinates(article.sourcecountry, idx),
        timestamp: Date.parse(article.seendate) || Date.now(),
        sources: [{ label: "GDELT Article", url: article.url || "https://www.gdeltproject.org/" }]
      }));
  }

  async function fetchFromNewsAPI(query = "(Israel OR Gaza OR Lebanon OR Syria OR Iran OR Yemen OR Qatar OR UAE OR Doha OR Abu Dhabi OR Dubai) AND (war OR conflict OR strike OR missile OR drone OR ceasefire OR talks OR negotiation)", pageSize = 10) {
    if (!config.newsApiKey) return [];
    const params = new URLSearchParams({ q: query, pageSize: String(pageSize), apiKey: config.newsApiKey, language: "en" });
    const res = await fetch(`https://newsapi.org/v2/everything?${params}`);
    if (!res.ok) throw new Error(`NewsAPI request failed (${res.status})`);
    const payload = await res.json();

    return (payload.articles || [])
      .filter((article) => isMiddleEastWarUpdate(article.title, article.description, article.content))
      .map((article, idx) => ({
        id: `newsapi-${Date.now()}-${idx}`,
        title: article.title || "Middle East conflict update",
        summary: article.description || "No summary available.",
        description: article.content || article.description || "No details available.",
        category: "Middle East War",
        severity: inferSeverity(article.title, article.description),
        coords: inferCoordinates(article.source?.name, idx),
        timestamp: Date.parse(article.publishedAt) || Date.now(),
        sources: [{ label: article.source?.name || "NewsAPI", url: article.url || "https://newsapi.org/" }]
      }));
  }

  async function fetchFromRSS(rssUrl) {
    if (!rssUrl) return [];
    const params = new URLSearchParams({ rss_url: rssUrl });
    const res = await fetch(`${config.rssToJsonEndpoint}?${params}`);
    if (!res.ok) throw new Error(`RSS request failed (${res.status})`);
    const data = await res.json();

    return (data.items || [])
      .filter((item) => isMiddleEastWarUpdate(item.title, item.description, item.content))
      .slice(0, 10)
      .map((item, idx) => ({
        id: `rss-${Date.now()}-${idx}`,
        title: item.title || "Middle East conflict update",
        summary: stripHtml(item.description || ""),
        description: stripHtml(item.content || item.description || ""),
        category: "Middle East War",
        severity: inferSeverity(item.title, item.description),
        coords: inferCoordinates(data.feed?.title, idx),
        timestamp: Date.parse(item.pubDate) || Date.now(),
        sources: [{ label: data.feed?.title || "RSS Source", url: item.link || rssUrl }]
      }));
  }

  async function fetchFromCuratedConflictFeeds(maxPerFeed = 5) {
    const tasks = config.curatedConflictFeeds.map((url) => fetchFromRSS(url));
    const settled = await Promise.allSettled(tasks);

    return settled
      .filter((result) => result.status === "fulfilled")
      .flatMap((result) => result.value.slice(0, maxPerFeed).map((item) => ({
        ...item,
        category: "Middle East War",
        severity: inferSeverity(item.title, item.summary)
      })));
  }

  async function fetchFromX(searchQuery = "(Israel OR Gaza OR Lebanon OR Syria OR Iran OR Yemen OR Red Sea OR Qatar OR UAE OR Doha OR Abu Dhabi OR Dubai) (war OR conflict OR missile OR strike OR drone OR ceasefire OR talks OR negotiation) lang:en", max = 10) {
    const params = new URLSearchParams({ q: searchQuery, f: "tweets" });
    const rssUrl = `${config.xRssEndpoint}?${params}`;
    const items = await fetchFromRSS(rssUrl);

    return items.slice(0, max).map((item) => ({
      ...item,
      id: `x-${item.id}`,
      category: "Middle East War",
      severity: inferSeverity(item.title, item.summary),
      sources: item.sources.map((src) => ({
        label: "X / Nitter",
        url: src.url
      }))
    }));
  }

  function inferSeverity(...segments) {
    const text = segments.join(" ").toLowerCase();
    if (/(strike|missile|invasion|air raid|casualt|explosion|drone attack|airstrike|rocket barrage)/.test(text)) return "high";
    if (/(military|troop|border|armed|ceasefire|naval warning|artillery)/.test(text)) return "medium";
    return "low";
  }

  function inferCoordinates(seed = "", i = 0) {
    const hash = Array.from(String(seed)).reduce((sum, ch) => sum + ch.charCodeAt(0), 0) + i * 17;
    const lat = 12 + (hash % 25);
    const lng = 33 + ((hash * 3) % 27);
    return [Number(lat.toFixed(3)), Number(lng.toFixed(3))];
  }

  function stripHtml(input) {
    return input.replace(/<[^>]*>/g, "").trim().slice(0, 220);
  }

  window.NewsIngest = {
    config,
    fetchFromGDELT,
    fetchFromNewsAPI,
    fetchFromRSS,
    fetchFromCuratedConflictFeeds,
    fetchFromX
  };
})();
