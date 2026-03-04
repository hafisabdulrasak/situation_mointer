(function () {
  const seedEvents = [
    {
      id: "evt-1",
      title: "Air defense alert near Northern Israel",
      summary: "Multiple interceptor launches reported after inbound projectile detection.",
      description: "Regional monitoring channels reported short-notice alerts and temporary shelter warnings in border communities.",
      category: "Middle East Conflict",
      severity: "medium",
      coords: [33.002, 35.11],
      timestamp: Date.now() - 1000 * 60 * 40,
      sources: [{ label: "Regional Security Monitor", url: "https://example.com/security-monitor" }]
    },
    {
      id: "evt-2",
      title: "Red Sea shipping corridor incident update",
      summary: "Commercial vessels rerouted after renewed anti-ship threat warnings.",
      description: "Shipping advisories flagged elevated risk around southern Red Sea transit lanes, prompting insurers to reassess voyage coverage.",
      category: "Middle East Maritime",
      severity: "high",
      coords: [14.52, 42.83],
      timestamp: Date.now() - 1000 * 60 * 100,
      sources: [{ label: "Maritime Threat Advisory", url: "https://example.com/threat-advisory" }]
    },
    {
      id: "evt-3",
      title: "Cross-border artillery exchange reported in southern Syria",
      summary: "Field sources indicate short-duration strikes near contested frontier positions.",
      description: "Open-source reporting indicates retaliatory shelling in rural zones with no independently confirmed casualty figures yet.",
      category: "Middle East Conflict",
      severity: "medium",
      coords: [32.73, 36.08],
      timestamp: Date.now() - 1000 * 60 * 180,
      sources: [{ label: "Conflict Tracking Desk", url: "https://example.com/conflict-desk" }]
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
