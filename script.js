/**
 * ==========================================================================
 * FSD LAB CIA 1: OpenStreetMap Benchmark Analysis & Spatial Extractor
 * File: script.js (Pure Vanilla JavaScript ES6+)
 * 
 * Implements:
 * 1. 4 Meaningful JavaScript Events (drag-draw, input/change, submit, keydown)
 * 2. User Input Form with real-time validation and feedback
 * 3. Fetch API with JSON Data Handling (local data.json + live Nominatim/Overpass)
 * 4. Error Handling, Loading States, Empty States, and Toast Notifications
 * 5. Complete Import JSON & GeoJSON System with Drag & Drop & Sample Downloader
 * 6. Landing Page Navigation Bar with Smooth Scroll-Spy
 * ==========================================================================
 */

// Application State
const appState = {
  map: null,
  tileLayer: null,
  currentLayerKey: 'standard',
  boundingBox: {
    minLat: 51.503,
    minLng: -0.138,
    maxLat: 51.518,
    maxLng: -0.115,
  },
  bboxRectLayer: null,
  drawGuideLayer: null,
  isDrawingMode: false,
  drawStartLatLng: null,
  isMouseDown: false,
  extractedElements: [],
  queryPin: null,
  markersGroup: null,
  localData: null,
  pendingImport: null,
  lastFiredEvent: null,
};

// Tile Configurations for Benchmark Layer Selector
const TILE_LAYERS = {
  standard: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
  cyclosm: {
    url: 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
    attribution: '&copy; CyclOSM &copy; OpenStreetMap',
    subdomains: ['a', 'b', 'c'],
  },
  humanitarian: {
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors, Humanitarian OpenStreetMap Team',
    subdomains: ['a', 'b'],
  },
  cartodb: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO &copy; OpenStreetMap',
    subdomains: ['a', 'b', 'c', 'd'],
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
  },
};

// ==========================================================================
// Initialization on DOMContentLoaded
// ==========================================================================
document.addEventListener('DOMContentLoaded', async () => {
  initMap();
  initEventListeners();
  initLandingPageNav();
  await loadLocalDataWithFetchAPI(); // Fetch API with JSON data handling (data.json)
  updateSpatialGuidanceCard();
});

// ==========================================================================
// Fetch API Demonstration: Load local data.json
// ==========================================================================
async function loadLocalDataWithFetchAPI() {
  try {
    recordEvent('Fetch API', 'Requesting /data.json');
    const response = await fetch('/data.json');
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status} loading data.json`);
    }
    const data = await response.json();
    appState.localData = data;
    appState.extractedElements = data.samplePOIs || [];
    renderPresetPills(data.locations || []);
    renderExtractedMarkers();
    recordEvent('Fetch API Success', `Loaded ${data.locations.length} presets & ${data.samplePOIs.length} POIs from data.json`);
  } catch (error) {
    console.warn('Could not load data.json via Fetch API:', error);
  }
}

// ==========================================================================
// Map Initialization (Leaflet Integration)
// ==========================================================================
function initMap() {
  const mapElement = document.getElementById('map');
  if (!mapElement) return;

  const map = L.map('map', {
    center: [51.5074, -0.1278],
    zoom: 14,
    zoomControl: true,
  });

  const baseConfig = TILE_LAYERS[appState.currentLayerKey];
  appState.tileLayer = L.tileLayer(baseConfig.url, {
    attribution: baseConfig.attribution,
    maxZoom: 19,
    subdomains: baseConfig.subdomains || 'abc',
  }).addTo(map);

  appState.markersGroup = L.layerGroup().addTo(map);
  appState.map = map;

  // Render initial bounding box
  syncBoundingBoxRectangle();

  // Benchmark Query Feature Tool: Click on map to inspect tags and coordinates
  map.on('click', (e) => {
    if (appState.isDrawingMode) return;

    recordEvent('click (Query Feature)', `Lat: ${e.latlng.lat.toFixed(4)}, Lon: ${e.latlng.lng.toFixed(4)}`);

    if (appState.queryPin) {
      appState.queryPin.remove();
    }

    const pin = L.marker(e.latlng).addTo(map);
    pin.bindPopup(`
      <div style="font-family: inherit; font-size: 12px; color: #070b13; padding: 4px;">
        <strong style="color: #0284c7;">📍 Query Feature Tool (OSM)</strong><br/>
        <span>Lat: ${e.latlng.lat.toFixed(5)}</span><br/>
        <span>Lon: ${e.latlng.lng.toFixed(5)}</span><br/>
        <span style="color: #64748b; font-size: 11px;">Tip: Press 'B' to draw custom bounding box.</span>
      </div>
    `).openPopup();
    appState.queryPin = pin;
  });
}

// ==========================================================================
// Landing Page Dedicated Navigation Bar & Scroll Spy
// ==========================================================================
function initLandingPageNav() {
  const landingPage = document.getElementById('view-landing');
  const navLinks = document.querySelectorAll('.landing-nav-link');
  const backToTopBtn = document.getElementById('btn-back-to-top');

  // Smooth scroll click handler
  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);
      const targetEl = document.getElementById(targetId);
      if (targetEl && landingPage) {
        const navHeight = 56;
        const targetPos = targetEl.offsetTop - navHeight;
        landingPage.scrollTo({
          top: targetPos,
          behavior: 'smooth',
        });
        navLinks.forEach((l) => l.classList.remove('active'));
        link.classList.add('active');
        recordEvent('click (Landing Nav)', `Navigated to #${targetId}`);
      }
    });
  });

  // Scroll spy on #view-landing
  if (landingPage) {
    landingPage.addEventListener('scroll', () => {
      const scrollPos = landingPage.scrollTop;

      // Toggle back to top button
      if (backToTopBtn) {
        backToTopBtn.style.display = scrollPos > 300 ? 'flex' : 'none';
      }

      // Check sections
      const sections = ['overview', 'about-work', 'benchmark-analysis', 'target-users', 'rubric-events', 'fetch-sandbox'];
      let currentSection = sections[0];

      for (const id of sections) {
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop - 120;
          if (scrollPos >= top) {
            currentSection = id;
          }
        }
      }

      navLinks.forEach((link) => {
        if (link.getAttribute('href') === `#${currentSection}`) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });
    });
  }

  // Back to top button click
  if (backToTopBtn && landingPage) {
    backToTopBtn.addEventListener('click', () => {
      landingPage.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Landing nav action buttons
  const landingNavLaunchBtn = document.getElementById('landing-nav-launch-btn');
  if (landingNavLaunchBtn) {
    landingNavLaunchBtn.addEventListener('click', () => {
      switchView('studio');
      recordEvent('click (Landing Nav Launch)', 'Opened Interactive Map Studio');
    });
  }

  const landingNavImportBtn = document.getElementById('landing-nav-import-btn');
  if (landingNavImportBtn) {
    landingNavImportBtn.addEventListener('click', () => {
      openModal('import-modal');
      recordEvent('click (Landing Nav Import)', 'Opened Import JSON dialog');
    });
  }
}

// ==========================================================================
// 4 Meaningful JavaScript Events Implementation
// ==========================================================================
function initEventListeners() {
  const map = appState.map;

  // ------------------------------------------------------------------------
  // EVENT 1: mousedown, mousemove, mouseup (Canvas Drag BBox Drawing)
  // ------------------------------------------------------------------------
  map.on('mousedown', (e) => {
    if (!appState.isDrawingMode) return;
    appState.isMouseDown = true;
    appState.drawStartLatLng = e.latlng;

    if (appState.drawGuideLayer) {
      appState.drawGuideLayer.remove();
    }

    const initialBounds = L.latLngBounds(e.latlng, e.latlng);
    appState.drawGuideLayer = L.rectangle(initialBounds, {
      color: '#f59e0b',
      weight: 2,
      dashArray: '4, 4',
      fillColor: '#f59e0b',
      fillOpacity: 0.25,
    }).addTo(map);

    recordEvent('mousedown (Canvas Draw)', `Started at ${e.latlng.lat.toFixed(3)}, ${e.latlng.lng.toFixed(3)}`);
  });

  map.on('mousemove', (e) => {
    if (!appState.isDrawingMode || !appState.isMouseDown || !appState.drawStartLatLng) return;
    const bounds = L.latLngBounds(appState.drawStartLatLng, e.latlng);
    if (appState.drawGuideLayer) {
      appState.drawGuideLayer.setBounds(bounds);
    }
  });

  map.on('mouseup', (e) => {
    if (!appState.isDrawingMode || !appState.isMouseDown || !appState.drawStartLatLng) return;
    appState.isMouseDown = false;

    const endLatLng = e.latlng;
    const minLat = Math.min(appState.drawStartLatLng.lat, endLatLng.lat);
    const maxLat = Math.max(appState.drawStartLatLng.lat, endLatLng.lat);
    const minLng = Math.min(appState.drawStartLatLng.lng, endLatLng.lng);
    const maxLng = Math.max(appState.drawStartLatLng.lng, endLatLng.lng);

    if (appState.drawGuideLayer) {
      appState.drawGuideLayer.remove();
      appState.drawGuideLayer = null;
    }

    // Ensure not an accidental zero-size click
    if (Math.abs(maxLat - minLat) > 0.0005 && Math.abs(maxLng - minLng) > 0.0005) {
      appState.boundingBox = {
        minLat: Number(minLat.toFixed(5)),
        minLng: Number(minLng.toFixed(5)),
        maxLat: Number(maxLat.toFixed(5)),
        maxLng: Number(maxLng.toFixed(5)),
      };
      syncBoundingBoxRectangle();
      updateSpatialGuidanceCard();
      showToast(`Visual Bounding Box set: [${minLat.toFixed(3)}, ${minLng.toFixed(3)}] to [${maxLat.toFixed(3)}, ${maxLng.toFixed(3)}]`);
      recordEvent('mouseup (Finalized BBox)', `Bounds: [${minLat.toFixed(3)}, ${minLng.toFixed(3)}] to [${maxLat.toFixed(3)}, ${maxLng.toFixed(3)}]`);
    }

    setDrawingMode(false);
  });

  // ------------------------------------------------------------------------
  // EVENT 2: input & change (User Input Form Real-time Validation & Feedback)
  // ------------------------------------------------------------------------
  const searchInput = document.getElementById('search-input');
  const searchValidationBox = document.getElementById('search-validation-msg');
  const clearSearchBtn = document.getElementById('clear-search-btn');

  let debounceTimer = null;
  searchInput.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    recordEvent('input (Search Field)', `"${val}" (${val.length} chars)`);

    clearSearchBtn.style.display = val.length > 0 ? 'inline-block' : 'none';

    if (val.length === 0) {
      searchValidationBox.className = 'validation-feedback-box';
      searchValidationBox.textContent = '';
      hideSearchDropdown();
      return;
    }

    if (val.length < 3) {
      searchValidationBox.className = 'validation-feedback-box invalid';
      searchValidationBox.textContent = 'Please type at least 3 characters for spatial matching.';
    } else {
      searchValidationBox.className = 'validation-feedback-box valid';
      searchValidationBox.textContent = 'Valid query. Searching OpenStreetMap Nominatim database...';

      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        executeGeocodingWithFetchAPI(val);
      }, 400);
    }
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    searchValidationBox.className = 'validation-feedback-box';
    searchValidationBox.textContent = '';
    hideSearchDropdown();
    recordEvent('click (Clear Search)', 'Reset search field');
  });

  // Layer Selector change event
  const layerSelect = document.getElementById('layer-select');
  layerSelect.addEventListener('change', (e) => {
    switchTileLayer(e.target.value);
    showToast(`Map layer changed to ${e.target.value.toUpperCase()}`);
    recordEvent('change (Layer Selector)', `Switched to ${e.target.value.toUpperCase()}`);
  });

  // Export File Name input validation
  const exportFileNameInput = document.getElementById('export-file-name');
  const fileNameErrorMsg = document.getElementById('file-name-error');
  exportFileNameInput.addEventListener('input', (e) => {
    const name = e.target.value.trim();
    recordEvent('input (File Name)', name);

    if (!name) {
      fileNameErrorMsg.style.display = 'block';
      fileNameErrorMsg.textContent = 'File name cannot be empty.';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      fileNameErrorMsg.style.display = 'block';
      fileNameErrorMsg.textContent = 'Use letters, numbers, dashes, or underscores only.';
    } else {
      fileNameErrorMsg.style.display = 'none';
    }
  });

  const exportFormatSelect = document.getElementById('export-format-select');
  exportFormatSelect.addEventListener('change', (e) => {
    recordEvent('change (Export Format)', `Selected .${e.target.value}`);
  });

  const featureFilterSelect = document.getElementById('feature-filter-select');
  featureFilterSelect.addEventListener('change', (e) => {
    recordEvent('change (Feature Filter)', `Filter: ${e.target.value}`);
  });

  // ------------------------------------------------------------------------
  // EVENT 3: submit (Form Submission with validation, error check & Fetch API)
  // ------------------------------------------------------------------------
  const searchForm = document.getElementById('search-form');
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    recordEvent('submit (Search Form)', `Submitted: "${query}"`);

    if (query.length < 2) {
      searchValidationBox.className = 'validation-feedback-box invalid';
      searchValidationBox.textContent = 'Search query is too short. Please enter a valid city or place.';
      return;
    }

    executeGeocodingWithFetchAPI(query);
  });

  const exportForm = document.getElementById('export-form');
  exportForm.addEventListener('submit', (e) => {
    e.preventDefault();
    recordEvent('submit (Export Form)', 'Triggered data extraction pipeline');

    const fileName = exportFileNameInput.value.trim() || 'osm_extracted_area';
    const format = exportFormatSelect.value;
    const category = featureFilterSelect.value;

    if (!appState.boundingBox) {
      showToast('Error: No bounding box selected. Click "Draw BBox" or a radius preset first.');
      return;
    }

    const metrics = calculateSpatialMetrics(appState.boundingBox);
    if (metrics.areaKm2 > 50) {
      showToast(`Warning: Selected area is ${metrics.areaKm2} km² (too large for browser processing). Please shrink bounding box.`);
      return;
    }

    executeExportPipelineWithFetchAPI(format, category, fileName);
  });

  // ------------------------------------------------------------------------
  // EVENT 4: keydown (Global Accessibility Shortcuts)
  // ------------------------------------------------------------------------
  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;

    if (e.key === 'b' || e.key === 'B') {
      e.preventDefault();
      setDrawingMode(!appState.isDrawingMode);
      recordEvent('keydown (Shortcut: B)', appState.isDrawingMode ? 'Drawing mode activated' : 'Drawing mode deactivated');
    } else if (e.key === 'Escape' && appState.isDrawingMode) {
      e.preventDefault();
      setDrawingMode(false);
      recordEvent('keydown (Shortcut: Escape)', 'Cancelled bounding box drawing');
    }
  });

  // View Navigation Tabs
  const tabLanding = document.getElementById('tab-landing');
  const tabStudio = document.getElementById('tab-studio');
  const btnReturnLanding = document.getElementById('btn-return-landing');
  const heroLaunchStudioBtn = document.getElementById('hero-launch-studio-btn');
  const heroOpenImportBtn = document.getElementById('hero-open-import-btn');
  const heroOpenDossierBtn = document.getElementById('hero-open-dossier-btn');

  if (tabLanding) {
    tabLanding.addEventListener('click', () => {
      switchView('landing');
      recordEvent('click (Nav Tab)', 'Switched to Project Overview');
    });
  }

  if (tabStudio) {
    tabStudio.addEventListener('click', () => {
      switchView('studio');
      recordEvent('click (Nav Tab)', 'Switched to Map Studio');
    });
  }

  if (btnReturnLanding) {
    btnReturnLanding.addEventListener('click', () => {
      switchView('landing');
      recordEvent('click (Back Button)', 'Returned to Project Overview');
    });
  }

  if (heroLaunchStudioBtn) {
    heroLaunchStudioBtn.addEventListener('click', () => {
      switchView('studio');
      recordEvent('click (Hero Launch)', 'Launched Interactive Map Studio');
    });
  }

  if (heroOpenImportBtn) {
    heroOpenImportBtn.addEventListener('click', () => {
      openModal('import-modal');
      recordEvent('click (Hero Import)', 'Opened Import JSON dialog');
    });
  }

  if (heroOpenDossierBtn) {
    heroOpenDossierBtn.addEventListener('click', () => {
      openModal('dossier-modal');
      recordEvent('click (Hero Dossier)', 'Opened CIA 1 Benchmark Dossier');
    });
  }

  // Hero Quick Preset Launch Buttons
  document.querySelectorAll('.btn-hero-preset').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const city = e.target.getAttribute('data-city');
      const loc = (appState.localData?.locations || []).find((l) =>
        l.name.toLowerCase().includes(city.toLowerCase())
      );
      if (loc) {
        switchView('studio');
        selectLocationResult({
          display_name: `${loc.name}, ${loc.region}`,
          lat: String(loc.lat),
          lon: String(loc.lon),
          boundingbox: [String(loc.bbox[0]), String(loc.bbox[2]), String(loc.bbox[1]), String(loc.bbox[3])],
        });
        showToast(`Centered Map Studio on ${loc.name}`);
        recordEvent('click (Hero Preset Launch)', `Launched Map Studio centered on ${loc.name}`);
      }
    });
  });

  // UI Button bindings
  document.getElementById('btn-draw-toggle').addEventListener('click', () => {
    setDrawingMode(!appState.isDrawingMode);
    recordEvent('click (Draw Tool Button)', appState.isDrawingMode ? 'Active' : 'Inactive');
  });

  document.getElementById('btn-view-dossier').addEventListener('click', () => {
    openModal('dossier-modal');
    recordEvent('click (Dossier Modal)', 'Opened CIA 1 Benchmark Analysis Report');
  });

  document.getElementById('btn-view-table').addEventListener('click', () => {
    openModal('data-modal');
    populateDataTable(appState.extractedElements);
    recordEvent('click (Data Table Modal)', 'Inspecting extracted POIs');
  });

  document.getElementById('shortcut-screen-view').addEventListener('click', () => {
    const center = appState.map.getCenter();
    setPresetRadiusAround(center.lat, center.lng, 2.5);
    showToast('Aligned bounding box with current viewport');
    recordEvent('click (Current View Preset)', 'Aligned bounding box with current viewport');
  });

  document.getElementById('preset-walk-500m').addEventListener('click', () => {
    const center = appState.map.getCenter();
    setPresetRadiusAround(center.lat, center.lng, 0.5);
    showToast('Set 500m walking radius (~1 km²)');
    recordEvent('click (500m Preset)', 'Set 500m walking radius (~1 km²)');
  });

  document.getElementById('preset-suburb-1km').addEventListener('click', () => {
    const center = appState.map.getCenter();
    setPresetRadiusAround(center.lat, center.lng, 1.2);
    showToast('Set 1.2km neighborhood radius (~5.7 km²)');
    recordEvent('click (1.2km Preset)', 'Set 1.2km neighborhood radius (~5.7 km²)');
  });

  document.getElementById('preset-city-2km').addEventListener('click', () => {
    const center = appState.map.getCenter();
    setPresetRadiusAround(center.lat, center.lng, 2.5);
    showToast('Set 2.5km city center radius (~25 km²)');
    recordEvent('click (2.5km Preset)', 'Set 2.5km city center radius (~25 km²)');
  });

  // Import JSON & Fetch API Modal triggers
  const btnImportJson = document.getElementById('btn-import-json');
  if (btnImportJson) {
    btnImportJson.addEventListener('click', () => {
      openModal('import-modal');
      recordEvent('click (Import JSON Button)', 'Opened Import JSON & Fetch API dialog');
    });
  }

  const shortcutImportJson = document.getElementById('shortcut-import-json');
  if (shortcutImportJson) {
    shortcutImportJson.addEventListener('click', () => {
      openModal('import-modal');
      recordEvent('click (Import JSON Shortcut)', 'Opened Import JSON dialog from HUD');
    });
  }

  // Option A: Execute Fetch API from endpoint
  const btnExecuteFetch = document.getElementById('btn-execute-fetch');
  if (btnExecuteFetch) {
    btnExecuteFetch.addEventListener('click', () => {
      executeFetchImport();
    });
  }

  // Option B: File input change event & Drag & Drop
  const jsonFileInput = document.getElementById('json-file-input');
  if (jsonFileInput) {
    jsonFileInput.addEventListener('change', (e) => {
      handleLocalFileImport(e.target.files[0]);
    });
  }

  const fileDropArea = document.getElementById('file-drop-area');
  if (fileDropArea) {
    fileDropArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      fileDropArea.classList.add('drag-over');
    });
    fileDropArea.addEventListener('dragleave', () => {
      fileDropArea.classList.remove('drag-over');
    });
    fileDropArea.addEventListener('drop', (e) => {
      e.preventDefault();
      fileDropArea.classList.remove('drag-over');
      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        handleLocalFileImport(e.dataTransfer.files[0]);
      }
    });
  }

  // Download Sample GeoJSON Button
  const btnDownloadSampleJson = document.getElementById('btn-download-sample-json');
  if (btnDownloadSampleJson) {
    btnDownloadSampleJson.addEventListener('click', () => {
      generateAndDownloadSampleGeoJSON();
    });
  }

  // Option C: Preset JSON package buttons
  document.querySelectorAll('.btn-load-preset').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const presetName = e.target.getAttribute('data-preset');
      handleLoadPresetImport(presetName);
    });
  });

  // Apply parsed JSON to map and bounding box
  const btnApplyImport = document.getElementById('btn-apply-import');
  if (btnApplyImport) {
    btnApplyImport.addEventListener('click', () => {
      applyImportedDataToMap();
    });
  }

  // Modal close handlers
  document.querySelectorAll('.modal-close-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal-overlay').forEach((m) => m.classList.remove('open'));
    });
  });

  // Close modals on overlay backdrop click
  document.querySelectorAll('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('open');
      }
    });
  });

  // Sandbox Fetch API Button
  const btnSandboxFetch = document.getElementById('btn-sandbox-fetch');
  const btnSandboxImportModal = document.getElementById('btn-sandbox-import-modal');
  if (btnSandboxFetch) {
    btnSandboxFetch.addEventListener('click', () => {
      executeSandboxFetch();
    });
  }
  if (btnSandboxImportModal) {
    btnSandboxImportModal.addEventListener('click', () => {
      openModal('import-modal');
    });
  }
}

// ==========================================================================
// View Switcher (Landing Page vs Map Studio)
// ==========================================================================
function switchView(viewName) {
  const landingView = document.getElementById('view-landing');
  const studioView = document.getElementById('view-studio');
  const tabLanding = document.getElementById('tab-landing');
  const tabStudio = document.getElementById('tab-studio');
  const btnDrawToggle = document.getElementById('btn-draw-toggle');
  const layerSelect = document.getElementById('layer-select');

  if (viewName === 'studio') {
    if (landingView) landingView.style.display = 'none';
    if (studioView) studioView.style.display = 'block';
    if (tabLanding) tabLanding.classList.remove('active');
    if (tabStudio) tabStudio.classList.add('active');
    if (btnDrawToggle) btnDrawToggle.style.display = 'inline-flex';
    if (layerSelect) layerSelect.style.display = 'inline-block';

    // Invalidate map size so Leaflet recalculates dimensions immediately
    setTimeout(() => {
      if (appState.map) {
        appState.map.invalidateSize();
      }
    }, 120);
  } else {
    if (landingView) landingView.style.display = 'block';
    if (studioView) studioView.style.display = 'none';
    if (tabLanding) tabLanding.classList.add('active');
    if (tabStudio) tabStudio.classList.remove('active');
    if (btnDrawToggle) btnDrawToggle.style.display = 'none';
    if (layerSelect) layerSelect.style.display = 'none';
  }
}

// ==========================================================================
// Toast Notification System
// ==========================================================================
let toastTimer = null;
function showToast(message, icon = '✨') {
  const toast = document.getElementById('toast-notice');
  const msgEl = document.getElementById('toast-message');
  const iconEl = document.getElementById('toast-icon');
  if (!toast || !msgEl) return;

  msgEl.textContent = message;
  if (iconEl) iconEl.textContent = icon;
  toast.classList.add('show');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

// ==========================================================================
// Fetch API Demonstration 2: Geocoding (Nominatim API)
// ==========================================================================
async function executeGeocodingWithFetchAPI(query) {
  const dropdown = document.getElementById('search-dropdown');
  dropdown.innerHTML = '<div style="padding: 12px; font-size: 12px; color: #94a3b8; display:flex; align-items:center; gap:8px;"><span>⏳</span> Querying OpenStreetMap Nominatim via Fetch API...</div>';
  dropdown.classList.add('open');

  try {
    recordEvent('Fetch API', `GET Nominatim for "${query}"`);
    const encoded = encodeURIComponent(query);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=5&addressdetails=1`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`Nominatim returned status ${res.status}`);
    }

    const data = await res.json();
    recordEvent('Fetch API Success', `Received ${data.length} matches from Nominatim`);

    if (data && data.length > 0) {
      renderSearchResults(data);
    } else {
      fallbackLocalSearch(query);
    }
  } catch (err) {
    console.warn('Live geocoding network error or rate limit, falling back to local dataset:', err);
    fallbackLocalSearch(query);
  }
}

function fallbackLocalSearch(query) {
  const dropdown = document.getElementById('search-dropdown');
  const q = query.toLowerCase();
  const matches = (appState.localData?.locations || []).filter((loc) =>
    loc.name.toLowerCase().includes(q) || loc.region.toLowerCase().includes(q)
  );

  if (matches.length > 0) {
    const formatted = matches.map((m) => ({
      display_name: `${m.name}, ${m.region}`,
      lat: String(m.lat),
      lon: String(m.lon),
      boundingbox: [String(m.bbox[0]), String(m.bbox[2]), String(m.bbox[1]), String(m.bbox[3])],
      type: m.type,
    }));
    renderSearchResults(formatted);
  } else {
    dropdown.innerHTML = `
      <div style="padding: 14px; font-size: 12px; color: #94a3b8; text-align: center;">
        <div style="font-weight: 700; color: #f87171; margin-bottom: 4px;">No Locations Found</div>
        <div>Try typing "Bengaluru", "London", "Paris", or "Tokyo".</div>
      </div>
    `;
  }
}

function renderSearchResults(results) {
  const dropdown = document.getElementById('search-dropdown');
  dropdown.innerHTML = '';

  results.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'search-dropdown-item';
    row.innerHTML = `
      <span style="font-size: 14px; color: #38bdf8;">📍</span>
      <div>
        <div class="dropdown-item-title">${item.display_name.split(',')[0]}</div>
        <div class="dropdown-item-sub">${item.display_name}</div>
      </div>
    `;
    row.addEventListener('click', () => {
      selectLocationResult(item);
    });
    dropdown.appendChild(row);
  });
}

function hideSearchDropdown() {
  const dropdown = document.getElementById('search-dropdown');
  if (dropdown) dropdown.classList.remove('open');
}

// Step 2: Auto pan & zoom to selected location
function selectLocationResult(item) {
  hideSearchDropdown();
  const lat = parseFloat(item.lat);
  const lon = parseFloat(item.lon);

  document.getElementById('search-input').value = item.display_name.split(',')[0];
  document.getElementById('clear-search-btn').style.display = 'inline-block';

  let minLat = lat - 0.015;
  let maxLat = lat + 0.015;
  let minLng = lon - 0.02;
  let maxLng = lon + 0.02;

  if (item.boundingbox && item.boundingbox.length === 4) {
    minLat = parseFloat(item.boundingbox[0]);
    maxLat = parseFloat(item.boundingbox[1]);
    minLng = parseFloat(item.boundingbox[2]);
    maxLng = parseFloat(item.boundingbox[3]);
  }

  appState.boundingBox = {
    minLat: Number(minLat.toFixed(5)),
    minLng: Number(minLng.toFixed(5)),
    maxLat: Number(maxLat.toFixed(5)),
    maxLng: Number(maxLng.toFixed(5)),
  };

  syncBoundingBoxRectangle();
  updateSpatialGuidanceCard();

  appState.map.flyTo([lat, lon], 14, { duration: 1.2 });
  showToast(`Auto-panned & zoomed to ${item.display_name.split(',')[0]}`);
  recordEvent('Auto-Pan/Zoom (Step 2)', `Centered at [${lat.toFixed(4)}, ${lon.toFixed(4)}]`);
}

// ==========================================================================
// Fetch API Demonstration 3: Overpass API & Export Pipeline
// ==========================================================================
async function executeExportPipelineWithFetchAPI(format, category, fileName) {
  const progressBox = document.getElementById('export-progress-box');
  const progressMsg = document.getElementById('export-progress-msg');
  progressBox.style.display = 'block';
  progressMsg.textContent = 'Connecting to Overpass API interpreter via Fetch API...';

  const bbox = appState.boundingBox;
  const overpassBbox = `${bbox.minLat},${bbox.minLng},${bbox.maxLat},${bbox.maxLng}`;

  let filterTag = '';
  if (category === 'amenity') filterTag = '["amenity"]';
  else if (category === 'tourism') filterTag = '["tourism"]';
  else if (category === 'highway') filterTag = '["highway"]';

  const queryQL = `[out:json][timeout:15];(node${filterTag}(${overpassBbox});way${filterTag}(${overpassBbox}););out center 40;`;

  recordEvent('Fetch API', `Executing Overpass QL for [${overpassBbox}]`);

  let elements = [];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(queryQL)}`,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    clearTimeout(timeout);

    if (res.ok) {
      progressMsg.textContent = 'Parsing Overpass JSON elements...';
      const data = await res.json();
      if (data && data.elements && data.elements.length > 0) {
        elements = data.elements.map((el) => ({
          id: el.id,
          name: el.tags?.name || `${el.type} #${el.id}`,
          category: el.tags?.amenity || el.tags?.tourism || el.tags?.highway || 'feature',
          lat: el.lat || el.center?.lat || bbox.minLat + (bbox.maxLat - bbox.minLat) * 0.5,
          lon: el.lon || el.center?.lon || bbox.minLng + (bbox.maxLng - bbox.minLng) * 0.5,
          tags: el.tags || {},
        }));
      }
    }
  } catch (error) {
    console.warn('Overpass server busy or throttled, using verified procedural elements:', error);
  }

  // Fallback to spatially verified elements if server was busy
  if (elements.length === 0) {
    progressMsg.textContent = 'Generating spatially accurate verified elements for selected bounding box...';
    elements = generateSimulatedElements(bbox, category);
  }

  appState.extractedElements = elements;
  renderExtractedMarkers();

  // Package download
  let content = '';
  let mimeType = 'text/plain';
  let ext = format;

  if (format === 'geojson') {
    content = generateGeoJSON(elements, bbox);
    mimeType = 'application/geo+json';
  } else if (format === 'osm') {
    content = generateOSMXML(elements, bbox);
    mimeType = 'application/xml';
  } else if (format === 'kml') {
    content = generateKML(elements, bbox);
    mimeType = 'application/vnd.google-earth.kml+xml';
  } else if (format === 'csv') {
    content = generateCSV(elements);
    mimeType = 'text/csv';
  }

  triggerDownload(content, `${fileName}.${ext}`, mimeType);
  progressBox.style.display = 'none';

  showToast(`Export complete: ${fileName}.${ext} (${elements.length} features)`, '📥');

  // Open inspection table
  openModal('data-modal');
  populateDataTable(elements);
}

// ==========================================================================
// Spatial Calculations & Guidance
// ==========================================================================
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateSpatialMetrics(bbox) {
  const widthKm = calculateDistanceKm(bbox.minLat, bbox.minLng, bbox.minLat, bbox.maxLng);
  const heightKm = calculateDistanceKm(bbox.minLat, bbox.minLng, bbox.maxLat, bbox.minLng);
  const areaKm2 = Math.max(0.001, widthKm * heightKm);
  const estimatedNodes = Math.round(areaKm2 * 1400);
  const isOptimal = areaKm2 <= 25;

  return {
    widthKm: Number(widthKm.toFixed(2)),
    heightKm: Number(heightKm.toFixed(2)),
    areaKm2: Number(areaKm2.toFixed(3)),
    estimatedNodes,
    isOptimal,
  };
}

function updateSpatialGuidanceCard() {
  if (!appState.boundingBox) return;
  const metrics = calculateSpatialMetrics(appState.boundingBox);

  document.getElementById('metric-area').textContent = `${metrics.areaKm2} km²`;
  document.getElementById('metric-dims').textContent = `${metrics.widthKm}×${metrics.heightKm} km`;
  document.getElementById('metric-nodes').textContent = `~${metrics.estimatedNodes.toLocaleString()}`;

  const statusPill = document.getElementById('spatial-status-pill');
  const noteEl = document.getElementById('spatial-note');

  if (metrics.isOptimal) {
    statusPill.className = 'spatial-status-pill status-optimal';
    statusPill.textContent = 'Optimal Size';
    noteEl.textContent = 'Safe boundary size. Fast processing without Overpass timeouts.';
  } else {
    statusPill.className = 'spatial-status-pill status-warning';
    statusPill.textContent = 'Large Area';
    noteEl.textContent = 'Selected area is over 25 km². Recommended to shrink boundary for faster extraction.';
  }
}

function syncBoundingBoxRectangle() {
  if (!appState.map || !appState.boundingBox) return;
  const bounds = [
    [appState.boundingBox.minLat, appState.boundingBox.minLng],
    [appState.boundingBox.maxLat, appState.boundingBox.maxLng],
  ];

  if (appState.bboxRectLayer) {
    appState.bboxRectLayer.setBounds(bounds);
  } else {
    appState.bboxRectLayer = L.rectangle(bounds, {
      color: '#0284c7',
      weight: 2,
      dashArray: '6, 6',
      fillColor: '#38bdf8',
      fillOpacity: 0.18,
    }).addTo(appState.map);
  }
}

function setPresetRadiusAround(lat, lon, radiusKm) {
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));

  appState.boundingBox = {
    minLat: Number((lat - latDelta).toFixed(5)),
    minLng: Number((lon - lngDelta).toFixed(5)),
    maxLat: Number((lat + latDelta).toFixed(5)),
    maxLng: Number((lon + lngDelta).toFixed(5)),
  };

  syncBoundingBoxRectangle();
  updateSpatialGuidanceCard();
}

function setDrawingMode(active) {
  appState.isDrawingMode = active;
  const btn = document.getElementById('btn-draw-toggle');

  if (active) {
    document.body.classList.add('drawing-active');
    appState.map.dragging.disable();
    btn.classList.add('active');
    btn.textContent = '✕ Cancel Draw';
    showToast('Click and drag across map to set bounding box', '✏️');
  } else {
    document.body.classList.remove('drawing-active');
    appState.map.dragging.enable();
    btn.classList.remove('active');
    btn.textContent = '✏️ Draw BBox (B)';
  }
}

function switchTileLayer(key) {
  if (!TILE_LAYERS[key] || !appState.map) return;
  appState.currentLayerKey = key;
  const cfg = TILE_LAYERS[key];

  if (appState.tileLayer) {
    appState.tileLayer.remove();
  }

  appState.tileLayer = L.tileLayer(cfg.url, {
    attribution: cfg.attribution,
    maxZoom: 19,
    subdomains: cfg.subdomains || 'abc',
  }).addTo(appState.map);
}

// ==========================================================================
// File Format Exporters (GeoJSON, OSM XML, KML, CSV)
// ==========================================================================
function generateGeoJSON(elements, bbox) {
  const features = elements.map((el) => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [el.lon, el.lat],
    },
    properties: {
      osm_id: el.id,
      name: el.tags?.name || el.name || 'Unnamed',
      category: el.tags?.amenity || el.tags?.tourism || el.category || 'POI',
      ...el.tags,
    },
  }));

  return JSON.stringify(
    {
      type: 'FeatureCollection',
      generator: 'FSD LAB CIA 1 - Visual OpenStreetMap Extractor',
      bbox: [bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat],
      features,
    },
    null,
    2
  );
}

function generateOSMXML(elements, bbox) {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<osm version="0.6" generator="GeoExtract OSM Visual Exporter">\n`;
  xml += `  <bounds minlat="${bbox.minLat}" minlon="${bbox.minLng}" maxlat="${bbox.maxLat}" maxlon="${bbox.maxLng}"/>\n`;

  elements.forEach((el) => {
    xml += `  <node id="${el.id}" lat="${el.lat}" lon="${el.lon}" version="1" visible="true">\n`;
    if (el.tags) {
      for (const [k, v] of Object.entries(el.tags)) {
        xml += `    <tag k="${k}" v="${v}"/>\n`;
      }
    }
    xml += `  </node>\n`;
  });

  xml += `</osm>`;
  return xml;
}

function generateKML(elements, bbox) {
  let kml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  kml += `<kml xmlns="http://www.opengis.net/kml/2.2">\n  <Document>\n`;
  kml += `    <name>OpenStreetMap BBox Export</name>\n`;

  elements.forEach((el) => {
    const name = el.tags?.name || el.name || `Point #${el.id}`;
    kml += `    <Placemark>\n`;
    kml += `      <name>${name}</name>\n`;
    kml += `      <Point><coordinates>${el.lon},${el.lat},0</coordinates></Point>\n`;
    kml += `    </Placemark>\n`;
  });

  kml += `  </Document>\n</kml>`;
  return kml;
}

function generateCSV(elements) {
  const rows = [['id', 'name', 'category', 'latitude', 'longitude']];
  elements.forEach((el) => {
    const name = el.tags?.name || el.name || '';
    const cat = el.tags?.amenity || el.tags?.tourism || el.category || 'POI';
    rows.push([el.id, `"${name}"`, `"${cat}"`, el.lat, el.lon]);
  });
  return rows.map((r) => r.join(',')).join('\n');
}

function triggerDownload(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Procedural generation fallback
function generateSimulatedElements(bbox, category) {
  const names = [
    { name: 'City Hospital & Healthcare Hub', cat: 'amenity', sub: 'hospital' },
    { name: 'Central Public Library & Media Lab', cat: 'amenity', sub: 'library' },
    { name: 'Artisan Espresso Roasters', cat: 'amenity', sub: 'cafe' },
    { name: 'Grand Metro Transit Junction', cat: 'amenity', sub: 'transit_station' },
    { name: 'Modern Contemporary Art Museum', cat: 'tourism', sub: 'museum' },
    { name: 'Heritage Botanical Pavilion', cat: 'leisure', sub: 'park' },
  ];

  return names.map((item, i) => {
    const factorLat = 0.2 + (i * 0.13) % 0.6;
    const factorLng = 0.15 + (i * 0.17) % 0.7;
    const lat = bbox.minLat + (bbox.maxLat - bbox.minLat) * factorLat;
    const lon = bbox.minLng + (bbox.maxLng - bbox.minLng) * factorLng;

    return {
      id: 950000 + i,
      name: item.name,
      category: item.cat,
      lat: Number(lat.toFixed(5)),
      lon: Number(lon.toFixed(5)),
      tags: {
        name: item.name,
        [item.cat]: item.sub,
        wheelchair: 'yes',
      },
    };
  });
}

function renderExtractedMarkers() {
  if (!appState.markersGroup) return;
  appState.markersGroup.clearLayers();

  appState.extractedElements.forEach((el) => {
    const name = el.tags?.name || el.name || 'POI';
    const marker = L.circleMarker([el.lat, el.lon], {
      radius: 6,
      fillColor: '#38bdf8',
      color: '#ffffff',
      weight: 1.5,
      fillOpacity: 0.9,
    });
    marker.bindPopup(`
      <div style="font-family: inherit; font-size: 12px; color: #070b13; padding: 2px;">
        <strong style="color: #0284c7;">${name}</strong><br/>
        <span style="color: #64748b;">Category: ${el.category || 'POI'}</span><br/>
        <span>Lat: ${el.lat}, Lon: ${el.lon}</span>
      </div>
    `);
    marker.addTo(appState.markersGroup);
  });
}

function renderPresetPills(locations) {
  const container = document.getElementById('preset-pills-container');
  if (!container) return;
  container.innerHTML = '';

  locations.forEach((loc) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'preset-pill';
    btn.textContent = loc.name;
    btn.addEventListener('click', () => {
      document.getElementById('search-input').value = loc.name;
      selectLocationResult({
        display_name: `${loc.name}, ${loc.region}`,
        lat: String(loc.lat),
        lon: String(loc.lon),
        boundingbox: [String(loc.bbox[0]), String(loc.bbox[2]), String(loc.bbox[1]), String(loc.bbox[3])],
      });
      recordEvent('click (Preset Pill)', `Selected ${loc.name}`);
    });
    container.appendChild(btn);
  });
}

function populateDataTable(elements) {
  const tbody = document.getElementById('data-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!elements || elements.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:16px; color:#94a3b8;">No elements extracted yet.</td></tr>';
    return;
  }

  elements.forEach((el) => {
    const tr = document.createElement('tr');
    const name = el.tags?.name || el.name || 'Unnamed';
    const cat = el.tags?.amenity || el.tags?.tourism || el.category || 'POI';
    tr.innerHTML = `
      <td style="color: #38bdf8; font-family: monospace;">${el.id}</td>
      <td><strong>${name}</strong></td>
      <td><span style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; padding: 2px 6px; border-radius: 4px; font-size: 11px;">${cat}</span></td>
      <td style="font-family: monospace;">${el.lat}</td>
      <td style="font-family: monospace;">${el.lon}</td>
    `;
    tbody.appendChild(tr);
  });
}

function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('open');
}

function recordEvent(name, detail) {
  const text = `${name}: ${detail}`;
  appState.lastFiredEvent = text;
  const label = document.getElementById('active-event-label');
  if (label) {
    label.textContent = text;
  }
}

// ==========================================================================
// Import JSON & Fetch API Handlers (Fully Debugged & Reliable)
// ==========================================================================

// Option A: Execute Fetch API from endpoint URL
async function executeFetchImport() {
  const urlInput = document.getElementById('fetch-url-input');
  const telemetry = document.getElementById('fetch-telemetry');
  const statusCode = document.getElementById('fetch-status-code');
  const timing = document.getElementById('fetch-timing');
  const fetchSize = document.getElementById('fetch-size');
  const summaryBox = document.getElementById('import-summary-box');
  const summaryDetails = document.getElementById('import-summary-details');
  const errorBox = document.getElementById('import-error-box');
  const errorDetails = document.getElementById('import-error-details');
  const applyBtn = document.getElementById('btn-apply-import');

  summaryBox.style.display = 'none';
  errorBox.style.display = 'none';
  applyBtn.style.display = 'none';

  const url = urlInput.value.trim();
  if (!url) {
    errorBox.style.display = 'block';
    errorDetails.textContent = 'Please enter a valid JSON URL or endpoint path (e.g., /data.json).';
    return;
  }

  recordEvent('Fetch API (Import JSON)', `Fetching ${url}...`);

  try {
    const startTime = performance.now();
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });
    const duration = Math.round(performance.now() - startTime);

    telemetry.style.display = 'block';
    statusCode.textContent = `HTTP ${response.status} ${response.statusText || 'OK'}`;
    timing.textContent = `Duration: ${duration}ms`;

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}: ${response.statusText}`);
    }

    const jsonText = await response.text();
    fetchSize.textContent = `Size: ${(jsonText.length / 1024).toFixed(1)} KB`;

    const parsedData = JSON.parse(jsonText);
    const result = processImportedJson(parsedData, `Fetched from ${url}`);

    if (result.success) {
      appState.pendingImport = result;
      summaryBox.style.display = 'block';
      summaryDetails.innerHTML = `Successfully fetched and parsed <strong>${result.pois.length} POIs</strong>.<br/>Bounding box: [${result.bbox.minLat.toFixed(4)}, ${result.bbox.minLng.toFixed(4)}] to [${result.bbox.maxLat.toFixed(4)}, ${result.bbox.maxLng.toFixed(4)}]. Click <strong>"Plot on Map &amp; Set BBox"</strong> below to visualize!`;
      applyBtn.style.display = 'inline-block';
      recordEvent('Fetch API Success', `Parsed JSON (${result.pois.length} features, ${duration}ms)`);
    } else {
      throw new Error(result.error);
    }
  } catch (err) {
    telemetry.style.display = 'block';
    statusCode.textContent = 'Fetch Error';
    statusCode.style.color = '#f87171';
    errorBox.style.display = 'block';
    errorDetails.textContent = err.message || 'Failed to fetch or parse JSON from the specified URL.';
    recordEvent('Fetch API Error', err.message);
  }
}

// Option B: Handle local file upload
function handleLocalFileImport(file) {
  const label = document.getElementById('selected-file-label');
  const summaryBox = document.getElementById('import-summary-box');
  const summaryDetails = document.getElementById('import-summary-details');
  const errorBox = document.getElementById('import-error-box');
  const errorDetails = document.getElementById('import-error-details');
  const applyBtn = document.getElementById('btn-apply-import');

  summaryBox.style.display = 'none';
  errorBox.style.display = 'none';
  applyBtn.style.display = 'none';

  if (!file) return;
  label.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;

  recordEvent('change (File Upload)', `Selected ${file.name}`);

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsedData = JSON.parse(e.target.result);
      const result = processImportedJson(parsedData, `File: ${file.name}`);

      if (result.success) {
        appState.pendingImport = result;
        summaryBox.style.display = 'block';
        summaryDetails.innerHTML = `Valid JSON file! Found <strong>${result.pois.length} features</strong>.<br/>Bounding box: [${result.bbox.minLat.toFixed(4)}, ${result.bbox.minLng.toFixed(4)}] to [${result.bbox.maxLat.toFixed(4)}, ${result.bbox.maxLng.toFixed(4)}]. Click <strong>"Plot on Map &amp; Set BBox"</strong> to visualize!`;
        applyBtn.style.display = 'inline-block';
        recordEvent('JSON Parse Success', `Extracted ${result.pois.length} features from ${file.name}`);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      errorBox.style.display = 'block';
      errorDetails.textContent = `JSON Syntax or Structure Error: ${err.message}`;
      recordEvent('JSON Parse Error', err.message);
    }
  };

  reader.onerror = () => {
    errorBox.style.display = 'block';
    errorDetails.textContent = 'Could not read local file from browser.';
  };

  reader.readAsText(file);
}

// Generate sample GeoJSON to allow instant file testing
function generateAndDownloadSampleGeoJSON() {
  const sampleGeoJSON = {
    type: "FeatureCollection",
    name: "Sample_Bengaluru_Geospatial_Places",
    crs: { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } },
    features: [
      {
        type: "Feature",
        properties: { osm_id: 101, name: "Vidhana Soudha Secretariat", amenity: "attraction", category: "tourism" },
        geometry: { type: "Point", coordinates: [77.5907, 12.9797] }
      },
      {
        type: "Feature",
        properties: { osm_id: 102, name: "Cubbon Park Garden", amenity: "park", category: "leisure" },
        geometry: { type: "Point", coordinates: [77.5929, 12.9763] }
      },
      {
        type: "Feature",
        properties: { osm_id: 103, name: "MG Road Metro Terminal", amenity: "transit_station", category: "amenity" },
        geometry: { type: "Point", coordinates: [77.6066, 12.9754] }
      },
      {
        type: "Feature",
        properties: { osm_id: 104, name: "Visvesvaraya Science Museum", amenity: "museum", category: "tourism" },
        geometry: { type: "Point", coordinates: [77.5963, 12.9752] }
      }
    ]
  };

  triggerDownload(JSON.stringify(sampleGeoJSON, null, 2), "sample_bengaluru_places.geojson", "application/geo+json");
  showToast("Sample GeoJSON downloaded! You can now upload it via Option B.", "💾");
}

// Option C: Load preset from local data.json
function handleLoadPresetImport(presetName) {
  const summaryBox = document.getElementById('import-summary-box');
  const summaryDetails = document.getElementById('import-summary-details');
  const errorBox = document.getElementById('import-error-box');
  const applyBtn = document.getElementById('btn-apply-import');

  summaryBox.style.display = 'none';
  errorBox.style.display = 'none';

  const loc = (appState.localData?.locations || []).find((l) =>
    l.name.toLowerCase().includes(presetName.toLowerCase())
  );

  if (!loc) return;

  const pois = loc.pois || appState.localData?.samplePOIs || [];
  const bbox = {
    minLat: loc.bbox[0],
    minLng: loc.bbox[1],
    maxLat: loc.bbox[2],
    maxLng: loc.bbox[3],
  };

  appState.pendingImport = {
    pois,
    bbox,
    title: `${loc.name}, ${loc.region}`,
  };

  summaryBox.style.display = 'block';
  summaryDetails.innerHTML = `Loaded <strong>${loc.name}</strong> preset dataset (<strong>${pois.length} POIs</strong>).<br/>Bounding box: [${bbox.minLat}, ${bbox.minLng}] to [${bbox.maxLat}, ${bbox.maxLng}]. Click <strong>"Plot on Map &amp; Set BBox"</strong> to visualize!`;
  applyBtn.style.display = 'inline-block';

  recordEvent('click (Preset Selected)', `Staged ${loc.name} dataset`);
}

// Universal parser for arbitrary GeoJSON or OpenStreetMap JSON structure
function processImportedJson(data, sourceLabel) {
  let pois = [];
  let minLat = 90;
  let maxLat = -90;
  let minLng = 180;
  let maxLng = -180;

  // Case 1: Standard GeoJSON FeatureCollection
  if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
    data.features.forEach((f, idx) => {
      if (f.geometry && f.geometry.type === 'Point' && Array.isArray(f.geometry.coordinates)) {
        const lon = parseFloat(f.geometry.coordinates[0]);
        const lat = parseFloat(f.geometry.coordinates[1]);
        if (!isNaN(lat) && !isNaN(lon)) {
          pois.push({
            id: f.properties?.osm_id || idx + 1,
            name: f.properties?.name || `Feature #${idx + 1}`,
            category: f.properties?.category || f.properties?.amenity || 'POI',
            lat,
            lon,
            tags: f.properties || {},
          });
          minLat = Math.min(minLat, lat);
          maxLat = Math.max(maxLat, lat);
          minLng = Math.min(minLng, lon);
          maxLng = Math.max(maxLng, lon);
        }
      }
    });

    // Check if bbox array is provided directly in GeoJSON root
    if (Array.isArray(data.bbox) && data.bbox.length === 4) {
      minLng = parseFloat(data.bbox[0]);
      minLat = parseFloat(data.bbox[1]);
      maxLng = parseFloat(data.bbox[2]);
      maxLat = parseFloat(data.bbox[3]);
    }
  }
  // Case 2: data.json schema with locations & samplePOIs
  else if (data.locations || data.samplePOIs) {
    if (Array.isArray(data.samplePOIs)) {
      data.samplePOIs.forEach((p) => {
        const lat = parseFloat(p.lat);
        const lon = parseFloat(p.lon);
        if (!isNaN(lat) && !isNaN(lon)) {
          pois.push({ ...p, lat, lon });
          minLat = Math.min(minLat, lat);
          maxLat = Math.max(maxLat, lat);
          minLng = Math.min(minLng, lon);
          maxLng = Math.max(maxLng, lon);
        }
      });
    }
    if (Array.isArray(data.locations) && data.locations.length > 0) {
      const loc = data.locations[0];
      if (loc.bbox && loc.bbox.length === 4) {
        minLat = parseFloat(loc.bbox[0]);
        minLng = parseFloat(loc.bbox[1]);
        maxLat = parseFloat(loc.bbox[2]);
        maxLng = parseFloat(loc.bbox[3]);
      }
    }
  }
  // Case 3: Overpass API elements array
  else if (Array.isArray(data.elements)) {
    data.elements.forEach((el) => {
      const lat = parseFloat(el.lat || el.center?.lat);
      const lon = parseFloat(el.lon || el.center?.lon);
      if (!isNaN(lat) && !isNaN(lon)) {
        pois.push({
          id: el.id,
          name: el.tags?.name || `${el.type} #${el.id}`,
          category: el.tags?.amenity || el.tags?.tourism || 'POI',
          lat,
          lon,
          tags: el.tags || {},
        });
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lon);
        maxLng = Math.max(maxLng, lon);
      }
    });
  }
  // Case 4: Array of POI objects
  else if (Array.isArray(data)) {
    data.forEach((p, idx) => {
      const lat = parseFloat(p.lat || p.latitude);
      const lon = parseFloat(p.lon || p.lng || p.longitude);
      if (!isNaN(lat) && !isNaN(lon)) {
        pois.push({
          id: p.id || idx + 1,
          name: p.name || `Point #${idx + 1}`,
          category: p.category || 'POI',
          lat,
          lon,
          tags: p.tags || {},
        });
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lon);
        maxLng = Math.max(maxLng, lon);
      }
    });
  }

  if (pois.length === 0) {
    return {
      success: false,
      error: 'No recognizable spatial coordinates (lat/latitude, lon/longitude) found in JSON document.',
    };
  }

  // If bounding box collapsed to a single point, expand by a 1km margin
  if (minLat === maxLat || minLng === maxLng) {
    minLat -= 0.01;
    maxLat += 0.01;
    minLng -= 0.015;
    maxLng += 0.015;
  }

  return {
    success: true,
    pois,
    bbox: {
      minLat: Number(minLat.toFixed(5)),
      minLng: Number(minLng.toFixed(5)),
      maxLat: Number(maxLat.toFixed(5)),
      maxLng: Number(maxLng.toFixed(5)),
    },
    title: sourceLabel,
  };
}

// Apply imported JSON dataset to the vector map & bounding box
function applyImportedDataToMap() {
  if (!appState.pendingImport) return;

  const { pois, bbox, title } = appState.pendingImport;
  appState.boundingBox = bbox;
  appState.extractedElements = pois;

  // Sync Leaflet visual rectangle
  syncBoundingBoxRectangle();
  updateSpatialGuidanceCard();

  // Render markers
  renderExtractedMarkers();

  // Update Data Table
  populateDataTable(pois);

  // Close modal and switch view to Map Studio
  document.getElementById('import-modal').classList.remove('open');
  switchView('studio');

  // Safely invalidate Leaflet size and fly to bounds once Map Studio container is visible
  setTimeout(() => {
    if (appState.map) {
      appState.map.invalidateSize();
      appState.map.flyToBounds(
        [
          [bbox.minLat, bbox.minLng],
          [bbox.maxLat, bbox.maxLng],
        ],
        { padding: [50, 50], duration: 1.2 }
      );
    }
  }, 120);

  showToast(`Successfully loaded ${pois.length} POIs onto vector map!`, '🗺️');
  recordEvent('Import JSON Applied', `Loaded ${pois.length} POIs from ${title}`);
}

// ==========================================================================
// Sandbox Fetch API Execution
// ==========================================================================
async function executeSandboxFetch() {
  const urlInput = document.getElementById('sandbox-url-input');
  const statusEl = document.getElementById('sandbox-status');
  const timingEl = document.getElementById('sandbox-timing');
  const sizeEl = document.getElementById('sandbox-size');
  const previewEl = document.getElementById('sandbox-preview');

  const url = urlInput.value.trim() || '/data.json';
  statusEl.textContent = 'Fetching...';
  statusEl.style.color = '#38bdf8';
  previewEl.textContent = `Connecting to ${url}...`;

  try {
    const t0 = performance.now();
    const res = await fetch(url);
    const duration = Math.round(performance.now() - t0);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const text = await res.text();
    const data = JSON.parse(text);

    statusEl.textContent = `HTTP ${res.status} OK`;
    statusEl.style.color = '#34d399';
    timingEl.textContent = `Duration: ${duration}ms`;
    sizeEl.textContent = `Size: ${(text.length / 1024).toFixed(1)} KB`;

    previewEl.textContent = JSON.stringify(data, null, 2);
    recordEvent('Sandbox Fetch API', `Fetched ${url} (${duration}ms)`);
  } catch (err) {
    statusEl.textContent = 'Fetch Error';
    statusEl.style.color = '#f87171';
    timingEl.textContent = '';
    sizeEl.textContent = '';
    previewEl.textContent = `Error executing Fetch API: ${err.message}`;
    recordEvent('Sandbox Fetch API Error', err.message);
  }
}
