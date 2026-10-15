# FSD LAB CIA 1: OpenStreetMap Benchmark Analysis & Spatial Extractor

## 1. Project Overview & Student Work
This project is an academic submission for the **Full-Stack Web Development (FSD) Lab Continuous Internal Assessment 1 (CIA 1)**. It delivers an empirical benchmark usability analysis of **OpenStreetMap (OSM)** and an improved, redesigned web application built strictly with **pure HTML5, CSS3, and modern Vanilla JavaScript (ES6+)**.

Instead of requiring users to manually input raw, 4-corner geographical coordinates (minimum latitude, minimum longitude, maximum latitude, maximum longitude), this application provides an **interactive canvas drag-and-draw bounding box selector**, **dynamic spatial guidance telemetry** (area in km², physical dimensions, estimated node counts, and Overpass API safety checks), an **asynchronous Fetch API pipeline with JSON handling**, and **one-click multi-format export** (`GeoJSON`, `OSM XML`, `KML`, `CSV`).

---

## 2. Dedicated Landing Page & In-Page Navigation Bar
The web application features a polished **Dark Mode landing page** showcasing the complete student project dossier, with a **dedicated sticky in-page navigation bar**:
* **📌 Overview**: Project title, problem brief, and quick action launch buttons.
* **👨‍💻 About My Work**: Detailed academic dossier highlighting core innovations, architecture, and rubric alignment.
* **⚖️ Benchmark Analysis**: Side-by-side contrast between existing OpenStreetMap flaws and the redesigned solution.
* **👥 Target Users**: Personas for everyday mobile users, travelers, and local guides.
* **🛠️ 4 JS Events**: Detailed documentation of the 4 required JavaScript event types.
* **🌐 Fetch API & JSON**: Live interactive sandbox demonstrating asynchronous JSON fetching, latency measurement, and payload telemetry.
* **📥 Import JSON**: Quick trigger to launch the JSON & GeoJSON import explorer.
* **🚀 Launch Map Studio**: Instant transition to the interactive Leaflet mapping workspace.

---

## 3. Target User Personas
1. **Everyday Mobile & Smartphone Users**:
   - Touch-first users who need quick local maps and geographic selections without understanding geographic coordinate systems, EPSG projections, or decimal degree math.
2. **Travelers & Tourists**:
   - Users who want to download offline POIs (points of interest), attractions, transit stations, and walking corridors before traveling.
3. **Local Guides & GIS Beginners**:
   - Community mappers who wish to extract neighborhood civic amenities, health centers, and venues without complex GIS scripting or QGIS terminal commands.

---

## 4. Selected Workflow: Searching & Extracting Map Data
* **Step 1 (Input Target Location)**: Users type a destination, city, or landmark into the global search bar with instant validation and autocomplete suggestions.
* **Step 2 (Choose Entry & Auto Pan/Zoom)**: Clicking any result triggers smooth animated auto-panning and viewport zooming to the target boundary.
* **Step 3 (Visual Bounding Box Selection & Export)**: Users click and drag directly on the map (or choose preset radii such as 500m, 1.2km, or Current View) and export the spatial data in their desired format with one click.

---

## 5. Benchmark Features Documented
* **Global Search**: Reverse and forward geocoding with OpenStreetMap Nominatim.
* **Layer Selector**: Real-time switching between Standard OSM, CyclOSM (cycling paths), Humanitarian (HOT), CartoDB Dark, and Esri Satellite.
* **Query Feature Tool**: Clicking on any map point drops a query pin and inspects OSM geographic coordinates and attributes.
* **Data Download & Export**: Extracting bounding box data with real-time format packaging.

---

## 6. Problem Statement & Impact Analysis
* **Unmet Need / Problem**: Non-technical users struggle to create custom bounding boxes using numeric coordinates and become confused by raw data download formats due to the lack of visual guidance and spatial feedback.
* **Consequence**: Users either abandon the extraction workflow or input erroneous coordinate ranges, generating malformed or oversized datasets.
* **Statement of Problem**: *How do we enable non-technical users to simply select custom bounding boxes visually and export location data without requiring geographic coordinates system knowledge?*

---

## 7. Proposed Improved Web Experience
1. **Interactive Canvas Overlay**: Click & drag directly on the vector map to define the export bounding box, eliminating numerical coordinate input.
2. **Real-Time Spatial Guidance**: A dynamic HUD displays area (km²), dimensions (width × height in km), node count estimation, and safe Overpass API thresholds.
3. **Simplified One-Click Export Controls**: Quick presets (*500m Walk*, *1.2km Suburb*, *2.5km City*, *Current Screen View*) and instant exports to `GeoJSON`, `OSM XML`, `KML`, and `CSV`.

---

## 8. Implementation of 4 Meaningful JavaScript Events

| Event | Trigger Location | Functionality & Academic Demonstration |
|---|---|---|
| **Event 1: `mousedown`, `mousemove`, `mouseup`** | Map Canvas Container | Interactive drag-and-draw bounding box: calculates start and end LatLng coordinates, renders live preview rectangle, and executes Haversine spatial calculations. |
| **Event 2: `input` & `change`** | Search Box, Format Selector, Category Filter, File Name | Real-time user input validation, instant feedback messages, input sanitization, and immediate layer switcher updates. |
| **Event 3: `submit`** | Search Form & Export Form | Intercepts form submission via `e.preventDefault()`, validates area constraints (< 50 km² threshold), checks file name regex, and triggers the Fetch API pipeline. |
| **Event 4: `keydown`** | Global Window Listener | Keyboard accessibility shortcuts: pressing <kbd>B</kbd> toggles the visual bounding box drawing mode; pressing <kbd>Escape</kbd> cancels drawing. |

*(A live event monitor in the top navigation bar displays each event as it fires).*

---

## 9. User Input Form with Validation & Feedback
* **Search Form Validation**:
  - Live character length check: alerts when query is under 3 characters (`"Please type at least 3 characters..."`).
  - Positive feedback indicator when valid (`"Valid query. Searching OpenStreetMap Nominatim..."`).
  - Clear button (<kbd>✕</kbd>) to reset input and state.
* **Export Form Validation**:
  - Validates that a bounding box has been selected prior to export.
  - Regex validation on file names (`^[a-zA-Z0-9_-]+$`) with immediate error feedback.
  - Safety boundary check: alerts if area exceeds safe public API limits (> 25–50 km²).

---

## 10. Fetch API with JSON Data Handling & Import JSON Suite
The application demonstrates the modern **Fetch API** (`async / await`, `response.ok`, `.json()`, and `performance.now()` telemetry) and **JSON Data Handling** across multiple workflows:
1. **Import via Fetch API (URL Endpoint)**:
   - Users can input any JSON endpoint (pre-filled with `/data.json` or external API).
   - Executes `fetch(url)` asynchronously, inspects response headers, measures round-trip latency (ms), displays payload size (KB), and parses the response.
2. **Import via Drag-and-Drop or File Upload (`.json`, `.geojson`)**:
   - Allows users to drag and drop or upload custom `.json` or `.geojson` spatial files.
   - Utilizes `FileReader` to read text, validates syntax via `JSON.parse()`, and checks for valid spatial coordinates (`lat`, `lon` or GeoJSON `coordinates`).
   - Includes a **"Download Sample GeoJSON"** button to allow instant zero-friction local testing.
3. **Preset Datasets from `data.json`**:
   - Quick one-click imports for **Bengaluru**, **London**, **Paris**, and **Tokyo**.
4. **Automatic Map Alignment (`flyToBounds`)**:
   - When a JSON dataset is imported, the system dynamically calculates boundary extrema (`minLat`, `minLng`, `maxLat`, `maxLng`), auto-aligns the visual bounding box rectangle, flies the viewport, and populates the POI data table.
5. **Forward Geocoding & Overpass Extraction**:
   - Real-time queries to Nominatim and Overpass interpreters with structured JSON payload processing.

---

## 11. Error Handling, Loading States & Empty States
* **Loading States**:
  - Search loading notification and dropdown skeleton state during network calls.
  - Live Fetch API telemetry (HTTP status, duration in ms, and payload size).
  - Step-by-step progress status in the Export Panel (*"Connecting to Overpass interpreter via Fetch API..."* → *"Parsing JSON elements..."*).
* **Error Handling**:
  - Try/catch blocks around all Fetch API requests with user-friendly notices.
  - JSON parse error alerts displaying exact syntax error messages.
  - Area threshold warnings when selecting an overly large bounding box (> 50 km²).
* **Empty States**:
  - Helpful message when no search results match the query.
  - Informative placeholder when no bounding box is selected.
  - Data table empty state when zero POIs are present.
* **Toast Notifications**:
  - Unobtrusive floating dark-mode toast alerts confirm bounding box adjustments, map layer changes, file exports, and JSON dataset imports.

---

## 12. Project File Structure
```
├── index.html       # Pure HTML5 semantic markup, Leaflet CDN, layout & modals
├── style.css        # Pure Vanilla CSS3 styles, dark theme, landing navigation
├── script.js        # Pure Vanilla JavaScript ES6+: 4 JS events, Fetch API, Import JSON
├── data.json        # JSON data file demonstrating Fetch API handling & presets
└── README.md        # Comprehensive FSD LAB CIA 1 project documentation
```
