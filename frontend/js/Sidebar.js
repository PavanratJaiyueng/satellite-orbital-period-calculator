export function createSidebarHTML() {
  return `
    <section id="formSection">
    <h1>satellite tracking</h1>
      <form id="satelliteForm">
        <label>Latitude (Decimal): 
          <input type="number" name="lat" step="any" required value="18.85249" />
        </label>
        
        <label>Longitude (Decimal): 
          <input type="number" name="lon" step="any" required value="98.95748" />
        </label>
        
        <label>Date (Local): 
          <input type="date" name="date" required />
        </label>

        <label>Start Time (Local): 
          <input type="time" name="start_time" />
        </label>

        <label>End Time (Local): 
          <input type="time" name="end_time" />
        </label>
       
        <!-- Search section with dropdown -->
        <div class="search-container">
          <label>Search Satellite from Database:</label>
          <div class="search-type-wrapper">
            <select id="searchType" name="searchType">
              <option value="name">Search by Name</option>
              <option value="norad">Search by NORAD ID</option>
            </select>
          </div>
          <div class="search-input-wrapper">
            <input type="text" id="searchInput" placeholder="Enter satellite name...">
            <button type="button" id="searchButton">🔍 Search</button>
          </div>
        </div>
       
        <!-- Random Satellite Button - Separate -->
        <button type="button" id="randomButton" class="random-btn">🎲 Random Satellite</button>
       
        <label>TLE:
          <textarea name="tleTextarea" placeholder="Name&#10;1st line&#10;2nd line"></textarea>
          <button type="button" id="addToListBtn" class="add-to-list-btn">Add to List</button>
        </label>

        <!-- Selected Satellites Section -->
        <div id="selectedSatellitesSection">
          <h3>Selected Satellites Table</h3>
          <div class="table-container">
            <table id="selectedSatellites" border="1">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <!-- จะถูกเติมด้วย JavaScript -->
              </tbody>
            </table>
          </div>
        </div>

        <div class="btn-wrapper">
          <button type="submit" class="calculate-btn">Calculate</button>
        </div>
      </form>
    </section>
  `;
}

// ฟังก์ชันสำหรับโหลด sidebar เข้าสู่ DOM
export function initSidebar() {
  const sidebarElement = document.getElementById('sidebar');
  if (sidebarElement) {
    sidebarElement.innerHTML = createSidebarHTML();
    console.log('✅ Sidebar loaded successfully');
    
    // เพิ่ม event listener สำหรับเปลี่ยน placeholder
    const searchTypeSelect = document.getElementById('searchType');
    const searchInput = document.getElementById('searchInput');
    
    if (searchTypeSelect && searchInput) {
      searchTypeSelect.addEventListener('change', function() {
        if (this.value === 'norad') {
          searchInput.placeholder = 'Enter NORAD ID...';
          console.log('Search mode changed to: NORAD ID');
        } else {
          searchInput.placeholder = 'Enter satellite name...';
          console.log('Search mode changed to: Name');
        }
      });
      
      console.log('✅ Search type selector initialized');
    } else {
      console.warn('⚠️ Search type selector or input not found');
    }
  } else {
    console.error('❌ Sidebar element not found');
  }
}

// ฟังก์ชันสำหรับ toggle sidebar (optional - ถ้าต้องการควบคุมจาก external)
export function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('toggleSidebar');
  
  if (sidebar && toggleBtn) {
    sidebar.classList.toggle('collapsed');
    toggleBtn.classList.toggle('sidebar-collapsed');
    
    console.log('Sidebar toggled:', sidebar.classList.contains('collapsed') ? 'collapsed' : 'expanded');
    
    // Trigger map resize
    setTimeout(() => {
      if (window.map && typeof window.map.invalidateSize === 'function') {
        window.map.invalidateSize();
        console.log('Map resized after sidebar toggle');
      }
    }, 350);
  } else {
    console.warn('⚠️ Sidebar or toggle button not found');
  }
}

// Export functions for global access
if (typeof window !== 'undefined') {
  window.initSidebar = initSidebar;
  window.toggleSidebar = toggleSidebar;
}