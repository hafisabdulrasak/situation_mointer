(function () {
  const seedEvents = [
    {
      id: "evt-1",
      title: "Port disruption near Bosporus",
      summary: "Maritime traffic delays reported after security sweep.",
      description: "Authorities reported temporary hold patterns and security checks impacting maritime transit schedules.",
      category: "Maritime",
      severity: "medium",
      coords: [41.023, 29.015],
      timestamp: Date.now() - 1000 * 60 * 40,
      sources: [{ label: "Regional Maritime Bulletin", url: "https://example.com/maritime-bulletin" }]
    },
    {
      id: "evt-2",
      title: "Airspace notice over Eastern Mediterranean",
      summary: "Flight routing adjusted due to temporary restricted corridor.",
      description: "Commercial and cargo aircraft were advised to follow alternate routing around a short-duration restricted corridor.",
      category: "Aviation",
      severity: "high",
      coords: [34.7, 33.0],
      timestamp: Date.now() - 1000 * 60 * 100,
      sources: [{ label: "NOTAM Aggregator", url: "https://example.com/notam" }]
    },
    {
      id: "evt-3",
      title: "Infrastructure outage in Northern Europe",
      summary: "Localized power outage affected rail signaling for 30 minutes.",
      description: "Rail operators disclosed a short outage and partial schedule delays pending diagnostics.",
      category: "Infrastructure",
      severity: "low",
      coords: [52.37, 4.9],
      timestamp: Date.now() - 1000 * 60 * 180,
      sources: [{ label: "Transit Operations Desk", url: "https://example.com/transit" }]
    }
  ];

  function randomOffset() {
    return (Math.random() - 0.5) * 0.6;
  }

  function generateAircraft(count = 18) {
    return Array.from({ length: count }, (_, i) => ({
      id: `ac-${i + 1}`,
      callsign: `FLT${1000 + i}`,
      lat: 25 + Math.random() * 30,
      lng: -10 + Math.random() * 65,
      heading: Math.round(Math.random() * 359),
      altitude: 18000 + Math.round(Math.random() * 24000),
      speed: 320 + Math.round(Math.random() * 240)
    }));
  }

  function generateShips(count = 14) {
    return Array.from({ length: count }, (_, i) => ({
      id: `ship-${i + 1}`,
      name: `MV Horizon ${i + 1}`,
      lat: 30 + Math.random() * 25,
      lng: -5 + Math.random() * 55,
      course: Math.round(Math.random() * 359),
      speed: Number((7 + Math.random() * 18).toFixed(1))
    }));
  }

  function jitterTrack(item) {
    return {
      ...item,
      lat: item.lat + randomOffset() * 0.08,
      lng: item.lng + randomOffset() * 0.08,
      heading: (item.heading + Math.round(Math.random() * 12)) % 360,
      course: (item.course + Math.round(Math.random() * 8)) % 360
    };
  }

  window.OSINTData = {
    seedEvents,
    generateAircraft,
    generateShips,
    jitterTrack
  };
})();
