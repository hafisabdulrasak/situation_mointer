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
      li.innerHTML = `
        <strong>${evt.title}</strong>
        <p>${evt.summary}</p>
        <div class="event-meta">
          <span class="sev-pill sev-${evt.severity}">${evt.severity}</span>
          <span>${evt.category}</span>
          <span>${new Date(evt.timestamp).toLocaleString()}</span>
        </div>
      `;
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
    detailEl.innerHTML = `
      <h3>${event.title}</h3>
      <p>${event.description}</p>
      <dl class="details-grid">
        <dt>Coordinates</dt><dd>${event.coords[0].toFixed(3)}, ${event.coords[1].toFixed(3)}</dd>
        <dt>Timestamp</dt><dd>${new Date(event.timestamp).toLocaleString()}</dd>
        <dt>Category</dt><dd>${event.category}</dd>
        <dt>Severity</dt><dd><span class="sev-pill sev-${event.severity}">${event.severity}</span></dd>
      </dl>
      <div class="source-links">
        <h4>Sources</h4>
        <ul>${event.sources.map((src) => `<li><a href="${src.url}" target="_blank" rel="noopener noreferrer">${src.label}</a></li>`).join("")}</ul>
      </div>
    `;
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
    const tasks = [
      NewsIngest.fetchFromGDELT("(conflict OR military OR cyber OR invasion OR strike) AND (Europe OR Middle East OR Red Sea OR Indo-Pacific)", 10),
      NewsIngest.fetchFromNewsAPI("war OR conflict OR military OR defense", 8),
      NewsIngest.fetchFromCuratedConflictFeeds(3),
      NewsIngest.fetchFromX("(war OR conflict OR military OR missile OR drone) lang:en", 8)
    ];

    const settled = await Promise.allSettled(tasks);
    settled.forEach((result) => {
      if (result.status === "rejected") {
        console.warn("News source unavailable:", result.reason?.message || result.reason);
      }
    });

    settled
      .filter((result) => result.status === "fulfilled")
      .flatMap((result) => result.value)
      .forEach(addOrUpdateEvent);
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
