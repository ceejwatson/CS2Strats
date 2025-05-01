const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files (index.html, script.js, maps/, images/)
app.use(express.static(path.join(__dirname, "public")));

// Initial strategies data
let strats = {
  Mirage: [
    {
      name: "A Site Executes",
      description: "Essential smokes and molotovs for A site executes on Mirage",
      markers: [
        { x: 30, y: 20, type: "smoke", gifUrl: "/api/placeholder/640/360", description: "CT Spawn smoke from T ramp" },
        { x: 50, y: 40, type: "smoke", gifUrl: "/api/placeholder/640/360", description: "Jungle smoke from T spawn" },
        { x: 60, y: 45, type: "molotov", gifUrl: "/api/placeholder/640/360", description: "Stairs molotov from T ramp" }
      ]
    },
    // ... (add other initial Mirage strategies as in your original code)
  ],
  Inferno: [
    {
      name: "A Site Executes",
      description: "Essential utility for A site executes on Inferno",
      markers: [
        { x: 40, y: 25, type: "smoke", gifUrl: "/api/placeholder/640/360", description: "Arch smoke from T ramp" },
        { x: 70, y: 60, type: "molotov", gifUrl: "/api/placeholder/640/360", description: "Pit molotov from A ramp" },
        { x: 80, y: 45, type: "smoke", gifUrl: "/api/placeholder/640/360", description: "Library smoke from mid" }
      ]
    },
    // ... (add other Inferno strategies)
  ],
  Dust2: [
    {
      name: "A Site Executes",
      description: "Essential utility for A site executes on Dust2",
      markers: [
        { x: 70, y: 35, type: "smoke", gifUrl: "/api/placeholder/640/360", description: "CT smoke from long doors" },
        { x: 65, y: 40, type: "flash", gifUrl: "/api/placeholder/640/360", description: "Long corner flash" }
      ]
    },
    // ... (add other Dust2 strategies)
  ],
  Nuke: [
    {
      name: "A Site Executes",
      description: "Essential utility for A site executes on Nuke",
      markers: [
        { x: 50, y: 30, type: "smoke", gifUrl: "/api/placeholder/640/360", description: "Heaven smoke" },
        { x: 55, y: 35, type: "molotov", gifUrl: "/api/placeholder/640/360", description: "Hut molotov" }
      ]
    }
  ],
  Ancient: [
    {
      name: "A Site Executes",
      description: "Essential utility for A site executes on Ancient",
      markers: [
        { x: 60, y: 40, type: "smoke", gifUrl: "/api/placeholder/640/360", description: "CT smoke" },
        { x: 65, y: 45, type: "flash", gifUrl: "/api/placeholder/640/360", description: "A site entry flash" }
      ]
    }
  ]
};

// Deep copy of original strats for reset functionality
const originalStrats = JSON.parse(JSON.stringify(strats));

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("New client connected");

  // Send initial strategies to the new client
  socket.emit("strategies", strats);

  // Handle strategy loading
  socket.on("loadStrategies", () => {
    socket.emit("strategies", strats);
  });

  // Handle strategy saving
  socket.on("saveStrategies", (newStrats) => {
    strats = newStrats;
    io.emit("strategies", strats); // Broadcast updated strategies
  });

  // Handle adding a new strategy
  socket.on("addStrategy", ({ map, strat }) => {
    if (!strats[map]) strats[map] = [];
    strats[map].push(strat);
    io.emit("addStrategy", { map, strat });
  });

  // Handle deleting a strategy
  socket.on("deleteStrategy", ({ map, index }) => {
    if (strats[map]) {
      strats[map].splice(index, 1);
      if (strats[map].length === 0) delete strats[map];
      io.emit("deleteStrategy", { map, index });
    }
  });

  // Handle adding a marker
  socket.on("addMarker", ({ map, stratName, marker }) => {
    const strat = strats[map]?.find(s => s.name === stratName);
    if (strat) {
      strat.markers.push(marker);
      io.emit("addMarker", { map, stratName, marker });
    }
  });

  // Handle updating a marker
  socket.on("updateMarker", ({ map, stratName, index, marker }) => {
    const strat = strats[map]?.find(s => s.name === stratName);
    if (strat && strat.markers[index]) {
      strat.markers[index] = marker;
      io.emit("updateMarker", { map, stratName, index, marker });
    }
  });

  // Handle removing a marker
  socket.on("removeMarker", ({ map, stratName, markerIndex }) => {
    const strat = strats[map]?.find(s => s.name === stratName);
    if (strat && strat.markers[markerIndex]) {
      strat.markers.splice(markerIndex, 1);
      io.emit("removeMarker", { map, stratName, markerIndex });
    }
  });

  // Handle resetting markers
  socket.on("resetMarkers", ({ map, stratName }) => {
    const strat = strats[map]?.find(s => s.name === stratName);
    const originalStrat = originalStrats[map]?.find(s => s.name === stratName);
    if (strat && originalStrat) {
      strat.markers = JSON.parse(JSON.stringify(originalStrat.markers));
      io.emit("resetMarkers", { map, stratName, markers: strat.markers });
    }
  });

  // Handle map change
  socket.on("changeMap", (map) => {
    io.emit("changeMap", map);
  });

  // Handle strategy selection
  socket.on("selectStrat", ({ map, index }) => {
    io.emit("selectStrat", { map, index });
  });

  // Handle dark/light mode toggle
  socket.on("toggleMode", (isDarkMode) => {
    io.emit("toggleMode", isDarkMode);
  });

  // Handle client disconnect
  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});