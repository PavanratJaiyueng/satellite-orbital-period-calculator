let selectedSatellites = [];

function isCustomTimeMode() {
  const startTime = document.querySelector('input[name="start_time"]').value.trim();
  const endTime = document.querySelector('input[name="end_time"]').value.trim();
  return startTime && endTime;
}

function getTimeMode() {
  return isCustomTimeMode() ? 'custom' : 'auto';
}

import { 
  searchSatellites as searchSatellitesAPI, 
  calculateSatellites, 
  getRandomSatellites,
  getAuthToken 
} from './auth.js';

async function handleAuthError(error) {
  console.error('Authentication error:', error);
  
  if (error.message.includes('Authentication required') || 
      error.message.includes('Invalid or expired token') ||
      error.message.includes('API token required')) {
    alert('Your session has expired. Please login again.');
    window.location.href = '/login';
    return;
  }
  
  throw error;
}

let map;
let satellitePolylines = [];
let currentPositionMarkers = [];
let altitudeChart = null;
let allSatellitesData = {};
let currentSelectedSatellite = null;
let observerMarker = null;

// ==================== CHART CREATION FUNCTION ====================
function createAmChart(result, date, satelliteNames) {
  if (!result || !result.time_results || !Array.isArray(result.time_results) || result.time_results.length === 0) return;
  if (!satelliteNames || satelliteNames.length === 0) return;

  if (altitudeChart) altitudeChart.dispose();

  am5.ready(function () {
    const root = am5.Root.new("chartdiv");
    root.setThemes([am5themes_Animated.new(root)]);

    const chart = root.container.children.push(
      am5xy.XYChart.new(root, { 
        wheelX: "panX", 
        wheelY: "zoomX", 
        pinchZoomX: true,
        paddingLeft: 20,
        paddingRight: 40,
        paddingTop: 40,
        paddingBottom: 50
      })
    );

    const legendContainer = root.container.children.push(
      am5.Container.new(root, {
        layout: root.horizontalLayout,
        y: 5,
        x: am5.percent(85),
        centerX: am5.percent(90),
        dx: -10
      })
    );

    const legendData = [
      { color: 0xFF9900, label: "Sunlit" },
      { color: 0xBEBEBE, label: "Non-Sunlit" },
      { color: 0x33FF00, label: "Visibility" }
    ];

    legendData.forEach((item) => {
      const legendItem = legendContainer.children.push(
        am5.Container.new(root, {
          layout: root.horizontalLayout,
          paddingLeft: 15
        })
      );

      legendItem.children.push(
        am5.Line.new(root, {
          stroke: am5.color(item.color),
          strokeWidth: 3,
          width: 20,
          height: 0,
          centerY: am5.p50
        })
      );

      legendItem.children.push(
        am5.Label.new(root, {
          text: item.label,
          fontSize: 12,
          fill: am5.color(0xffffff),
          centerY: am5.p50,
          paddingLeft: 5
        })
      );
    });

    const cursor = chart.set("cursor", am5xy.XYCursor.new(root, { behavior: "zoomX" }));
    cursor.lineY.set("visible", false);
    chart.set("zoomOutButton", am5.Button.new(root, {}));

    const xAxis = chart.xAxes.push(
      am5xy.DateAxis.new(root, {
        baseInterval: { timeUnit: "minute", count: 1 },
        gridIntervals: [
          { timeUnit: "minute", count: 10 },
          { timeUnit: "hour", count: 1 },
          { timeUnit: "day", count: 1 }
        ],
        renderer: am5xy.AxisRendererX.new(root, { 
          minGridDistance: 80
        }),
        tooltip: am5.Tooltip.new(root, {}),
        tooltipDateFormat: "HH:mm"
      })
    );

    xAxis.get("renderer").labels.template.setAll({
      fill: am5.color(0xffffff),
      centerY: am5.p50,
      centerX: am5.p100,
      paddingRight: 10,
      fontSize: 11,
      oversizedBehavior: "truncate",
      maxWidth: 100
    });

    xAxis.get("dateFormats")["hour"] = "HH:mm";
    xAxis.get("dateFormats")["minute"] = "HH:mm";

    const yAxis = chart.yAxes.push(
      am5xy.ValueAxis.new(root, { 
        renderer: am5xy.AxisRendererY.new(root, {}), 
        min: -90, 
        max: 90 
      })
    );

    yAxis.get("renderer").labels.template.setAll({
      fill: am5.color(0xffffff),
      fontSize: 11
    });

    xAxis.get("renderer").grid.template.setAll({
      stroke: am5.color(0x888888),
      strokeOpacity: 0.5
    });

    yAxis.get("renderer").grid.template.setAll({
      stroke: am5.color(0x888888),
      strokeOpacity: 0.5
    });

    const solarLimit = -12;

    satelliteNames.forEach((satName) => {
      const satelliteData = [];
      let rowId = 1;

      result.time_results.forEach((timePoint) => {
        if (!timePoint || !timePoint.satellites || !Array.isArray(timePoint.satellites)) return;
        const sat = timePoint.satellites.find(s => s && s.name === satName);
        if (!sat) return;

        const time = new Date(timePoint.utc_time).getTime();
        if (isNaN(time)) return;

        const altitude = sat.altitude ?? 0;
        const sunAlt = sat.sun_alt ?? -999;

        let color;
        if (!sat.is_sunlit) {
          color = am5.color(0x778899);
        } else if (sat.is_sunlit && altitude > 0 && sunAlt <= solarLimit) {
          color = am5.color(0x33FF00);
        } else if (sat.is_sunlit && (altitude <= 0 || sunAlt > solarLimit)) {
          color = am5.color(0xFF9900);
        }

        satelliteData.push({
          date: time,
          value: altitude,
          color: color,
          strokeSettings: { stroke: color },
          satId: rowId++,
          satName: satName,
          utcTime: timePoint.utc_time?.substring(11, 19) || '--:--:--',
          localTime: timePoint.local_time?.substring(11, 19) || '--:--:--',
          sunlit: sat.is_sunlit ? 'Yes' : 'No',
          visible: sat.is_visible ? 'Yes' : 'No',
          sunAlt: sunAlt
        });
      });

      if (satelliteData.length === 0) return;

      const series = chart.series.push(
        am5xy.LineSeries.new(root, {
          name: satName,
          xAxis: xAxis,
          yAxis: yAxis,
          valueYField: "value",
          valueXField: "date",
          tensionX: 0.8,
          tensionY: 0.8
        })
      );

      series.strokes.template.set("templateField", "strokeSettings");

      series.strokes.template.setAll({
        strokeWidth: 3
      });

      const tooltip = series.set("tooltip", am5.Tooltip.new(root, {
        labelText: `{satName}\nID: {satId}\nAltitude: {value}°\nTime (Local): {localTime}\nTime (UTC): {utcTime}`
      }));

      tooltip.get("background").setAll({
        fill: am5.color(0xCCFFFF),
        fillOpacity: 0.5
      });

      series.data.setAll(satelliteData);
    });

    chart.events.on("datavalidated", function() {
      xAxis.zoom(0, 1);
    });

    chart.appear(800, 50);
    altitudeChart = root;
  });
}

// ==================== GRAPH DATA BUTTON FUNCTION ====================
function showGraphData() {
  if (!currentSelectedSatellite || !allSatellitesData[currentSelectedSatellite]) {
    alert('กรุณาเลือกดาวเทียมก่อน');
    return;
  }
  
  const satData = allSatellitesData[currentSelectedSatellite];
  const timeResults = satData.timeResults;
  
  if (!timeResults || timeResults.length === 0) {
    alert('ไม่มีข้อมูลกราฟ');
    return;
  }
  
  document.getElementById('detailedSatelliteNameChart').textContent = `${currentSelectedSatellite} - Graph Data`;
  document.getElementById('detailedSatelliteNameChart').style.borderBottom = `2px solid ${satData.color}`;
  
  const tableHeader = document.querySelector('#detailedDatachart thead tr');
  if (tableHeader) {
    tableHeader.style.background = satData.color;
  }
  
  const tbody = document.getElementById('detailedTableBodychart');
  tbody.innerHTML = '';
  
  timeResults.forEach((timePoint) => {
    const sat = timePoint.satellites?.find(s => s.name === currentSelectedSatellite);
    if (!sat) return;
    
    const row = document.createElement('tr');
    
    row.innerHTML = `
      <td>${timePoint.utc_time.replace(' UTC', '')}</td>
      <td>${timePoint.local_time.replace(/\s[+-]\d+$/, '')}</td>
      <td>${sat.altitude?.toFixed(2) ?? 'N/A'}</td>
      <td>${sat.azimuth?.toFixed(2) ?? 'N/A'}</td>
      <td>${sat.distance_km?.toFixed(2) ?? 'N/A'}</td>
      <td>${sat.sun_alt?.toFixed(2) ?? 'N/A'}</td>
      <td style="text-align: center;">${sat.is_sunlit ? 'Yes' : 'No'}</td>
      <td style="text-align: center;">${sat.is_visible ? 'Yes' : 'No'}</td>
    `;
    tbody.appendChild(row);
  });
  
  document.getElementById('totalRecordsChart').textContent = timeResults.length;
  document.getElementById('detailedTableModalChart').style.display = 'flex';
}

function closeChartTable() {
  document.getElementById('detailedTableModalChart').style.display = 'none';
}

document.addEventListener('click', function(e) {
  const modalChart = document.getElementById('detailedTableModalChart');
  if (e.target === modalChart) {
    closeChartTable();
  }
});

window.closeChartTable = closeChartTable;

// ==================== SATELLITE SELECTION FUNCTIONS ====================
function showSatelliteData(satelliteName) {
  currentSelectedSatellite = satelliteName;
  console.log('Selected satellite:', satelliteName);
  
  updateChartForSatellite(satelliteName);
  updateSatelliteInfo(satelliteName);
  updateMapForSatellite(satelliteName);
  highlightSelectedRow(satelliteName);
}

function updateChartForSatellite(satelliteName) {
  if (!allSatellitesData[satelliteName]) return;
  
  const satData = allSatellitesData[satelliteName];
  createAmChart(
    { time_results: satData.timeResults, timezone: satData.timezone },
    satData.date,
    [satelliteName]
  );
}

function updateSatelliteInfo(satelliteName) {
  const infoPanel = document.getElementById('satellite-info');
  if (!infoPanel || !allSatellitesData[satelliteName]) return;
  
  const satData = allSatellitesData[satelliteName];
  const color = satData.color || '#999';
  
  infoPanel.innerHTML = `
    <h3 style="border-bottom-color: ${color};">${satelliteName}</h3>
    <div class="satellite-info-grid">
      <div class="satellite-info-item">
        <span class="satellite-info-label">Orbital Period</span>
        <span class="satellite-info-value">${satData.orbital_period.toFixed(2)} min</span>
      </div>
      <div class="satellite-info-item">
        <span class="satellite-info-label">NORAD ID:</span>
        <span class="satellite-info-value">${satData.omm.OBJECT_ID}</span>
      </div>
      <div class="satellite-info-item">
        <span class="satellite-info-label">Mean Motion</span>
        <span class="satellite-info-value">${satData.omm.MEAN_MOTION.toFixed(5)} rev/day</span>
      </div>
      <div class="satellite-info-item">
        <span class="satellite-info-label">Velocity</span>
        <span class="satellite-info-value">${satData.average_velocity_km_s?.toFixed(3) ?? 'N/A'} km/s</span>
      </div>
      <div class="satellite-info-item">
        <span class="satellite-info-label">Inclination</span>
        <span class="satellite-info-value">${satData.omm.INCLINATION}°</span>
      </div>
      <div class="satellite-info-item">
        <span class="satellite-info-label">Epoch</span>
        <span class="satellite-info-value">${satData.omm.EPOCH}</span>
      </div>
    </div>
  `;
}

function updateMapForSatellite(satelliteName) {
  if (!allSatellitesData[satelliteName]) return;
  
  satellitePolylines.forEach(layer => map.removeLayer(layer));
  satellitePolylines = [];
  
  currentPositionMarkers.forEach(marker => {
    const tooltipContent = marker.getTooltip()?.getContent() || '';
    const isSelectedSatellite = tooltipContent.includes(`<strong>${satelliteName} (NOW)</strong>`);
    
    if (isSelectedSatellite) {
      if (!map.hasLayer(marker)) {
        marker.addTo(map);
      }
    } else {
      if (map.hasLayer(marker)) {
        map.removeLayer(marker);
      }
    }
  });
  
  const satData = allSatellitesData[satelliteName];
  const { positions, color } = satData;
  
  positions.forEach((pt) => {
    const marker = L.circleMarker([pt.latitude, pt.longitude], {
      color: color,
      fillColor: color,
      radius: 2,
      fillOpacity: 0.9
    }).addTo(map);

    marker.bindTooltip(`${satelliteName}<br>UTC: ${pt.datetime_utc}<br>Local: ${pt.datetime_local}<br>Elevation: ${pt.elevation_km} km`, {
      permanent: false,
      direction: 'auto'
    });

    satellitePolylines.push(marker);
  });
  
  const positionsForPolyline = positions.map(pt => ({
    lat: pt.latitude,
    lon: pt.longitude
  }));
  
  const segments = splitPolylineOnDateline(positionsForPolyline);
  segments.forEach(seg => {
    const polyline = L.polyline(seg, {
      color: color,
      weight: 4,
      opacity: 0.8
    }).addTo(map);
    satellitePolylines.push(polyline);
  });
  
  console.log(`Updated map to show orbit for: ${satelliteName}`);
}

function splitPolylineOnDateline(points) {
  const segments = [];
  let currentSegment = [];
  for (let i = 0; i < points.length; i++) {
    const [lat, lon] = [points[i].lat, points[i].lon];
    if (i > 0) {
      const prevLon = points[i - 1].lon;
      const deltaLon = Math.abs(lon - prevLon);
      if (deltaLon > 180) {
        segments.push(currentSegment);
        currentSegment = [];
      }
    }
    currentSegment.push([lat, lon]);
  }
  if (currentSegment.length > 0) segments.push(currentSegment);
  return segments;
}

function highlightSelectedRow(satelliteName) {
  document.querySelectorAll('#tableSection .selected-row').forEach(row => {
    row.classList.remove('selected-row');
  });
  
  const rows = document.querySelectorAll(`#tableSection [data-satellite="${satelliteName}"]`);
  rows.forEach(row => row.classList.add('selected-row'));
}

function showDetailedTable(satelliteName) {
  if (!allSatellitesData[satelliteName]) return;
  
  const satData = allSatellitesData[satelliteName];
  const positions = satData.positions;
  
  if (!positions || positions.length === 0) {
    alert('No detailed data available for this satellite');
    return;
  }
  
  document.getElementById('detailedSatelliteName').textContent = satelliteName;
  document.getElementById('detailedSatelliteName').style.borderBottom = `2px solid ${satData.color}`;
  
  const tableHeader = document.querySelector('#detailedDataTable thead tr');
  tableHeader.style.background = satData.color;
  
  const tbody = document.getElementById('detailedTableBody');
  tbody.innerHTML = '';
  
  positions.forEach((pos) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${pos.datetime_utc.replace(' UTC', '')}</td>
      <td>${pos.datetime_local}</td>
      <td>${pos.latitude?.toFixed(4) ?? 'N/A'}°</td>
      <td>${pos.longitude?.toFixed(4) ?? 'N/A'}°</td>
      <td>${pos.elevation_km ?? 'N/A'}</td>
    `;
    tbody.appendChild(row);
  });
  
  document.getElementById('totalRecords').textContent = positions.length;
  document.getElementById('detailedTableModal').style.display = 'flex';
}

function closeDetailedTable() {
  document.getElementById('detailedTableModal').style.display = 'none';
}

document.addEventListener('click', function(e) {
  const modal = document.getElementById('detailedTableModal');
  if (e.target === modal) {
    closeDetailedTable();
  }
});

window.closeDetailedTable = closeDetailedTable;

// ==================== OBSERVER MARKER FUNCTION ====================
function addObserverMarker(lat, lon) {
  if (observerMarker) {
    map.removeLayer(observerMarker);
  }

  const observerIcon = L.icon({
    iconUrl: '/icon/loca.png',
    iconSize: [30, 30],        
    iconAnchor: [15, 25],
    popupAnchor: [0, -30],     
    tooltipAnchor: [0, -22],   
    shadowUrl: null,
    shadowSize: null,
    className: 'observer-icon'
  });

  observerMarker = L.marker([parseFloat(lat), parseFloat(lon)], {
    icon: observerIcon,
    zIndexOffset: 1000
  }).addTo(map);

  console.log(`Observer marker added at: Lat=${lat}, Lon=${lon}`);
  console.log(`Marker position:`, observerMarker.getLatLng());
}

// ===== DOM READY EVENT =====
document.addEventListener('DOMContentLoaded', () => {

  document.body.classList.add('initial-state');
  document.querySelector('input[name="date"]').valueAsDate = new Date();

  const searchButton = document.getElementById('searchButton');
  if (searchButton) {
    searchButton.addEventListener('click', performSatelliteSearch);
  }

  const randomButton = document.getElementById('randomButton');
  if (randomButton) {
    randomButton.addEventListener('click', randomSatellite);
  }

  const addToListBtn = document.getElementById('addToListBtn');
  if (addToListBtn) {
    addToListBtn.addEventListener('click', addToList);
  }

  const closeModal = document.getElementById('closeModal');
  if (closeModal) {
    closeModal.addEventListener('click', closeSearchModal);
  }

  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('keypress', function(event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        performSatelliteSearch();
      }
    });
  }

  window.addEventListener('click', function(event) {
    const modal = document.getElementById('searchModal');
    if (event.target === modal) {
      closeSearchModal();
    }
  });

  const fulldataButton = document.getElementById('fulldataButton');
  if (fulldataButton) {
    fulldataButton.addEventListener('click', showGraphData);
    console.log('Full data button event listener added successfully');
  } else {
    console.warn('Full data button not found in DOM');
  }

  // ==================== MAP INITIALIZATION ====================
  map = L.map('map', {
    center: [0, 0],
    zoom: 1,
    minZoom: 0,
    maxZoom: 1,
    maxBounds: [[-90, -180], [90, 180]],
    maxBoundsViscosity: 1.0,
    worldCopyJump: false,
    dragging: false,
    zoomControl: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    keyboard: false,
    crs: L.CRS.EPSG4326
  });

  const imageUrl = 'static/equirectangular_world_map.png';
  const imageBounds = [[-90, -180], [90, 180]];
  L.imageOverlay(imageUrl, imageBounds).addTo(map);

  fetch('static/data/ne_10m_admin_0_countries.json')
    .then(res => res.json())
    .then(geojsonData => {
      L.geoJSON(geojsonData, {
        style: {
          color: '#336666',
          weight: 0.5
        }
      }).addTo(map);
    })
    .catch(err => console.log('Could not load country boundaries:', err));

  function resizeMap() {
    setTimeout(() => map.invalidateSize(), 200);
  }
  resizeMap();
  window.addEventListener('resize', resizeMap);

  const terminator = L.terminator();
  terminator.addTo(map);
  setInterval(() => {
    terminator.setTime(new Date());
  }, 60000);

  const form = document.getElementById('satelliteForm');
  const resultsDiv = document.getElementById('results');

  const dateInput = document.querySelector('input[name="date"]');
  const today = new Date().toISOString().split('T')[0];
  dateInput.value = today;
  dateInput.min = today;

  function updateSelectedSatellitesList() {
    const tbody = document.querySelector('#selectedSatellites tbody');
    tbody.innerHTML = '';
    
    if (selectedSatellites.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = '<td colspan="2" style="text-align: center; color: #666; font-style: italic;">No satellites selected</td>';
      tbody.appendChild(row);
    } else {
      selectedSatellites.forEach((satellite, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${satellite.name}</td>
          <td><button type="button" class="remove-btn" data-index="${index}">Remove</button></td>
        `;
        tbody.appendChild(row);
        
        const removeBtn = row.querySelector('.remove-btn');
        removeBtn.addEventListener('click', () => removeSatellite(index));
      });
    }
  }

  function addToList() {
    const tleTextarea = document.querySelector('textarea[name="tleTextarea"]');
    const tleData = tleTextarea.value.trim();

    if (!tleData) {
      alert('Please enter TLE data');
      return;
    }

    const tleLines = tleData.split('\n').map(l => l.trim()).filter(l => l);

    if (tleLines.length < 3) {
      alert('Please enter complete TLE data (Name, Line 1, Line 2)');
      return;
    }

    for (let i = 0; i <= tleLines.length - 3; i += 3) {
      const name = tleLines[i];
      const tle1 = tleLines[i + 1];
      const tle2 = tleLines[i + 2];

      if (tle1.length !== 69 || tle2.length !== 69) {
        alert(`Invalid TLE format for ${name}. Each line should be 69 characters.`);
        continue;
      }
      
      if (selectedSatellites.some(sat => sat.name === name)) {
        console.log(`Satellite ${name} already in list, skipping.`);
        continue;
      }

      selectedSatellites.push({ name, tle1, tle2 });
    }

    updateSelectedSatellitesList();
    tleTextarea.value = '';
    
    if (selectedSatellites.length > 0) {
      console.log(`Added satellites. Total: ${selectedSatellites.length}`);
    }
  }

  function removeSatellite(index) {
    if (index >= 0 && index < selectedSatellites.length) {
      const removedSat = selectedSatellites.splice(index, 1)[0];
      console.log(`Removed satellite: ${removedSat.name}`);
      updateSelectedSatellitesList();
    }
  }

  window.addToList = addToList;
  window.removeSatellite = removeSatellite;
  window.updateSelectedSatellitesList = updateSelectedSatellitesList;

  updateSelectedSatellitesList();

  function getColors(count) {
    const colors = [];
    for (let i = 0; i < count; i++) {
      const hue = (i * 360 / count) % 360;
      colors.push(`hsl(${hue}, 80%, 60%)`);
    }
    return colors;
  }

  function addCurrentPositionsToMap(currentPositions, calculationInfo) {
    currentPositionMarkers.forEach(marker => map.removeLayer(marker));
    currentPositionMarkers = [];

    if (!currentPositions || currentPositions.length === 0) return;

    if (calculationInfo && calculationInfo.observation_start_utc && calculationInfo.observation_end_utc) {
      const currentTime = new Date();
      const startTime = new Date(calculationInfo.observation_start_utc);
      const endTime = new Date(calculationInfo.observation_end_utc);
      
      if (currentTime < startTime || currentTime > endTime) {
        console.log('Current time is outside observation period. Not showing current positions.');
        return;
      }
    }

    const satelliteIcon = L.icon({
      iconUrl: 'icon/satelliteicon.png',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12],
      shadowUrl: null,
      shadowSize: null,
      className: 'satellite-current-icon'
    });

    currentPositions.forEach((satPos) => {
      const currentMarker = L.marker([satPos.latitude, satPos.longitude], {
        icon: satelliteIcon
      }).addTo(map);

      const tooltipContent = `
        <strong>${satPos.name} (NOW)</strong><br>
        Time (UTC): ${satPos.current_time_utc}<br>
        Time (Local): ${satPos.current_time_local}<br>
        Latitude: ${satPos.latitude}°<br>
        Longitude: ${satPos.longitude}°<br>
        Elevation: ${satPos.elevation_km} km<br>
        Distance from Observer: ${satPos.distance_from_observer_km} km<br>
        Altitude from Observer: ${satPos.altitude_from_observer}°<br>
        Azimuth: ${satPos.azimuth_from_observer}°<br>
        Orbital Velocity: ${satPos.orbital_velocity_km_s} km/s<br>
        Sunlit: ${satPos.is_sunlit ? 'Yes' : 'No'}<br>
        Visible: ${satPos.is_visible ? 'Yes' : 'No'}<br>
        Sun Altitude: ${satPos.sun_altitude}°
      `;

      currentMarker.bindTooltip(tooltipContent, {
        permanent: false,
        direction: 'auto'
      });

      currentPositionMarkers.push(currentMarker);
    });

    console.log(`Showing ${currentPositions.length} current position markers on map.`);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (selectedSatellites.length === 0) {
      alert('Please select at least one satellite');
      return;
    }

    const calculateBtn = form.querySelector('button[type="submit"]');
    const originalBtnHTML = calculateBtn.innerHTML;

    calculateBtn.disabled = true;
    calculateBtn.innerHTML = '⏳ Calculating...';
    calculateBtn.style.opacity = '0.7';
    calculateBtn.style.cursor = 'not-allowed';

    satellitePolylines.forEach(layer => map.removeLayer(layer));
    satellitePolylines = [];
    
    currentPositionMarkers.forEach(marker => map.removeLayer(marker));
    currentPositionMarkers = [];
    
    allSatellitesData = {};

    const formData = new FormData(form);
    const lat = formData.get('lat');
    const lon = formData.get('lon');
    const date = formData.get('date');
    const startTime = formData.get('start_time');
    const endTime = formData.get('end_time');

    if (!lat || !lon || !date) {
      calculateBtn.disabled = false;
      calculateBtn.innerHTML = originalBtnHTML;
      calculateBtn.style.opacity = '1';
      calculateBtn.style.cursor = 'pointer';

      alert('Please fill in latitude, longitude, and date');
      return;
    }
    if (isNaN(parseFloat(lat)) || isNaN(parseFloat(lon))) {
      calculateBtn.disabled = false;
      calculateBtn.innerHTML = originalBtnHTML;
      calculateBtn.style.opacity = '1';
      calculateBtn.style.cursor = 'pointer';

      alert('Please enter valid numeric values for latitude and longitude');
      return;
    }

    const timeMode = getTimeMode();
    console.log(`Using ${timeMode} time mode`);

    const payload = { 
      lat, 
      lon, 
      date, 
      start_time: startTime || '', 
      end_time: endTime || '', 
      satellites: selectedSatellites,
      time_mode: timeMode
    };

    console.log('Debug - Payload being sent:', payload);

    try {
      console.log('Sending calculation request with authentication...');
      
      const result = await calculateSatellites(payload);

      const observerLat = parseFloat(lat);
      const observerLon = parseFloat(lon);
      console.log(`Creating observer marker at: Lat=${observerLat}, Lon=${observerLon}`);
      addObserverMarker(observerLat, observerLon);

      const timezone = result.timezone || 'Local Time';
      let offset = 0;

      if (result.calculation_time?.utc && result.calculation_time?.local) {
        try {
          const utcTime = new Date(result.calculation_time.utc);
          const localStr = result.calculation_time.local.split(' ')[0] + ' ' + result.calculation_time.local.split(' ')[1];
          const localTime = new Date(localStr + ' UTC');
          
          offset = Math.round((localTime - utcTime) / (1000 * 60 * 60));
          console.log(`Calculated offset from time difference: ${offset} hours`);
        } catch (err) {
          console.error('Error calculating offset from times:', err);
        }
      }

      if (offset === 0 && result.calculation_time?.local) {
        console.log('Parsing local time string:', result.calculation_time.local);
        const match = result.calculation_time.local.match(/\s([+-])(\d{2})$/);
        console.log('Regex match result:', match);
        
        if (match) {
          const signChar = match[1];
          const hoursNum = parseInt(match[2], 10);
          offset = signChar === '+' ? hoursNum : -hoursNum;
          console.log('Parsed offset from string:', offset);
        }
      }

      console.log(`Final timezone: ${timezone}, offset: ${offset}`);
      window.switchToLocalTimeView(timezone, offset);
      
      if (result.current_positions && Array.isArray(result.current_positions)) {
        console.log('Current positions found:', result.current_positions.length);
        addCurrentPositionsToMap(result.current_positions, result.calculation_info);
      }

      let timeResults = result.minute_results && Array.isArray(result.minute_results) ? result.minute_results :
                        result.hourly_results && Array.isArray(result.hourly_results) ? result.hourly_results :
                        result.data && Array.isArray(result.data) ? result.data :
                        Array.isArray(result) ? result : null;

      if (timeResults && timeResults.length > 0) {
      
        document.body.classList.remove('initial-state');
        document.body.classList.add('calculated-state');

        const sidebar = document.querySelector('.sidebar');
        const toggleBtn = document.querySelector('.toggle-sidebar');
        if (sidebar) {
          sidebar.classList.add('collapsed');
        }
        if (toggleBtn) {
          toggleBtn.classList.add('sidebar-collapsed');
        }
        
        const tableWrapper = document.getElementById("tableWrapper");
        const satelliteInfoWrapper = document.getElementById("satellite-info-wrapper");
        const chartWrapper = document.getElementById("chartWrapper");
        
        if (tableWrapper) tableWrapper.style.display = 'flex';
        if (satelliteInfoWrapper) satelliteInfoWrapper.style.display = 'flex';
        if (chartWrapper) chartWrapper.style.display = 'flex';
      }

      if (result.orbit_info && Array.isArray(result.orbit_info)) {
        const satelliteGrouped = {};
        const colors = getColors(result.orbit_info.length);
        
        result.orbit_info.forEach((sat, idx) => {
          if (!Array.isArray(sat.positions)) return;
          
          const time_step_minutes = (sat.positions.length >= 2) ?
            (new Date(sat.positions[1].datetime_utc) - new Date(sat.positions[0].datetime_utc)) / (60 * 1000) :
            null;

          const color = colors[idx];
          
          allSatellitesData[sat.name] = {
            orbital_period: sat.orbital_period_minutes,
            omm: sat.omm,
            average_velocity_km_s: sat.average_velocity_km_s,
            time_step_minutes: time_step_minutes,
            timeResults: timeResults,
            date: date,
            timezone: result.timezone,
            color: color,
            positions: sat.positions.map(pos => ({
              latitude: pos.latitude,
              longitude: pos.longitude,
              datetime_utc: pos.datetime_utc,
              datetime_local: pos.datetime_local,
              elevation_km: pos.elevation_km,
              orbital_velocity_km_s: sat.average_velocity_km_s
            }))
          };
          
          satelliteGrouped[sat.name] = allSatellitesData[sat.name];
        });

        const tableSection = document.getElementById('tableSection');
        if (tableSection && result.current_positions && result.current_positions.length > 0) {
          let tableHTML = '';
          
          const currentPosMap = {};
          result.current_positions.forEach(pos => {
            currentPosMap[pos.name] = pos;
          });
          
          tableHTML += '<table id="satelliteTable"><thead><tr>';
          tableHTML += '<th>Name</th><th>Time (UTC)</th><th>Time (Local)</th>';
          tableHTML += '<th>Latitude</th><th>Longitude</th><th>Elevation (km)</th>';
          tableHTML += '<th>Actions</th>';
          tableHTML += '</tr></thead><tbody>';
          
          Object.entries(satelliteGrouped).forEach(([name, sat]) => {
            const color = sat.color;
            const currentPos = currentPosMap[name];
            
            if (currentPos) {
              tableHTML += `<tr data-satellite="${name}" style="border-left: 4px solid ${color}; cursor: pointer;" class="satellite-row">`;
              tableHTML += `<td><strong>${name}</strong></td>`;
              tableHTML += `<td>${currentPos.current_time_utc.replace(/\sUTC$/, '')}</td>`;
              tableHTML += `<td>${currentPos.current_time_local.replace(/\s[+-]\d+$/, '')}</td>`;
              tableHTML += `<td>${currentPos.latitude.toFixed(4)}°</td>`;
              tableHTML += `<td>${currentPos.longitude.toFixed(4)}°</td>`;
              tableHTML += `<td>${currentPos.elevation_km}</td>`;
              tableHTML += `<td><button class="data-table-btn" data-satellite="${name}">Show All Data</button></td>`;
              tableHTML += '</tr>';
            }
          });
          
          tableHTML += '</tbody></table>';
          tableSection.innerHTML = tableHTML;

          document.querySelectorAll('.satellite-row').forEach(row => {
            row.addEventListener('click', function() {
              const satName = this.getAttribute('data-satellite');
              showSatelliteData(satName);
            });
          });

          document.querySelectorAll('.data-table-btn').forEach(button => {
            button.addEventListener('click', function(e) {
              e.stopPropagation();
              const satName = this.getAttribute('data-satellite');
              showDetailedTable(satName);
            });
          });
        }

        const firstSatellite = Object.keys(satelliteGrouped)[0];
        if (firstSatellite) {
          showSatelliteData(firstSatellite);
        }
      }

      calculateBtn.disabled = false;
      calculateBtn.innerHTML = originalBtnHTML;
      calculateBtn.style.opacity = '1';
      calculateBtn.style.cursor = 'pointer';

    } catch (error) {
      console.error('Error:', error.message);

      calculateBtn.disabled = false;
      calculateBtn.innerHTML = originalBtnHTML;
      calculateBtn.style.opacity = '1';
      calculateBtn.style.cursor = 'pointer';

      await handleAuthError(error);
    }
  });

});

// ==================== SEARCH FUNCTION ====================
async function performSatelliteSearch() {
  const searchTerm = document.getElementById('searchInput').value.trim();
  const searchType = document.getElementById('searchType').value;
  const modal = document.getElementById('searchModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalResults = document.getElementById('modalResults');

  if (!searchTerm) {
    alert('Please enter a search term');
    return;
  }

  if (searchType === 'norad' && !/^\d+$/.test(searchTerm)) {
    alert('NORAD ID must be a number');
    return;
  }

  modalTitle.textContent = 'Searching...';
  modalResults.innerHTML = '<div>Searching for satellites...</div>';
  modal.style.display = 'block';

  try {
    console.log(`Searching satellites by ${searchType}:`, searchTerm);
    
    const data = await searchSatellitesAPI(searchTerm, searchType);

    const searchTypeLabel = searchType === 'norad' ? 'NORAD ID' : 'Name';
    modalTitle.textContent = `Search Results for ${searchTypeLabel} (${data.satellites.length} found)`;
    
    if (data.satellites.length === 0) {
      modalResults.innerHTML = `<div>No satellites found with ${searchTypeLabel}: "${searchTerm}"</div>`;
    } else {
      let html = '';
      data.satellites.forEach((satellite, index) => {
        const satelliteName = satellite.OBJECT_NAME || satellite.TLE_LINE0 || 'Unknown';
        const noradId = satellite.NORAD_CAT_ID || satellite.OBJECT_ID || 'N/A';
        const line1 = satellite.TLE_LINE1 || '';
        const line2 = satellite.TLE_LINE2 || '';
        const creationDate = satellite.CREATION_DATE || 'N/A';
        
        // Format date to be more readable (if it's in ISO format)
        let formattedDate = creationDate;
        if (creationDate !== 'N/A' && creationDate.includes('T')) {
          const date = new Date(creationDate);
          formattedDate = date.toLocaleString('en-GB', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
        
        const tleDisplay = `${line1}\n${line2}`;
        
        html += `
          <div class="satellite-item-with-button">
            <div class="satellite-content">
              <div class="satellite-name">${satelliteName} <span style="color: #666; font-size: 0.9em;">(NORAD: ${noradId})</span></div>
              <div class="satellite-tle">${tleDisplay}</div>
              <br><div class="satellite-date" style="color: #888; font-size: 0.85em; margin-top: 5px;">📅 Updated: ${formattedDate}</div>
            </div>
            <button class="add-satellite-btn" data-name="${satelliteName.replace(/'/g, "&apos;")}" data-line1="${line1}" data-line2="${line2}">ADD</button>
          </div>
        `;
      });
      modalResults.innerHTML = html;

      modalResults.querySelectorAll('.add-satellite-btn').forEach(button => {
        button.addEventListener('click', function() {
          const name = this.getAttribute('data-name').replace(/&apos;/g, "'");
          const line1 = this.getAttribute('data-line1');
          const line2 = this.getAttribute('data-line2');
          selectSatelliteFromSearch(name, line1, line2, this);
        });
      });
    }
  } catch (error) {
    modalTitle.textContent = 'Search Error';
    modalResults.innerHTML = `<div>Error: ${error.message}</div>`;
    console.error('Search error:', error);
    await handleAuthError(error);
  }
}

function selectSatelliteFromSearch(name, line1, line2, buttonElement = null) {
  if (selectedSatellites.some(sat => sat.name === name)) {
    alert(`Satellite "${name}" is already in the list`);
    return;
  }

  selectedSatellites.push({
    name: name,
    tle1: line1,
    tle2: line2
  });

  window.updateSelectedSatellitesList();
  
  if (buttonElement) {
    buttonElement.textContent = 'ADDED';
    buttonElement.disabled = true;
  }

  console.log(`Added satellite: ${name}`);
}

function closeSearchModal() {
  document.getElementById('searchModal').style.display = 'none';
}

async function randomSatellite() {
  const randomButton = document.getElementById('randomButton');
  const originalText = randomButton.textContent;

  try {
    const lat = parseFloat(document.querySelector('input[name="lat"]').value);
    const lon = parseFloat(document.querySelector('input[name="lon"]').value);
    const date = document.querySelector('input[name="date"]').value;
    const startTime = document.querySelector('input[name="start_time"]').value;
    const endTime = document.querySelector('input[name="end_time"]').value;

    if (isNaN(lat) || isNaN(lon) || !date) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน: ละติจูด, ลองจิจูด, และวันที่');
      return;
    }

    const timeMode = getTimeMode();

    randomButton.textContent = 'กำลังโหลด...';
    randomButton.disabled = true;

    const requestPayload = {
      lat: lat,
      lon: lon,
      date: date,
      timezone: 'Asia/Bangkok',
      time_mode: timeMode
    };

    if (timeMode === 'custom') {
      requestPayload.start_time = startTime;
      requestPayload.end_time = endTime;
    }

    console.log('Sending random satellites request with authentication...');

    const result = await getRandomSatellites(requestPayload);

    if (!result.success) {
      throw new Error(result.error || result.message || 'Request failed');
    }

    const satellites = result.satellites;
    if (!satellites || satellites.length === 0) {
      const params = result.calculation_parameters;
      let alertMessage = `ไม่พบดาวเทียมที่เหมาะสมสำหรับการสังเกต\n\n`;
      alertMessage += `📍 ตำแหน่ง: ${params.latitude}, ${params.longitude}\n`;
      alertMessage += `📅 วันที่: ${params.target_date}\n`;
      
      if (params.time_mode === 'custom') {
        alertMessage += `⏰ ช่วงเวลา: ${params.custom_start_time} - ${params.custom_end_time}\n`;
        alertMessage += `\n💡 คำแนะนำ:\n`;
        alertMessage += `- ลองเปลี่ยนช่วงเวลาเป็นช่วงค่ำ-กลางคืน (เช่น 18:00-22:00)\n`;
        alertMessage += `- หรือใช้โหมด Auto เพื่อหาช่วงเวลาที่เหมาะสมอัตโนมัติ\n`;
        alertMessage += `- เงื่อนไขการมองเห็น: ดาวเทียมต้องสูงกว่าขอบฟ้า + ได้รับแสงอาทิตย์ + ท้องฟ้าต้องมืดพอ`;
      } else {
        alertMessage += `🌙 โหมด: Auto Night Detection\n`;
        alertMessage += `\n💡 ลองเปลี่ยนวันที่หรือตำแหน่งสังเกต`;
      }
      
      alert(alertMessage);
      return;
    }

    let addedCount = 0;
    satellites.forEach(satellite => {
      const existingIndex = selectedSatellites.findIndex(s => s.name === satellite.name);
      if (existingIndex === -1) {
        selectedSatellites.push({
          name: satellite.name,
          tle1: satellite.tle1,
          tle2: satellite.tle2
        });
        addedCount++;
      }
    });

    window.updateSelectedSatellitesList();

    console.log(`สรุปผลลัพธ์:`);
    console.log(`- พบดาวเทียมที่มองเห็นได้: ${satellites.length} ดวง`);
    console.log(`- เพิ่มใหม่: ${addedCount} ดวง`);
    console.log(`- รวมดาวเทียมในรายการ: ${selectedSatellites.length} ดวง`);

  } catch (error) {
    console.error('Error details:', error);
    await handleAuthError(error);
  } finally {
    randomButton.textContent = originalText;
    randomButton.disabled = false;
  }
}

window.performSatelliteSearch = performSatelliteSearch;
window.searchSatellites = performSatelliteSearch;
window.selectSatelliteFromSearch = selectSatelliteFromSearch;
window.closeSearchModal = closeSearchModal;
window.randomSatellite = randomSatellite;
window.showSatelliteData = showSatelliteData;