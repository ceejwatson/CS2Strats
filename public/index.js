// Initialize Socket.IO
const socket = io();

// Sample grenade tutorials data structure (initially empty, populated from server)
let strats = {};
let currentMap = "Mirage";
let currentStrat = null;
let selectedMarker = null;
let addMarkerMode = false;
let selectedGrenadeType = "smoke";

// Grenade icons
const grenadeIcons = {
  smoke: "images/smoke.png",
  molotov: "images/molotov.png",
  flash: "images/flash.png",
  he: "images/he.png"
};

// Load saved strategies from server
function loadSavedStrategies() {
  socket.emit("loadStrategies");
}

// Save strategies to server
function saveStrategies() {
  socket.emit("saveStrategies", strats);
}

// Load strategies for a specific map
function loadStrats(map) {
  const list = document.getElementById("strat-buttons");
  const mapImg = document.getElementById("map-image");

  list.innerHTML = "";

  if (!strats[map]) {
    console.error("No tutorials found for map:", map);
    list.innerHTML = `<p>No tutorials available for ${map}.</p>`;
    return;
  }

  strats[map].forEach((strat, index) => {
    const stratItem = document.createElement("div");
    stratItem.classList.add("strat-item");

    const button = document.createElement("button");
    button.textContent = strat.name;
    button.onclick = () => {
      currentStrat = strat;
      displayStrat(strat);
      visualizeStrat(strat);
      highlightSelectedButton(button);
      selectedMarker = null;
      socket.emit("selectStrat", { map, index });
    };

    const deleteButton = document.createElement("button");
    deleteButton.classList.add("delete-strat");
    deleteButton.textContent = "X";
    deleteButton.onclick = () => deleteStrategy(map, index);

    stratItem.appendChild(button);
    stratItem.appendChild(deleteButton);
    list.appendChild(stratItem);

    if (index === 0) {
      button.click();
    }
  });

  mapImg.src = `maps/${map.toLowerCase()}.png`;
  mapImg.onerror = () => {
    console.warn(`Map image for ${map} not found.`);
    mapImg.src = "/api/placeholder/800/600?text=Map+Not+Available";
  };
}

// Add a new strategy
function addStrategy() {
  const nameInput = document.getElementById("new-strat-name");
  const descInput = document.getElementById("new-strat-desc");
  const name = nameInput.value.trim();
  const description = descInput.value.trim();

  if (!name) {
    alert("Please enter a strategy name.");
    return;
  }

  if (!strats[currentMap]) {
    strats[currentMap] = [];
  }

  const newStrat = {
    name,
    description: description || "No description provided",
    markers: []
  };

  strats[currentMap].push(newStrat);
  socket.emit("addStrategy", { map: currentMap, strat: newStrat });

  nameInput.value = "";
  descInput.value = "";
}

// Delete a strategy
function deleteStrategy(map, index) {
  if (confirm(`Are you sure you want to delete the strategy "${strats[map][index].name}"?`)) {
    strats[map].splice(index, 1);
    if (strats[map].length === 0) {
      delete strats[map];
    }
    socket.emit("deleteStrategy", { map, index });
    currentStrat = null;
    document.getElementById("description").innerHTML = "";
    document.getElementById("task-list").innerHTML = "";
    document.querySelector(".map-image-container").innerHTML = `<img id="map-image" src="maps/${map.toLowerCase()}.png" alt="Map Image" />`;
  }
}

// Display strategy details
function displayStrat(strat) {
  const descriptionContainer = document.getElementById("description");
  const taskListContainer = document.getElementById("task-list");

  descriptionContainer.innerHTML = `<h3>${strat.name}</h3><p>${strat.description}</p>`;

  let tableHtml = `
    <h4>Grenade Lineup List:</h4>
    <table style="width:100%; border-collapse: collapse; margin-top: 10px;">
      <tr>
        <th style="text-align:left; padding: 8px; border-bottom: 1px solid #ddd;">Type</th>
        <th style="text-align:left; padding: 8px; border-bottom: 1px solid #ddd;">Description</th>
      </tr>
  `;

  strat.markers.forEach((marker, idx) => {
    tableHtml += `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">
          <img src="${grenadeIcons[marker.type]}" alt="${marker.type}" style="width:20px; height:20px; vertical-align: middle;"> 
          ${marker.type.charAt(0).toUpperCase() + marker.type.slice(1)}
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">
          ${marker.description || "No description"}
          <button class="delete-task" onclick="removeMarker(${idx})">Delete</button>
        </td>
      </tr>
    `;
  });

  tableHtml += `</table>`;
  taskListContainer.innerHTML = tableHtml;
}

// Visualize strategy markers on the map
function visualizeStrat(strat) {
  const mapContainer = document.querySelector(".map-image-container");
  const previousMarkers = mapContainer.querySelectorAll(".marker");
  previousMarkers.forEach(marker => marker.remove());

  strat.markers.forEach((marker, index) => {
    createMarkerElement(marker, index);
  });
}

// Create a marker element
function createMarkerElement(marker, index) {
  const mapContainer = document.querySelector(".map-image-container");
  const newMarker = document.createElement("div");
  newMarker.classList.add("marker");
  newMarker.style.left = `${marker.x}%`;
  newMarker.style.top = `${marker.y}%`;
  newMarker.dataset.index = index;

  const markerImg = document.createElement("img");
  markerImg.src = grenadeIcons[marker.type];
  markerImg.alt = marker.type;
  newMarker.appendChild(markerImg);

  const tooltip = document.createElement("span");
  tooltip.classList.add("marker-tooltip");
  tooltip.textContent = marker.description || "No description";
  newMarker.appendChild(tooltip);

  newMarker.draggable = true;
  newMarker.addEventListener("dragend", (e) => {
    const rect = mapContainer.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    marker.x = Math.max(0, Math.min(100, x));
    marker.y = Math.max(0, Math.min(100, y));
    newMarker.style.left = `${marker.x}%`;
    newMarker.style.top = `${marker.y}%`;
    socket.emit("updateMarker", { map: currentMap, stratName: currentStrat.name, index, marker });
  });

  newMarker.addEventListener("click", (e) => {
    e.stopPropagation();
    openGifModal(marker);
    selectMarker(newMarker, index);
  });

  mapContainer.appendChild(newMarker);
  return newMarker;
}

// Open GIF modal
function openGifModal(marker) {
  const modal = document.getElementById("gif-modal");
  const modalGif = document.getElementById("modal-gif");
  const modalDescription = document.getElementById("modal-description");
  const spinner = document.getElementById("gif-spinner");

  modalGif.src = "";
  modalGif.classList.remove("loaded");
  spinner.style.display = "block";

  modalDescription.textContent = marker.description || "No description available";

  if (marker.gifUrl) {
    modalGif.src = marker.gifUrl;
    modalGif.alt = "Grenade Throw Demonstration";
    modalGif.onload = () => {
      modalGif.classList.add("loaded");
      spinner.style.display = "none";
    };
    modalGif.onerror = () => {
      modalGif.src = "images/no-gif.png";
      modalGif.alt = "No GIF Available";
      modalGif.classList.add("loaded");
      spinner.style.display = "none";
    };
  } else {
    modalGif.src = "images/no-gif.png";
    modalGif.alt = "No GIF Available";
    modalGif.classList.add("loaded");
    spinner.style.display = "none";
  }

  modal.style.display = "block";
}

// Close GIF modal
function closeModal() {
  const modal = document.getElementById("gif-modal");
  modal.style.display = "none";
}

// Select a marker
function selectMarker(markerElement, index) {
  const allMarkers = document.querySelectorAll(".marker");
  allMarkers.forEach(m => m.classList.remove("selected"));
  markerElement.classList.add("selected");
  selectedMarker = { element: markerElement, index: index };

  const marker = currentStrat.markers[index];
  document.getElementById("gif-url").value = marker.gifUrl || "";
  document.getElementById("grenade-description").value = marker.description || "";
  selectGrenadeType(marker.type);
}

// Select grenade type
function selectGrenadeType(type) {
  selectedGrenadeType = type;
  const grenadeTypes = document.querySelectorAll(".grenade-type");
  grenadeTypes.forEach(el => {
    el.classList.toggle("selected", el.dataset.type === type);
  });
}

// Highlight selected strategy button
function highlightSelectedButton(button) {
  const buttons = document.querySelectorAll("#strat-buttons button");
  buttons.forEach(btn => btn.classList.remove("selected"));
  button.classList.add("selected");
}

// Change map
function changeMap() {
  currentMap = document.getElementById("map-selector").value;
  document.getElementById("strat-list").querySelector("h2").textContent = `${currentMap} Grenade Tutorials`;
  socket.emit("changeMap", currentMap);
}

// Remove a marker
function removeMarker(markerIndex) {
  if (!currentStrat) return;
  if (confirm("Are you sure you want to delete this grenade marker?")) {
    currentStrat.markers.splice(markerIndex, 1);
    socket.emit("removeMarker", { map: currentMap, stratName: currentStrat.name, markerIndex });
  }
}

// Reset markers (client-side only, server handles original data)
function resetMarkers() {
  if (!currentMap || !currentStrat) return;
  if (confirm("Are you sure you want to reset all markers for this strategy?")) {
    socket.emit("resetMarkers", { map: currentMap, stratName: currentStrat.name });
  }
}

// Toggle dark/light mode
function toggleDarkLightMode() {
  document.body.classList.toggle("dark-mode");
  socket.emit("toggleMode", document.body.classList.contains("dark-mode"));
}

// Setup controls
function setupControls() {
  const grenadeTypes = document.querySelectorAll(".grenade-type");
  grenadeTypes.forEach(type => {
    type.addEventListener("click", () => {
      grenadeTypes.forEach(el => el.classList.remove("selected"));
      type.classList.add("selected");
      selectedGrenadeType = type.dataset.type;
    });
  });

  const gifUrlInput = document.getElementById("gif-url");
  gifUrlInput.addEventListener("change", () => {
    if (selectedMarker) {
      currentStrat.markers[selectedMarker.index].gifUrl = gifUrlInput.value;
      socket.emit("updateMarker", { map: currentMap, stratName: currentStrat.name, index: selectedMarker.index, marker: currentStrat.markers[selectedMarker.index] });
    }
  });

  const descriptionInput = document.getElementById("grenade-description");
  descriptionInput.addEventListener("change", () => {
    if (selectedMarker) {
      currentStrat.markers[selectedMarker.index].description = descriptionInput.value;
      socket.emit("updateMarker", { map: currentMap, stratName: currentStrat.name, index: selectedMarker.index, marker: currentStrat.markers[selectedMarker.index] });
      displayStrat(currentStrat);
      visualizeStrat(currentStrat);
    }
  });

  const addButton = document.getElementById("add-marker");
  addButton.addEventListener("click", () => {
    if (!currentStrat) {
      alert("Please select a strategy before adding a marker.");
      return;
    }
    addMarkerMode = !addMarkerMode;
    addButton.textContent = addMarkerMode ? "Cancel Add" : "Add Grenade Marker";
    addButton.style.backgroundColor = addMarkerMode ? "#FFA500" : "#4CAF50";
  });

  const deleteButton = document.getElementById("delete-marker");
  deleteButton.addEventListener("click", () => {
    if (!currentStrat) {
      alert("Please select a strategy before deleting a marker.");
      return;
    }
    if (!selectedMarker) {
      alert("Please select a marker to delete.");
      return;
    }
    removeMarker(selectedMarker.index);
  });

  const saveButton = document.getElementById("save-markers");
  saveButton.addEventListener("click", () => {
    saveStrategies();
    alert("Grenade tutorials saved successfully!");
  });

  const viewButton = document.getElementById("view-tutorial");
  viewButton.addEventListener("click", () => {
    if (!selectedMarker) {
      alert("Please select a marker to view its tutorial.");
      return;
    }
    openGifModal(currentStrat.markers[selectedMarker.index]);
  });

  const resetButton = document.getElementById("reset-markers");
  resetButton.addEventListener("click", resetMarkers);

  const addStratButton = document.getElementById("add-strat");
  addStratButton.addEventListener("click", addStrategy);

  document.getElementById("mode-toggle").addEventListener("click", toggleDarkLightMode);

  const modal = document.getElementById("gif-modal");
  const closeModalBtn = document.querySelector(".close-modal");
  closeModalBtn.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.style.display === "block") {
      closeModal();
    }
  });
}

// Handle map container click for adding markers
const mapContainer = document.querySelector(".map-image-container");
mapContainer.addEventListener("click", (e) => {
  if (!addMarkerMode || !currentStrat) return;

  const rect = mapContainer.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 100;
  const y = ((e.clientY - rect.top) / rect.height) * 100;

  const newMarker = {
    x: Math.max(0, Math.min(100, x)),
    y: Math.max(0, Math.min(100, y)),
    type: selectedGrenadeType,
    gifUrl: "",
    description: `New ${selectedGrenadeType} grenade`
  };

  currentStrat.markers.push(newMarker);
  socket.emit("addMarker", { map: currentMap, stratName: currentStrat.name, marker: newMarker });

  addMarkerMode = false;
  const addButton = document.getElementById("add-marker");
  addButton.textContent = "Add Grenade Marker";
  addButton.style.backgroundColor = "#4CAF50";
});

// Socket.IO event listeners
socket.on("strategies", (data) => {
  strats = data;
  loadStrats(currentMap);
});

socket.on("addStrategy", ({ map, strat }) => {
  if (!strats[map]) strats[map] = [];
  strats[map].push(strat);
  if (map === currentMap) loadStrats(currentMap);
});

socket.on("deleteStrategy", ({ map, index }) => {
  if (strats[map]) {
    strats[map].splice(index, 1);
    if (strats[map].length === 0) delete strats[map];
    if (map === currentMap) loadStrats(currentMap);
  }
});

socket.on("addMarker", ({ map, stratName, marker }) => {
  if (map === currentMap && currentStrat && currentStrat.name === stratName) {
    currentStrat.markers.push(marker);
    visualizeStrat(currentStrat);
    displayStrat(currentStrat);
  }
});

socket.on("updateMarker", ({ map, stratName, index, marker }) => {
  if (map === currentMap && currentStrat && currentStrat.name === stratName) {
    currentStrat.markers[index] = marker;
    visualizeStrat(currentStrat);
    displayStrat(currentStrat);
  }
});

socket.on("removeMarker", ({ map, stratName, markerIndex }) => {
  if (map === currentMap && currentStrat && currentStrat.name === stratName) {
    currentStrat.markers.splice(markerIndex, 1);
    visualizeStrat(currentStrat);
    displayStrat(currentStrat);
    selectedMarker = null;
  }
});

socket.on("resetMarkers", ({ map, stratName, markers }) => {
  if (map === currentMap && currentStrat && currentStrat.name === stratName) {
    currentStrat.markers = markers;
    visualizeStrat(currentStrat);
    displayStrat(currentStrat);
  }
});

socket.on("changeMap", (map) => {
  currentMap = map;
  document.getElementById("map-selector").value = map;
  document.getElementById("strat-list").querySelector("h2").textContent = `${currentMap} Grenade Tutorials`;
  loadStrats(currentMap);
});

socket.on("selectStrat", ({ map, index }) => {
  if (map === currentMap && strats[map] && strats[map][index]) {
    currentStrat = strats[map][index];
    displayStrat(currentStrat);
    visualizeStrat(currentStrat);
    const button = document.querySelector(`#strat-buttons .strat-item:nth-child(${index + 1}) button`);
    if (button) highlightSelectedButton(button);
  }
});

socket.on("toggleMode", (isDarkMode) => {
  document.body.classList.toggle("dark-mode", isDarkMode);
});

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("smoke-icon").src = grenadeIcons.smoke;
  document.getElementById("molotov-icon").src = grenadeIcons.molotov;
  document.getElementById("flash-icon").src = grenadeIcons.flash;
  document.getElementById("he-icon").src = grenadeIcons.he;
  loadSavedStrategies();
  setupControls();
  loadStrats(currentMap);
});
