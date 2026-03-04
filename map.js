(function () {
  function createSeverityIcon(severity) {
    const color = severity === "high" ? "#ff5f6d" : severity === "medium" ? "#ffb020" : "#16c98d";
    return L.divIcon({
      className: "severity-marker",
      html: `<span style="display:block;width:12px;height:12px;border-radius:50%;background:${color};box-shadow:0 0 10px ${color}"></span>`,
      iconSize: [12, 12]
    });
  }

  function arrowMarker(color, heading = 0, label = "") {
    return L.divIcon({
      className: "heading-marker",
      html: `<div style="transform:rotate(${heading}deg);color:${color};font-size:18px;text-shadow:0 0 8px ${color}">▲</div><small>${label}</small>`,
      iconSize: [20, 22]
    });
  }

  function initMap(elementId = "map") {
    const map = L.map(elementId, {
      center: [31.8, 44.8],
      zoom: 5,
      minZoom: 4,
      maxZoom: 10,
      zoomControl: true,
      attributionControl: true,
      zoomSnap: 0.5
    });

    const operationalBounds = L.latLngBounds(
      [20, -15],
      [60, 70]
    );
    map.setMaxBounds(operationalBounds.pad(0.1));

    map.createPane("labels");
    map.getPane("labels").style.pointerEvents = "none";

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 20,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png", {
      pane: "labels",
      subdomains: "abcd",
      maxZoom: 20,
      attribution: '&copy; <a href="https://carto.com/attributions">CARTO labels</a>'
    }).addTo(map);

    const eventCluster = L.markerClusterGroup();
    const aircraftLayer = L.layerGroup();
    const shipLayer = L.layerGroup();
    const heatLayer = L.heatLayer([], { radius: 25, blur: 18, maxZoom: 7, gradient: { 0.4: '#19f5ff', 0.7: '#687dff', 1: '#ff5f6d' } });

    map.addLayer(eventCluster);
    map.addLayer(aircraftLayer);
    map.addLayer(shipLayer);
    map.addLayer(heatLayer);

    const state = {
      map,
      layers: { events: eventCluster, aircraft: aircraftLayer, ships: shipLayer, heatmap: heatLayer },
      eventMarkers: new Map(),
      aircraftMarkers: new Map(),
      shipMarkers: new Map()
    };

    function upsertEventMarker(event, onClick) {
      let marker = state.eventMarkers.get(event.id);
      if (!marker) {
        marker = L.marker(event.coords, { icon: createSeverityIcon(event.severity) });
        marker.on("click", () => onClick(event.id));
        marker.addTo(eventCluster);
        state.eventMarkers.set(event.id, marker);
      } else {
        marker.setLatLng(event.coords);
        marker.setIcon(createSeverityIcon(event.severity));
      }
      marker.bindPopup(`<strong>${event.title}</strong><br>${event.summary}`);
    }

    function refreshHeat(events) {
      heatLayer.setLatLngs(events.map((evt) => [evt.coords[0], evt.coords[1], evt.severity === "high" ? 1 : evt.severity === "medium" ? 0.7 : 0.4]));
    }

    function upsertAircraft(track) {
      let marker = state.aircraftMarkers.get(track.id);
      const icon = arrowMarker("#19f5ff", track.heading, "✈");
      if (!marker) {
        marker = L.marker([track.lat, track.lng], { icon }).addTo(aircraftLayer);
        state.aircraftMarkers.set(track.id, marker);
      } else {
        marker.setLatLng([track.lat, track.lng]);
        marker.setIcon(icon);
      }
      marker.bindPopup(`${track.callsign}<br>ALT ${track.altitude} ft | SPD ${track.speed} kt`);
    }

    function upsertShip(track) {
      let marker = state.shipMarkers.get(track.id);
      const icon = arrowMarker("#9eff7a", track.course, "◉");
      if (!marker) {
        marker = L.marker([track.lat, track.lng], { icon }).addTo(shipLayer);
        state.shipMarkers.set(track.id, marker);
      } else {
        marker.setLatLng([track.lat, track.lng]);
        marker.setIcon(icon);
      }
      marker.bindPopup(`${track.name}<br>Course ${track.course}° | ${track.speed} kn`);
    }

    return {
      state,
      upsertEventMarker,
      upsertAircraft,
      upsertShip,
      refreshHeat,
      centerOn(coords, zoom = 6) {
        map.flyTo(coords, zoom, { duration: 1.2 });
      },
      toggleLayer(name, show) {
        const layer = state.layers[name];
        if (!layer) return;
        if (show && !map.hasLayer(layer)) map.addLayer(layer);
        if (!show && map.hasLayer(layer)) map.removeLayer(layer);
      }
    };
  }

  window.OSINTMap = { initMap };
})();
