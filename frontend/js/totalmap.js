let selectedSatellites = [];

function isCustomTimeMode() {
  const startTime = document.querySelector('input[name="start_time"]').value.trim();
  const endTime = document.querySelector('input[name="end_time"]').value.trim();
  return startTime && endTime;
}

function getTimeMode() {
  return isCustomTimeMode() ? 'custom' : 'auto';
}

// Import auth functions with specific aliases to avoid conflicts
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

// Global variables for map and charts
let map;
let satellitePolylines = [];
let currentPositionMarkers = [];
let altitudeChart = null;

// ==================== SATELLITE SELECTION SYSTEM ====================
let allSatellitesData = {};
let currentSelectedSatellite = null;

// ==================== CHART CREATION FUNCTION (MOVED OUTSIDE DOMContentLoaded) ====================
function createAmChart(result, date, satelliteNames) {
  if (!result || !result.time_results || !Array.isArray(result.time_results) || result.time_results.length === 0) return;
  if (!satelliteNames || satelliteNames.length === 0) return;

  if (altitudeChart) altitudeChart.dispose();

  am5.ready(function () {
    const root = am5.Root.new("chartdiv");
    root.setThemes([am5themes_Animated.new(root)]);

    const chart = root.container.children.push(
      am5xy.XYChart.new(root, { wheelX: "panX", wheelY: "zoomX", pinchZoomX: true })
    );

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
        renderer: am5xy.AxisRendererX.new(root, { minGridDistance: 60 }),
        tooltip: am5.Tooltip.new(root, {}),
        tooltipDateFormat: "HH:mm"
      })
    );

    const yAxis = chart.yAxes.push(
      am5xy.ValueAxis.new(root, { renderer: am5xy.AxisRendererY.new(root, {}), min: -90, max: 90 })
    );

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
          color = am5.color(0x000000);
        } else if (sat.is_sunlit && altitude > 0 && sunAlt <= solarLimit) {
          color = am5.color(0x00FF00);
        } else if (sat.is_sunlit && (altitude <= 0 || sunAlt > solarLimit)) {
          color = am5.color(0xFF0000);
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

      const tooltip = series.set("tooltip", am5.Tooltip.new(root, {
        labelText: `{satName}\nID: {satId}\nAltitude: {value}°\nTime (Local): {localTime}\nTime (UTC): {utcTime}`
      }));

      tooltip.get("background").setAll({
        fill: am5.color(0xCCFFFF),
        fillOpacity: 0.5
      });

      series.data.setAll(satelliteData);
    });

    chart.appear(800, 50);
    altitudeChart = root;
  });
}

// ==================== SATELLITE SELECTION FUNCTIONS ====================
function showSatelliteData(satelliteName) {
  currentSelectedSatellite = satelliteName;
  console.log('Selected satellite:', satelliteName);
  
  updateChartForSatellite(satelliteName);
  updateSatelliteInfo(satelliteName);
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
  
  infoPanel.innerHTML = '';
  
  const card = document.createElement('div');
  card.style.padding = '15px';
  card.style.backgroundColor = '#f9f9f9';
  card.style.borderRadius = '8px';
  
  card.innerHTML = `
    <h3 style="margin-top: 0; padding-bottom: 10px; border-bottom: 2px solid ${color};">${satelliteName}</h3>
    <p><strong>Orbital Period:</strong> ${satData.orbital_period.toFixed(2)} min</p>
    <p><strong>Inclination:</strong> ${satData.omm.INCLINATION}°</p>
    <p><strong>Mean Motion:</strong> ${satData.omm.MEAN_MOTION.toFixed(5)} rev/day</p>
    <p><strong>Velocity:</strong> ${satData.average_velocity_km_s?.toFixed(3) ?? 'N/A'} km/s</p>
    <p><strong>Time Step:</strong> ${satData.time_step_minutes?.toFixed(2) ?? 'N/A'} min</p>
    <p><strong>Epoch:</strong> ${satData.omm.EPOCH}</p>
  `;
  
  infoPanel.appendChild(card);
}

function highlightSelectedRow(satelliteName) {
  document.querySelectorAll('#tableSection .selected-row').forEach(row => {
    row.classList.remove('selected-row');
  });
  
  const rows = document.querySelectorAll(`#tableSection [data-satellite="${satelliteName}"]`);
  rows.forEach(row => row.classList.add('selected-row'));
}

// ===== DOM READY EVENT =====
document.addEventListener('DOMContentLoaded', () => {
  
  document.querySelector('input[name="date"]').valueAsDate = new Date();

  // ===== EVENT LISTENERS SETUP =====
  
  // Search button
  const searchButton = document.getElementById('searchButton');
  if (searchButton) {
    searchButton.addEventListener('click', performSatelliteSearch);
  }

  // Random satellite button  
  const randomButton = document.getElementById('randomButton');
  if (randomButton) {
    randomButton.addEventListener('click', randomSatellite);
  }

  // Add to list button
  const addToListBtn = document.getElementById('addToListBtn');
  if (addToListBtn) {
    addToListBtn.addEventListener('click', addToList);
  }

  // Close modal
  const closeModal = document.getElementById('closeModal');
  if (closeModal) {
    closeModal.addEventListener('click', closeSearchModal);
  }

  // Search on Enter key
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('keypress', function(event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        performSatelliteSearch();
      }
    });
  }

  // Close modal when clicking outside
  window.addEventListener('click', function(event) {
    const modal = document.getElementById('searchModal');
    if (event.target === modal) {
      closeSearchModal();
    }
  });

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

  // ==================== FORM AND TABLE INITIALIZATION ====================
  const form = document.getElementById('satelliteForm');
  const resultsDiv = document.getElementById('results');

  const dateInput = document.querySelector('input[name="date"]');
  const today = new Date().toISOString().split('T')[0];
  dateInput.value = today;
  dateInput.min = today;

  // ==================== SATELLITE MANAGEMENT FUNCTIONS ====================
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
        
        // Add event listener to remove button
        const removeBtn = row.querySelector('.remove-btn');
        removeBtn.addEventListener('click', () => removeSatellite(index));
      });
    }
  }

  // Add satellite from manual TLE input
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

  // Remove satellite from list
  function removeSatellite(index) {
    if (index >= 0 && index < selectedSatellites.length) {
      const removedSat = selectedSatellites.splice(index, 1)[0];
      console.log(`Removed satellite: ${removedSat.name}`);
      updateSelectedSatellitesList();
    }
  }

  // Make functions available for this scope
  window.addToList = addToList;
  window.removeSatellite = removeSatellite;
  window.updateSelectedSatellitesList = updateSelectedSatellitesList;

  updateSelectedSatellitesList();

  // ==================== MAP HELPER FUNCTIONS ====================
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

  function getColors(count) {
    const colors = [];
    for (let i = 0; i < count; i++) {
      const hue = (i * 360 / count) % 360;
      colors.push(`hsl(${hue}, 80%, 60%)`);
    }
    return colors;
  }

  // ==================== CURRENT POSITION DISPLAY FUNCTION ====================
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
        Current Time (UTC): ${satPos.current_time_utc}<br>
        Current Time (Local): ${satPos.current_time_local}<br>
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

  // ==================== MAIN FORM SUBMIT HANDLER ====================
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (selectedSatellites.length === 0) {
      alert('Please select at least one satellite');
      return;
    }

    // Clear existing map data
    satellitePolylines.forEach(layer => map.removeLayer(layer));
    satellitePolylines = [];
    
    // Clear existing current position markers
    currentPositionMarkers.forEach(marker => map.removeLayer(marker));
    currentPositionMarkers = [];
    
    // Clear existing data
    allSatellitesData = {};

    const formData = new FormData(form);
    const lat = formData.get('lat');
    const lon = formData.get('lon');
    const date = formData.get('date');
    const startTime = formData.get('start_time');
    const endTime = formData.get('end_time');

    // Validation
    if (!lat || !lon || !date) {
      alert('Please fill in latitude, longitude, and date');
      return;
    }
    if (isNaN(parseFloat(lat)) || isNaN(parseFloat(lon))) {
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

      // Extract timezone information
      const timezone = result.timezone || 'Local Time';
      let offset = 0;

      // Method 1: Calculate from actual time difference
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

      // Method 2: Parse from string (fallback)
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
      
      // ==================== HANDLE CURRENT POSITIONS ====================
      if (result.current_positions && Array.isArray(result.current_positions)) {
        console.log('Current positions found:', result.current_positions.length);
        addCurrentPositionsToMap(result.current_positions, result.calculation_info);
      }

      // ==================== HANDLE ALTITUDE TABLE AND CHART ====================
      let timeResults = result.minute_results && Array.isArray(result.minute_results) ? result.minute_results :
                        result.hourly_results && Array.isArray(result.hourly_results) ? result.hourly_results :
                        result.data && Array.isArray(result.data) ? result.data :
                        Array.isArray(result) ? result : null;

      if (timeResults && timeResults.length > 0) {
        const tableWrapper = document.getElementById("tableWrapper");
        const satelliteInfoWrapper = document.getElementById("satellite-info-wrapper");
        
        if (tableWrapper) tableWrapper.style.display = 'flex';
        if (satelliteInfoWrapper) satelliteInfoWrapper.style.display = 'flex';
      }

      // ==================== HANDLE MAP VISUALIZATION ====================
      if (result.orbit_info && Array.isArray(result.orbit_info)) {
        const satelliteGrouped = {};
        const colors = getColors(result.orbit_info.length);
        
        // เก็บข้อมูลทั้งหมด
        result.orbit_info.forEach((sat, idx) => {
          if (!Array.isArray(sat.positions)) return;
          
          const time_step_minutes = (sat.positions.length >= 2) ?
            (new Date(sat.positions[1].datetime_utc) - new Date(sat.positions[0].datetime_utc)) / (60 * 1000) :
            null;

          const color = colors[idx];
          
          // เก็บข้อมูลไว้ใน global variable
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
              lat: pos.latitude,
              lon: pos.longitude,
              datetime_utc: pos.datetime_utc,
              datetime_local: pos.datetime_local,
              elevation_km: pos.elevation_km,
              orbital_velocity_km_s: sat.average_velocity_km_s
            }))
          };
          
          satelliteGrouped[sat.name] = allSatellitesData[sat.name];
        });

        // สร้างตารางแบบใหม่ - แสดงละดวงละ 1 แถว
        const tableSection = document.getElementById('tableSection');
        if (tableSection && result.current_positions && result.current_positions.length > 0) {
          let tableHTML = '';
          
          // สร้าง map ของ current positions สำหรับการเข้าถึงง่าย
          const currentPosMap = {};
          result.current_positions.forEach(pos => {
            currentPosMap[pos.name] = pos;
          });
          
          tableHTML += '<table id="satelliteTable"><thead><tr>';
          tableHTML += '<th>Name</th><th>Time (UTC)</th><th>Time (Local)</th>';
          tableHTML += '<th>Latitude</th><th>Longitude</th><th>Elevation (km)</th>';
          tableHTML += '<th>Altitude</th><th>Azimuth</th><th>Actions</th>';
          tableHTML += '</tr></thead><tbody>';
          
          Object.entries(satelliteGrouped).forEach(([name, sat]) => {
            const color = sat.color;
            const currentPos = currentPosMap[name];
            
            if (currentPos) {
              
              tableHTML += `<tr data-satellite="${name}" style="border-left: 4px solid ${color};">`;
              tableHTML += `<td><strong>${name}</strong></td>`;
              tableHTML += `<td>${currentPos.current_time_utc}</td>`;
              tableHTML += `<td>${currentPos.current_time_local}</td>`;
              tableHTML += `<td>${currentPos.latitude.toFixed(4)}°</td>`;
              tableHTML += `<td>${currentPos.longitude.toFixed(4)}°</td>`;
              tableHTML += `<td>${currentPos.elevation_km}</td>`;
              tableHTML += `<td>${currentPos.altitude_from_observer.toFixed(2)}°</td>`;
              tableHTML += `<td>${currentPos.azimuth_from_observer.toFixed(2)}°</td>`;
              tableHTML += `<td><button class="data-table-btn" onclick="showSatelliteData('${name}')">View Details</button></td>`;
              tableHTML += '</tr>';
            }
          });
          
          tableHTML += '</tbody></table>';
          tableSection.innerHTML = tableHTML;
        }

        // วาดวงโคจรบนแผนที่
        Object.entries(satelliteGrouped).forEach(([name, sat]) => {
          const { positions, color } = sat;
          
          positions.forEach((pt) => {
            const marker = L.circleMarker([pt.lat, pt.lon], {
              color: color,
              fillColor: color,
              radius: 2,
              fillOpacity: 0.9
            }).addTo(map);

            marker.bindTooltip(`${name}<br>UTC: ${pt.datetime_utc}<br>Local: ${pt.datetime_local}<br>Elevation: ${pt.elevation_km} km`, {
              permanent: false,
              direction: 'auto'
            });

            satellitePolylines.push(marker);
          });
          
          const segments = splitPolylineOnDateline(positions);
          segments.forEach(seg => {
            const polyline = L.polyline(seg, {
              color: color,
              weight: 4,
              opacity: 0.8
            }).addTo(map);
            satellitePolylines.push(polyline);
          });
        });

        // แสดงดาวเทียมดวงแรกทันที
        const firstSatellite = Object.keys(satelliteGrouped)[0];
        if (firstSatellite) {
          showSatelliteData(firstSatellite);
        }
      }

    } catch (error) {
      console.error('Error:', error.message);
      await handleAuthError(error);
    }
  });

});

// ==================== SATELLITE SEARCH FUNCTIONALITY ====================
async function performSatelliteSearch() {
  const searchTerm = document.getElementById('searchInput').value.trim();
  const modal = document.getElementById('searchModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalResults = document.getElementById('modalResults');

  if (!searchTerm) {
    alert('Please enter a search term');
    return;
  }

  modalTitle.textContent = 'Searching...';
  modalResults.innerHTML = '<div>Searching for satellites...</div>';
  modal.style.display = 'block';

  try {
    console.log('Searching satellites with authentication...');
    
    const data = await searchSatellitesAPI(searchTerm);

    modalTitle.textContent = `Search Results (${data.satellites.length} found)`;
    
    if (data.satellites.length === 0) {
      modalResults.innerHTML = '<div>No satellites found</div>';
    } else {
      let html = '';
      data.satellites.forEach((satellite, index) => {
        const satelliteName = satellite.OBJECT_NAME || satellite.TLE_LINE0 || 'Unknown';
        const line1 = satellite.TLE_LINE1 || '';
        const line2 = satellite.TLE_LINE2 || '';
        const tleDisplay = `${line1}\n${line2}`;
        
        html += `
          <div class="satellite-item-with-button">
            <div class="satellite-content">
              <div class="satellite-name">${satelliteName}</div>
              <div class="satellite-tle">${tleDisplay}</div>
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

// Make functions available globally
window.performSatelliteSearch = performSatelliteSearch;
window.searchSatellites = performSatelliteSearch;
window.selectSatelliteFromSearch = selectSatelliteFromSearch;
window.closeSearchModal = closeSearchModal;
window.randomSatellite = randomSatellite;
window.showSatelliteData = showSatelliteData;







let selectedSatellites = [];

function isCustomTimeMode() {
  const startTime = document.querySelector('input[name="start_time"]').value.trim();
  const endTime = document.querySelector('input[name="end_time"]').value.trim();
  return startTime && endTime;
}

function getTimeMode() {
  return isCustomTimeMode() ? 'custom' : 'auto';
}

// Import auth functions with specific aliases to avoid conflicts
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

// Global variables for map and charts
let map;
let satellitePolylines = [];
let currentPositionMarkers = [];
let altitudeChart = null;

// ==================== SATELLITE SELECTION SYSTEM ====================
let allSatellitesData = {};
let currentSelectedSatellite = null;

// ==================== CHART CREATION FUNCTION (MOVED OUTSIDE DOMContentLoaded) ====================
function createAmChart(result, date, satelliteNames) {
  if (!result || !result.time_results || !Array.isArray(result.time_results) || result.time_results.length === 0) return;
  if (!satelliteNames || satelliteNames.length === 0) return;

  if (altitudeChart) altitudeChart.dispose();

  am5.ready(function () {
    const root = am5.Root.new("chartdiv");
    root.setThemes([am5themes_Animated.new(root)]);

    const chart = root.container.children.push(
      am5xy.XYChart.new(root, { wheelX: "panX", wheelY: "zoomX", pinchZoomX: true })
    );

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
        renderer: am5xy.AxisRendererX.new(root, { minGridDistance: 60 }),
        tooltip: am5.Tooltip.new(root, {}),
        tooltipDateFormat: "HH:mm"
      })
    );

    const yAxis = chart.yAxes.push(
      am5xy.ValueAxis.new(root, { renderer: am5xy.AxisRendererY.new(root, {}), min: -90, max: 90 })
    );

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
          color = am5.color(0x000000);
        } else if (sat.is_sunlit && altitude > 0 && sunAlt <= solarLimit) {
          color = am5.color(0x00FF00);
        } else if (sat.is_sunlit && (altitude <= 0 || sunAlt > solarLimit)) {
          color = am5.color(0xFF0000);
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

      const tooltip = series.set("tooltip", am5.Tooltip.new(root, {
        labelText: `{satName}\nID: {satId}\nAltitude: {value}°\nTime (Local): {localTime}\nTime (UTC): {utcTime}`
      }));

      tooltip.get("background").setAll({
        fill: am5.color(0xCCFFFF),
        fillOpacity: 0.5
      });

      series.data.setAll(satelliteData);
    });

    chart.appear(800, 50);
    altitudeChart = root;
  });
}

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
  
  infoPanel.innerHTML = '';
  
  const card = document.createElement('div');
  card.style.padding = '15px';
  card.style.backgroundColor = '#f9f9f9';
  card.style.borderRadius = '8px';
  
  card.innerHTML = `
    <h3 style="margin-top: 0; padding-bottom: 10px; border-bottom: 2px solid ${color}; border-color: ${color};">${satelliteName}</h3>
    <div class="satellite-info-grid">
      <div class="satellite-info-column">
        <div class="satellite-info-row">
          <span class="satellite-info-label">Orbital Period:</span>
          <span class="satellite-info-value">${satData.orbital_period.toFixed(2)} min</span>
        </div>
        <div class="satellite-info-row">
          <span class="satellite-info-label">Inclination:</span>
          <span class="satellite-info-value">${satData.omm.INCLINATION}°</span>
        </div>
        <div class="satellite-info-row">
          <span class="satellite-info-label">Mean Motion:</span>
          <span class="satellite-info-value">${satData.omm.MEAN_MOTION.toFixed(5)} rev/day</span>
        </div>
      </div>
      <div class="satellite-info-column">
        <div class="satellite-info-row">
          <span class="satellite-info-label">Velocity:</span>
          <span class="satellite-info-value">${satData.average_velocity_km_s?.toFixed(3) ?? 'N/A'} km/s</span>
        </div>
        <div class="satellite-info-row">
          <span class="satellite-info-label">Time Step:</span>
          <span class="satellite-info-value">${satData.time_step_minutes?.toFixed(2) ?? 'N/A'} min</span>
        </div>
        <div class="satellite-info-row">
          <span class="satellite-info-label">Epoch:</span>
          <span class="satellite-info-value">${satData.omm.EPOCH}</span>
        </div>
      </div>
    </div>
  `;
  
  infoPanel.appendChild(card);
}

function updateMapForSatellite(satelliteName) {
  if (!allSatellitesData[satelliteName]) return;
  
  // ลบ orbit polylines เก่าออก
  satellitePolylines.forEach(layer => map.removeLayer(layer));
  satellitePolylines = [];
  
  // จัดการ current position markers - แสดงเฉพาะดวงที่เลือก
  currentPositionMarkers.forEach(marker => {
    // ดึงชื่อดาวเทียมจาก tooltip content
    const tooltipContent = marker.getTooltip()?.getContent() || '';
    const isSelectedSatellite = tooltipContent.includes(`<strong>${satelliteName} (NOW)</strong>`);
    
    if (isSelectedSatellite) {
      // แสดงดาวเทียมที่เลือก
      if (!map.hasLayer(marker)) {
        marker.addTo(map);
      }
    } else {
      // ซ่อนดาวเทียมอื่น
      if (map.hasLayer(marker)) {
        map.removeLayer(marker);
      }
    }
  });
  
  const satData = allSatellitesData[satelliteName];
  const { positions, color } = satData;
  
  // วาดจุดและเส้นของดาวเทียมที่เลือก
  positions.forEach((pt) => {
    const marker = L.circleMarker([pt.lat, pt.lon], {
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
  
  // วาดเส้นโคจร
  const segments = splitPolylineOnDateline(positions);
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

// ==================== DETAILED TABLE POPUP ====================
function showDetailedTable(satelliteName) {
  if (!allSatellitesData[satelliteName]) return;
  
  const satData = allSatellitesData[satelliteName];
  const timeResults = satData.timeResults;
  
  if (!timeResults || timeResults.length === 0) {
    alert('No detailed data available for this satellite');
    return;
  }
  
  // อัพเดทชื่อดาวเทียม
  document.getElementById('detailedSatelliteName').textContent = satelliteName;
  document.getElementById('detailedSatelliteName').style.borderBottom = `2px solid ${satData.color}`;
  
  // อัพเดทสี header ตาราง
  const tableHeader = document.querySelector('#detailedDataTable thead tr');
  tableHeader.style.background = satData.color;
  
  // สร้างข้อมูลในตาราง
  const tbody = document.getElementById('detailedTableBody');
  tbody.innerHTML = '';
  
  timeResults.forEach((timePoint) => {
    const sat = timePoint.satellites?.find(s => s.name === satelliteName);
    if (!sat) return;
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${timePoint.utc_time}</td>
      <td>${timePoint.local_time}</td>
      <td>${sat.altitude?.toFixed(2) ?? 'N/A'}</td>
      <td>${sat.azimuth?.toFixed(2) ?? 'N/A'}</td>
      <td>${sat.distance_km?.toFixed(2) ?? 'N/A'}</td>
      <td>${sat.sun_alt?.toFixed(2) ?? 'N/A'}</td>
    `;
    tbody.appendChild(row);
  });
  
  // อัพเดทจำนวนแถว
  document.getElementById('totalRecords').textContent = timeResults.length;
  
  // แสดง modal
  document.getElementById('detailedTableModal').style.display = 'flex';
}

function closeDetailedTable() {
  document.getElementById('detailedTableModal').style.display = 'none';
}

// ปิดเมื่อคลิกนอก modal
document.addEventListener('click', function(e) {
  const modal = document.getElementById('detailedTableModal');
  if (e.target === modal) {
    closeDetailedTable();
  }
});

window.closeDetailedTable = closeDetailedTable;

// ===== DOM READY EVENT =====
document.addEventListener('DOMContentLoaded', () => {
  
  document.querySelector('input[name="date"]').valueAsDate = new Date();

  // ===== EVENT LISTENERS SETUP =====
  
  // Search button
  const searchButton = document.getElementById('searchButton');
  if (searchButton) {
    searchButton.addEventListener('click', performSatelliteSearch);
  }

  // Random satellite button  
  const randomButton = document.getElementById('randomButton');
  if (randomButton) {
    randomButton.addEventListener('click', randomSatellite);
  }

  // Add to list button
  const addToListBtn = document.getElementById('addToListBtn');
  if (addToListBtn) {
    addToListBtn.addEventListener('click', addToList);
  }

  // Close modal
  const closeModal = document.getElementById('closeModal');
  if (closeModal) {
    closeModal.addEventListener('click', closeSearchModal);
  }

  // Search on Enter key
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('keypress', function(event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        performSatelliteSearch();
      }
    });
  }

  // Close modal when clicking outside
  window.addEventListener('click', function(event) {
    const modal = document.getElementById('searchModal');
    if (event.target === modal) {
      closeSearchModal();
    }
  });

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

  // ==================== FORM AND TABLE INITIALIZATION ====================
  const form = document.getElementById('satelliteForm');
  const resultsDiv = document.getElementById('results');

  const dateInput = document.querySelector('input[name="date"]');
  const today = new Date().toISOString().split('T')[0];
  dateInput.value = today;
  dateInput.min = today;

  // ==================== SATELLITE MANAGEMENT FUNCTIONS ====================
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
        
        // Add event listener to remove button
        const removeBtn = row.querySelector('.remove-btn');
        removeBtn.addEventListener('click', () => removeSatellite(index));
      });
    }
  }

  // Add satellite from manual TLE input
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

  // Remove satellite from list
  function removeSatellite(index) {
    if (index >= 0 && index < selectedSatellites.length) {
      const removedSat = selectedSatellites.splice(index, 1)[0];
      console.log(`Removed satellite: ${removedSat.name}`);
      updateSelectedSatellitesList();
    }
  }

  // Make functions available for this scope
  window.addToList = addToList;
  window.removeSatellite = removeSatellite;
  window.updateSelectedSatellitesList = updateSelectedSatellitesList;

  updateSelectedSatellitesList();

  // ==================== MAP HELPER FUNCTIONS ====================
  function getColors(count) {
    const colors = [];
    for (let i = 0; i < count; i++) {
      const hue = (i * 360 / count) % 360;
      colors.push(`hsl(${hue}, 80%, 60%)`);
    }
    return colors;
  }

  // ==================== CURRENT POSITION DISPLAY FUNCTION ====================
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

  // ==================== MAIN FORM SUBMIT HANDLER ====================
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (selectedSatellites.length === 0) {
      alert('Please select at least one satellite');
      return;
    }

    // Clear existing map data
    satellitePolylines.forEach(layer => map.removeLayer(layer));
    satellitePolylines = [];
    
    // Clear existing current position markers
    currentPositionMarkers.forEach(marker => map.removeLayer(marker));
    currentPositionMarkers = [];
    
    // Clear existing data
    allSatellitesData = {};

    const formData = new FormData(form);
    const lat = formData.get('lat');
    const lon = formData.get('lon');
    const date = formData.get('date');
    const startTime = formData.get('start_time');
    const endTime = formData.get('end_time');

    // Validation
    if (!lat || !lon || !date) {
      alert('Please fill in latitude, longitude, and date');
      return;
    }
    if (isNaN(parseFloat(lat)) || isNaN(parseFloat(lon))) {
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

      // Extract timezone information
      const timezone = result.timezone || 'Local Time';
      let offset = 0;

      // Method 1: Calculate from actual time difference
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

      // Method 2: Parse from string (fallback)
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
      
      // ==================== HANDLE CURRENT POSITIONS ====================
      if (result.current_positions && Array.isArray(result.current_positions)) {
        console.log('Current positions found:', result.current_positions.length);
        addCurrentPositionsToMap(result.current_positions, result.calculation_info);
      }

      // ==================== HANDLE ALTITUDE TABLE AND CHART ====================
      let timeResults = result.minute_results && Array.isArray(result.minute_results) ? result.minute_results :
                        result.hourly_results && Array.isArray(result.hourly_results) ? result.hourly_results :
                        result.data && Array.isArray(result.data) ? result.data :
                        Array.isArray(result) ? result : null;

      if (timeResults && timeResults.length > 0) {
        const tableWrapper = document.getElementById("tableWrapper");
        const satelliteInfoWrapper = document.getElementById("satellite-info-wrapper");
        
        if (tableWrapper) tableWrapper.style.display = 'flex';
        if (satelliteInfoWrapper) satelliteInfoWrapper.style.display = 'flex';
      }

      // ==================== HANDLE MAP VISUALIZATION ====================
      if (result.orbit_info && Array.isArray(result.orbit_info)) {
        const satelliteGrouped = {};
        const colors = getColors(result.orbit_info.length);
        
        // เก็บข้อมูลทั้งหมด
        result.orbit_info.forEach((sat, idx) => {
          if (!Array.isArray(sat.positions)) return;
          
          const time_step_minutes = (sat.positions.length >= 2) ?
            (new Date(sat.positions[1].datetime_utc) - new Date(sat.positions[0].datetime_utc)) / (60 * 1000) :
            null;

          const color = colors[idx];
          
          // เก็บข้อมูลไว้ใน global variable
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
              lat: pos.latitude,
              lon: pos.longitude,
              datetime_utc: pos.datetime_utc,
              datetime_local: pos.datetime_local,
              elevation_km: pos.elevation_km,
              orbital_velocity_km_s: sat.average_velocity_km_s
            }))
          };
          
          satelliteGrouped[sat.name] = allSatellitesData[sat.name];
        });

        // สร้างตารางแบบใหม่ - แสดงตำแหน่งปัจจุบัน (Current Position)
        const tableSection = document.getElementById('tableSection');
        if (tableSection && result.current_positions && result.current_positions.length > 0) {
          let tableHTML = '';
          
          // สร้าง map ของ current positions สำหรับการเข้าถึงง่าย
          const currentPosMap = {};
          result.current_positions.forEach(pos => {
            currentPosMap[pos.name] = pos;
          });
          
          tableHTML += '<table id="satelliteTable"><thead><tr>';
          tableHTML += '<th>Name</th><th>Time (UTC)</th><th>Time (Local)</th>';
          tableHTML += '<th>Latitude</th><th>Longitude</th><th>Elevation (km)</th>';
          tableHTML += '<th>Altitude</th><th>Azimuth</th><th>Actions</th>';
          tableHTML += '</tr></thead><tbody>';
          
          Object.entries(satelliteGrouped).forEach(([name, sat]) => {
            const color = sat.color;
            const currentPos = currentPosMap[name];
            
            if (currentPos) {
              
              tableHTML += `<tr data-satellite="${name}" style="border-left: 4px solid ${color}; cursor: pointer;" class="satellite-row">`;
              tableHTML += `<td><strong>${name}</strong></td>`;
              tableHTML += `<td>${currentPos.current_time_utc}</td>`;
              tableHTML += `<td>${currentPos.current_time_local}</td>`;
              tableHTML += `<td>${currentPos.latitude.toFixed(4)}°</td>`;
              tableHTML += `<td>${currentPos.longitude.toFixed(4)}°</td>`;
              tableHTML += `<td>${currentPos.elevation_km}</td>`;
              tableHTML += `<td>${currentPos.altitude_from_observer.toFixed(2)}°</td>`;
              tableHTML += `<td>${currentPos.azimuth_from_observer.toFixed(2)}°</td>`;
              tableHTML += `<td><button class="data-table-btn" data-satellite="${name}">Show All Data</button></td>`;
              tableHTML += '</tr>';
            }
          });
          
          tableHTML += '</tbody></table>';
          tableSection.innerHTML = tableHTML;

            // เพิ่ม event listener ให้กับแถว
            document.querySelectorAll('.satellite-row').forEach(row => {
              row.addEventListener('click', function() {
                const satName = this.getAttribute('data-satellite');
                showSatelliteData(satName);
              });
            });

            // เพิ่ม event listener สำหรับปุ่ม Show All Data
            document.querySelectorAll('.data-table-btn').forEach(button => {
              button.addEventListener('click', function(e) {
                e.stopPropagation();
                const satName = this.getAttribute('data-satellite');
                showDetailedTable(satName);
              });
            });
          
          // เพิ่ม event listener ให้กับแถว
          document.querySelectorAll('.satellite-row').forEach(row => {
            row.addEventListener('click', function() {
              const satName = this.getAttribute('data-satellite');
              showSatelliteData(satName);
            });
          });
        }

        // ไม่วาดวงโคจรทันที - จะวาดเมื่อเลือกดาวเทียม
        
        // แสดงดาวเทียมดวงแรกทันที
        const firstSatellite = Object.keys(satelliteGrouped)[0];
        if (firstSatellite) {
          showSatelliteData(firstSatellite);
        }
      }

    } catch (error) {
      console.error('Error:', error.message);
      await handleAuthError(error);
    }
  });

});

// ==================== SATELLITE SEARCH FUNCTIONALITY ====================
async function performSatelliteSearch() {
  const searchTerm = document.getElementById('searchInput').value.trim();
  const modal = document.getElementById('searchModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalResults = document.getElementById('modalResults');

  if (!searchTerm) {
    alert('Please enter a search term');
    return;
  }

  modalTitle.textContent = 'Searching...';
  modalResults.innerHTML = '<div>Searching for satellites...</div>';
  modal.style.display = 'block';

  try {
    console.log('Searching satellites with authentication...');
    
    const data = await searchSatellitesAPI(searchTerm);

    modalTitle.textContent = `Search Results (${data.satellites.length} found)`;
    
    if (data.satellites.length === 0) {
      modalResults.innerHTML = '<div>No satellites found</div>';
    } else {
      let html = '';
      data.satellites.forEach((satellite, index) => {
        const satelliteName = satellite.OBJECT_NAME || satellite.TLE_LINE0 || 'Unknown';
        const line1 = satellite.TLE_LINE1 || '';
        const line2 = satellite.TLE_LINE2 || '';
        const tleDisplay = `${line1}\n${line2}`;
        
        html += `
          <div class="satellite-item-with-button">
            <div class="satellite-content">
              <div class="satellite-name">${satelliteName}</div>
              <div class="satellite-tle">${tleDisplay}</div>
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

// Make functions available globally
window.performSatelliteSearch = performSatelliteSearch;
window.searchSatellites = performSatelliteSearch;
window.selectSatelliteFromSearch = selectSatelliteFromSearch;
window.closeSearchModal = closeSearchModal;
window.randomSatellite = randomSatellite;
window.showSatelliteData = showSatelliteData;