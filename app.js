(function () {
  const state = {
    events: [],
    aircraft: [],
    ships: [],
    selectedEventId: null,
    mapApi: null,
    ws: null
  };

  const feedEl = document.getElementById("event-feed");
  const countEl = document.getElementById("event-count");
  const detailEl = document.getElementById("details-panel");
  const searchInput = document.getElementById("search-input");
  const timeFilter = document.getElementById("time-filter");

  function safeExternalUrl(rawUrl) {
    try {
      const parsed = new URL(rawUrl, window.location.origin);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") return parsed.href;
    } catch (_) {
      return null;
    }
    return null;
  }

  function severityScore(level) {
    return level === "high" ? 3 : level === "medium" ? 2 : 1;
  }

  function byNewestThenSeverity(a, b) {
    return b.timestamp - a.timestamp || severityScore(b.severity) - severityScore(a.severity);
  }

  function withinTimeRange(timestamp) {
    const selected = timeFilter.value;
    const map = { "1h": 1, "6h": 6, "24h": 24, "7d": 24 * 7 };
    const threshold = Date.now() - map[selected] * 3600000;
    return timestamp >= threshold;
  }

  function filteredEvents() {
    const q = searchInput.value.trim().toLowerCase();
    return state.events
      .filter((evt) => withinTimeRange(evt.timestamp))
      .filter((evt) => {
        if (!q) return true;
        return [evt.title, evt.summary, evt.category].join(" ").toLowerCase().includes(q);
      })
      .sort(byNewestThenSeverity);
  }

  function renderFeed() {
    const events = filteredEvents();
    countEl.textContent = `${events.length} events`;
    feedEl.innerHTML = "";

    for (const evt of events) {
      const li = document.createElement("li");
      li.className = `event-card ${evt.id === state.selectedEventId ? "active" : ""}`;
      li.dataset.eventId = evt.id;

      const titleEl = document.createElement("strong");
      titleEl.textContent = evt.title;

      const summaryEl = document.createElement("p");
      summaryEl.textContent = evt.summary;

      const metaEl = document.createElement("div");
      metaEl.className = "event-meta";

      const severityEl = document.createElement("span");
      severityEl.className = `sev-pill sev-${evt.severity}`;
      severityEl.textContent = evt.severity;

      const categoryEl = document.createElement("span");
      categoryEl.textContent = evt.category;

      const timestampEl = document.createElement("span");
      timestampEl.textContent = new Date(evt.timestamp).toLocaleString();

      metaEl.append(severityEl, categoryEl, timestampEl);
      li.append(titleEl, summaryEl, metaEl);
      li.addEventListener("click", () => selectEvent(evt.id));
      feedEl.appendChild(li);
    }
  }

  function renderDetails(event) {
    if (!event) {
      detailEl.className = "details-empty";
      detailEl.innerHTML = "<p>Select an event marker or feed item to view details.</p>";
      return;
    }

    detailEl.className = "";
    detailEl.replaceChildren();

    const titleEl = document.createElement("h3");
    titleEl.textContent = event.title;

    const descriptionEl = document.createElement("p");
    descriptionEl.textContent = event.description;

    const detailsGrid = document.createElement("dl");
    detailsGrid.className = "details-grid";

    const detailRows = [
      ["Coordinates", `${event.coords[0].toFixed(3)}, ${event.coords[1].toFixed(3)}`],
      ["Timestamp", new Date(event.timestamp).toLocaleString()],
      ["Category", event.category]
    ];

    detailRows.forEach(([term, value]) => {
      const dt = document.createElement("dt");
      dt.textContent = term;
      const dd = document.createElement("dd");
      dd.textContent = value;
      detailsGrid.append(dt, dd);
    });

    const severityTerm = document.createElement("dt");
    severityTerm.textContent = "Severity";
    const severityDef = document.createElement("dd");
    const severityPill = document.createElement("span");
    severityPill.className = `sev-pill sev-${event.severity}`;
    severityPill.textContent = event.severity;
    severityDef.appendChild(severityPill);
    detailsGrid.append(severityTerm, severityDef);

    const sourceContainer = document.createElement("div");
    sourceContainer.className = "source-links";
    const sourceTitle = document.createElement("h4");
    sourceTitle.textContent = "Sources";
    const sourceList = document.createElement("ul");

    event.sources.forEach((src) => {
      const url = safeExternalUrl(src.url);
      if (!url) return;

      const sourceItem = document.createElement("li");
      const sourceLink = document.createElement("a");
      sourceLink.href = url;
      sourceLink.target = "_blank";
      sourceLink.rel = "noopener noreferrer";
      sourceLink.textContent = src.label;
      sourceItem.appendChild(sourceLink);
      sourceList.appendChild(sourceItem);
    });

    sourceContainer.append(sourceTitle, sourceList);
    detailEl.append(titleEl, descriptionEl, detailsGrid, sourceContainer);
  }

  function selectEvent(id) {
    state.selectedEventId = id;
    const event = state.events.find((evt) => evt.id === id);
    renderFeed();
    renderDetails(event);
    if (event) state.mapApi.centerOn(event.coords, 6);
  }

  function addOrUpdateEvent(event) {
    const existing = state.events.findIndex((evt) => evt.id === event.id);
    if (existing >= 0) state.events[existing] = event;
    else state.events.push(event);
    state.mapApi.upsertEventMarker(event, selectEvent);
    state.mapApi.refreshHeat(state.events);
    renderFeed();
  }

  function refreshMovingLayers() {
    state.aircraft.forEach((a) => state.mapApi.upsertAircraft(a));
    state.ships.forEach((s) => state.mapApi.upsertShip(s));
  }

  function initLayers() {
    document.querySelectorAll("[data-layer]").forEach((input) => {
      input.addEventListener("change", (e) => {
        state.mapApi.toggleLayer(e.target.dataset.layer, e.target.checked);
      });
    });
  }

  function startSimulatedRealtime() {
    setInterval(() => {
      state.aircraft = state.aircraft.map((item) => ({ ...OSINTData.jitterTrack(item), altitude: item.altitude + Math.round((Math.random() - 0.5) * 1000), speed: item.speed + Math.round((Math.random() - 0.5) * 20) }));
      state.ships = state.ships.map((item) => ({ ...OSINTData.jitterTrack(item) }));
      refreshMovingLayers();
    }, 4500);
  }

  async function loadNewsEvents() {
    try {
      const [gdelt, newsApi] = await Promise.all([
        NewsIngest.fetchFromGDELT("(conflict OR military OR cyber) AND (Europe OR Middle East)", 8),
        NewsIngest.fetchFromNewsAPI("geopolitics OR conflict", 6)
      ]);
      [...gdelt, ...newsApi].forEach(addOrUpdateEvent);
    } catch (error) {
      console.warn("News ingest limited:", error.message);
    }
  }

  function initWebSocket() {
    const params = new URLSearchParams(location.search);
    const wsUrl = params.get("ws") || "";
    state.ws = OSINTWS.connectWebSocket(wsUrl, {
      onEvent: (evt) => addOrUpdateEvent(evt),
      onAircraft: (track) => {
        const idx = state.aircraft.findIndex((a) => a.id === track.id);
        if (idx >= 0) state.aircraft[idx] = track;
        else state.aircraft.push(track);
        state.mapApi.upsertAircraft(track);
      },
      onShip: (track) => {
        const idx = state.ships.findIndex((s) => s.id === track.id);
        if (idx >= 0) state.ships[idx] = track;
        else state.ships.push(track);
        state.mapApi.upsertShip(track);
      },
      onError: (error) => console.warn("WebSocket issue", error)
    });
  }

  function bootstrap() {
    state.mapApi = OSINTMap.initMap("map");
    state.events = [...OSINTData.seedEvents];
    state.aircraft = OSINTData.generateAircraft(20);
    state.ships = OSINTData.generateShips(16);

    state.events.forEach((evt) => state.mapApi.upsertEventMarker(evt, selectEvent));
    state.mapApi.refreshHeat(state.events);
    refreshMovingLayers();

    initLayers();
    renderFeed();
    renderDetails(null);
    loadNewsEvents();
    initWebSocket();
    startSimulatedRealtime();

    searchInput.addEventListener("input", renderFeed);
    timeFilter.addEventListener("change", renderFeed);
  }

  bootstrap();
})();
