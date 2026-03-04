(function () {
  const config = {
    newsApiKey: "",
    gdeltEndpoint: "https://api.gdeltproject.org/api/v2/doc/doc",
    rssToJsonEndpoint: "https://api.rss2json.com/v1/api.json"
  };

  async function fetchFromGDELT(query = "conflict OR crisis", max = 10) {
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

    return articles.map((article, idx) => ({
      id: `gdelt-${Date.now()}-${idx}`,
      title: article.title || "Untitled GDELT event",
      summary: article.seendate ? `Seen ${article.seendate}` : "No summary available.",
      description: article.socialimage ? `Related media: ${article.socialimage}` : (article.url || "No additional details"),
      category: "News",
      severity: "medium",
      coords: inferCoordinates(article.sourcecountry, idx),
      timestamp: Date.parse(article.seendate) || Date.now(),
      sources: [{ label: "GDELT Article", url: article.url || "https://www.gdeltproject.org/" }]
    }));
  }

  async function fetchFromNewsAPI(query = "geopolitics", pageSize = 10) {
    if (!config.newsApiKey) return [];
    const params = new URLSearchParams({ q: query, pageSize: String(pageSize), apiKey: config.newsApiKey, language: "en" });
    const res = await fetch(`https://newsapi.org/v2/everything?${params}`);
    if (!res.ok) throw new Error(`NewsAPI request failed (${res.status})`);
    const payload = await res.json();

    return (payload.articles || []).map((article, idx) => ({
      id: `newsapi-${Date.now()}-${idx}`,
      title: article.title || "NewsAPI Event",
      summary: article.description || "No summary available.",
      description: article.content || article.description || "No details available.",
      category: "News",
      severity: "low",
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

    return (data.items || []).slice(0, 8).map((item, idx) => ({
      id: `rss-${Date.now()}-${idx}`,
      title: item.title || "RSS event",
      summary: stripHtml(item.description || ""),
      description: stripHtml(item.content || item.description || ""),
      category: "RSS",
      severity: "low",
      coords: inferCoordinates(data.feed?.title, idx),
      timestamp: Date.parse(item.pubDate) || Date.now(),
      sources: [{ label: data.feed?.title || "RSS Source", url: item.link || rssUrl }]
    }));
  }

  function inferCoordinates(seed = "", i = 0) {
    const hash = Array.from(String(seed)).reduce((sum, ch) => sum + ch.charCodeAt(0), 0) + i * 17;
    const lat = -50 + (hash % 110);
    const lng = -170 + ((hash * 3) % 340);
    return [Number(lat.toFixed(3)), Number(lng.toFixed(3))];
  }

  function stripHtml(input) {
    return input.replace(/<[^>]*>/g, "").trim().slice(0, 220);
  }

  window.NewsIngest = {
    config,
    fetchFromGDELT,
    fetchFromNewsAPI,
    fetchFromRSS
  };
})();
