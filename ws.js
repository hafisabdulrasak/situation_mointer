(function () {
  function connectWebSocket(url, handlers = {}) {
    if (!url) {
      return { close() {}, status: "disabled" };
    }

    const ws = new WebSocket(url);
    ws.addEventListener("open", () => handlers.onOpen && handlers.onOpen());
    ws.addEventListener("close", () => handlers.onClose && handlers.onClose());
    ws.addEventListener("error", (error) => handlers.onError && handlers.onError(error));

    ws.addEventListener("message", (msg) => {
      try {
        const payload = JSON.parse(msg.data);
        if (!payload?.type) return;
        if (payload.type === "new_event" && handlers.onEvent) handlers.onEvent(payload.data);
        if (payload.type === "aircraft_update" && handlers.onAircraft) handlers.onAircraft(payload.data);
        if (payload.type === "ship_update" && handlers.onShip) handlers.onShip(payload.data);
      } catch (err) {
        handlers.onError && handlers.onError(err);
      }
    });

    return ws;
  }

  window.OSINTWS = { connectWebSocket };
})();
