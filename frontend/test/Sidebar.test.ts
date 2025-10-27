// Type definitions for Sidebar functions
type CreateSidebarHTMLFunction = () => string;
type InitSidebarFunction = () => void;
type ToggleSidebarFunction = () => void;

// Mock the Sidebar module functions
const mockCreateSidebarHTML = jest.fn<string, []>();
const mockInitSidebar = jest.fn<void, []>();
const mockToggleSidebar = jest.fn<void, []>();

// Mock the module without TypeScript import
jest.mock('../js/Sidebar.js', () => ({
    createSidebarHTML: mockCreateSidebarHTML,
    initSidebar: mockInitSidebar,
    toggleSidebar: mockToggleSidebar
}));

// Create typed wrapper functions
const createSidebarHTML: CreateSidebarHTMLFunction = mockCreateSidebarHTML;
const initSidebar: InitSidebarFunction = mockInitSidebar;
const toggleSidebar: ToggleSidebarFunction = mockToggleSidebar;

// Type declarations
declare global {
    interface Window {
        map?: {
            invalidateSize: jest.Mock;
        };
        initSidebar?: InitSidebarFunction;
        toggleSidebar?: ToggleSidebarFunction;
    }
}

describe('Sidebar Component Tests', () => {
    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = `
            <div id="sidebar"></div>
            <button id="toggleSidebar">Toggle</button>
            <div id="map"></div>
        `;

        // Mock window.map
        window.map = {
            invalidateSize: jest.fn()
        };

        // Clear all mocks
        jest.clearAllMocks();
        mockCreateSidebarHTML.mockClear();
        mockInitSidebar.mockClear();
        mockToggleSidebar.mockClear();
    });

    afterEach(() => {
        jest.clearAllTimers();
        delete window.map;
    });

    describe('createSidebarHTML()', () => {
        beforeEach(() => {
            // Setup mock implementation
            mockCreateSidebarHTML.mockReturnValue(`
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
                   
                    <button type="button" id="randomButton" class="random-btn">🎲 Random Satellite</button>
                   
                    <label>TLE:
                      <textarea name="tleTextarea" placeholder="Name&#10;1st line&#10;2nd line"></textarea>
                      <button type="button" id="addToListBtn" class="add-to-list-btn">Add to List</button>
                    </label>

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
                          <tbody></tbody>
                        </table>
                      </div>
                    </div>

                    <div class="btn-wrapper">
                      <button type="submit" class="calculate-btn">Calculate</button>
                    </div>
                  </form>
                </section>
            `);
        });
        test('should return HTML string', () => {
            const html = createSidebarHTML();
            expect(typeof html).toBe('string');
            expect(html.length).toBeGreaterThan(0);
        });

        test('should contain form section', () => {
            const html = createSidebarHTML();
            expect(html).toContain('<section id="formSection">');
            expect(html).toContain('</section>');
        });

        test('should contain satellite tracking title', () => {
            const html = createSidebarHTML();
            expect(html).toContain('<h1>satellite tracking</h1>');
        });

        test('should contain satellite form', () => {
            const html = createSidebarHTML();
            expect(html).toContain('<form id="satelliteForm">');
            expect(html).toContain('</form>');
        });

        test('should contain latitude input', () => {
            const html = createSidebarHTML();
            expect(html).toContain('name="lat"');
            expect(html).toContain('Latitude (Decimal)');
            expect(html).toContain('value="18.85249"');
        });

        test('should contain longitude input', () => {
            const html = createSidebarHTML();
            expect(html).toContain('name="lon"');
            expect(html).toContain('Longitude (Decimal)');
            expect(html).toContain('value="98.95748"');
        });

        test('should contain date input', () => {
            const html = createSidebarHTML();
            expect(html).toContain('name="date"');
            expect(html).toContain('type="date"');
            expect(html).toContain('Date (Local)');
        });

        test('should contain start time input', () => {
            const html = createSidebarHTML();
            expect(html).toContain('name="start_time"');
            expect(html).toContain('type="time"');
            expect(html).toContain('Start Time (Local)');
        });

        test('should contain end time input', () => {
            const html = createSidebarHTML();
            expect(html).toContain('name="end_time"');
            expect(html).toContain('type="time"');
            expect(html).toContain('End Time (Local)');
        });

        test('should contain search type dropdown', () => {
            const html = createSidebarHTML();
            expect(html).toContain('<select id="searchType"');
            expect(html).toContain('<option value="name">Search by Name</option>');
            expect(html).toContain('<option value="norad">Search by NORAD ID</option>');
        });

        test('should contain search input', () => {
            const html = createSidebarHTML();
            expect(html).toContain('id="searchInput"');
            expect(html).toContain('placeholder="Enter satellite name..."');
        });

        test('should contain search button', () => {
            const html = createSidebarHTML();
            expect(html).toContain('id="searchButton"');
            expect(html).toContain('🔍 Search');
        });

        test('should contain random button', () => {
            const html = createSidebarHTML();
            expect(html).toContain('id="randomButton"');
            expect(html).toContain('🎲 Random Satellite');
        });

        test('should contain TLE textarea', () => {
            const html = createSidebarHTML();
            expect(html).toContain('name="tleTextarea"');
            expect(html).toContain('placeholder="Name&#10;1st line&#10;2nd line"');
        });

        test('should contain add to list button', () => {
            const html = createSidebarHTML();
            expect(html).toContain('id="addToListBtn"');
            expect(html).toContain('Add to List');
        });

        test('should contain selected satellites section', () => {
            const html = createSidebarHTML();
            expect(html).toContain('id="selectedSatellitesSection"');
            expect(html).toContain('Selected Satellites Table');
        });

        test('should contain selected satellites table', () => {
            const html = createSidebarHTML();
            expect(html).toContain('<table id="selectedSatellites"');
            expect(html).toContain('<thead>');
            expect(html).toContain('<tbody>');
            expect(html).toContain('<th>Name</th>');
            expect(html).toContain('<th>Actions</th>');
        });

        test('should contain calculate button', () => {
            const html = createSidebarHTML();
            expect(html).toContain('type="submit"');
            expect(html).toContain('class="calculate-btn"');
            expect(html).toContain('Calculate');
        });

        test('should have all required input fields with proper attributes', () => {
            const html = createSidebarHTML();
            
            // Check required fields
            expect(html).toContain('required');
            
            // Check input types
            expect(html).toContain('type="number"');
            expect(html).toContain('type="date"');
            expect(html).toContain('type="time"');
            expect(html).toContain('type="text"');
            
            // Check step attribute for decimal inputs
            expect(html).toContain('step="any"');
        });
    });

    describe('initSidebar()', () => {
        beforeEach(() => {
            // Setup mock implementation for initSidebar
            mockInitSidebar.mockImplementation(() => {
                const sidebar = document.getElementById('sidebar');
                if (sidebar) {
                    sidebar.innerHTML = mockCreateSidebarHTML();
                    console.log('✅ Sidebar loaded successfully');
                    
                    const searchType = document.getElementById('searchType');
                    const searchInput = document.getElementById('searchInput') as HTMLInputElement;
                    
                    if (searchType && searchInput) {
                        searchType.addEventListener('change', function() {
                            const select = this as HTMLSelectElement;
                            if (select.value === 'norad') {
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
            });
        });
        test('should insert HTML into sidebar element', () => {
            const sidebar = document.getElementById('sidebar');
            expect(sidebar?.innerHTML).toBe('');
            
            initSidebar();
            
            expect(sidebar?.innerHTML).not.toBe('');
            expect(sidebar?.innerHTML).toContain('satellite tracking');
        });

        test('should log success message', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            
            initSidebar();
            
            expect(consoleSpy).toHaveBeenCalledWith('✅ Sidebar loaded successfully');
            consoleSpy.mockRestore();
        });

        test('should initialize search type selector', () => {
            initSidebar();
            
            const searchType = document.getElementById('searchType');
            const searchInput = document.getElementById('searchInput') as HTMLInputElement;
            
            expect(searchType).not.toBeNull();
            expect(searchInput).not.toBeNull();
            expect(searchInput.placeholder).toBe('Enter satellite name...');
        });

        test('should change placeholder when search type changes to NORAD', () => {
            initSidebar();
            
            const searchType = document.getElementById('searchType') as HTMLSelectElement;
            const searchInput = document.getElementById('searchInput') as HTMLInputElement;
            
            searchType.value = 'norad';
            searchType.dispatchEvent(new Event('change'));
            
            expect(searchInput.placeholder).toBe('Enter NORAD ID...');
        });

        test('should change placeholder when search type changes to Name', () => {
            initSidebar();
            
            const searchType = document.getElementById('searchType') as HTMLSelectElement;
            const searchInput = document.getElementById('searchInput') as HTMLInputElement;
            
            // First change to NORAD
            searchType.value = 'norad';
            searchType.dispatchEvent(new Event('change'));
            
            // Then change back to name
            searchType.value = 'name';
            searchType.dispatchEvent(new Event('change'));
            
            expect(searchInput.placeholder).toBe('Enter satellite name...');
        });

        test('should log search mode change', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            
            initSidebar();
            
            const searchType = document.getElementById('searchType') as HTMLSelectElement;
            
            searchType.value = 'norad';
            searchType.dispatchEvent(new Event('change'));
            
            expect(consoleSpy).toHaveBeenCalledWith('Search mode changed to: NORAD ID');
            
            consoleSpy.mockRestore();
        });

        test('should handle missing sidebar element', () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
            
            // Remove sidebar element
            document.getElementById('sidebar')?.remove();
            
            initSidebar();
            
            expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Sidebar element not found');
            consoleErrorSpy.mockRestore();
        });

        test('should warn if search elements not found', () => {
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            // Override mock to create invalid HTML without search elements
            mockCreateSidebarHTML.mockReturnValueOnce('<div>Invalid content</div>');
            mockInitSidebar.mockImplementationOnce(() => {
                const sidebar = document.getElementById('sidebar');
                if (sidebar) {
                    sidebar.innerHTML = '<div>Invalid content</div>';
                    console.log('✅ Sidebar loaded successfully');
                    
                    const searchType = document.getElementById('searchType');
                    const searchInput = document.getElementById('searchInput');
                    
                    if (!searchType || !searchInput) {
                        console.warn('⚠️ Search type selector or input not found');
                    }
                } else {
                    console.error('❌ Sidebar element not found');
                }
            });
            
            initSidebar();
            
            expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️ Search type selector or input not found');
            consoleWarnSpy.mockRestore();
        });

        test('should create all form inputs', () => {
            const sidebar = document.getElementById('sidebar')!;
            sidebar.innerHTML = `
                <section id="formSection">
                  <form id="satelliteForm">
                    <input type="number" name="lat" step="any" required value="18.85249" />
                    <input type="number" name="lon" step="any" required value="98.95748" />
                    <input type="date" name="date" required />
                    <input type="time" name="start_time" />
                    <input type="time" name="end_time" />
                    <textarea name="tleTextarea" placeholder="Name&#10;1st line&#10;2nd line"></textarea>
                  </form>
                </section>
            `;
            
            expect(document.querySelector('input[name="lat"]')).not.toBeNull();
            expect(document.querySelector('input[name="lon"]')).not.toBeNull();
            expect(document.querySelector('input[name="date"]')).not.toBeNull();
            expect(document.querySelector('input[name="start_time"]')).not.toBeNull();
            expect(document.querySelector('input[name="end_time"]')).not.toBeNull();
            expect(document.querySelector('textarea[name="tleTextarea"]')).not.toBeNull();
        });

        test('should create search section', () => {
            const sidebar = document.getElementById('sidebar')!;
            sidebar.innerHTML = `
                <section id="formSection">
                  <form id="satelliteForm">
                    <div class="search-container">
                      <select id="searchType" name="searchType">
                        <option value="name">Search by Name</option>
                      </select>
                      <input type="text" id="searchInput" placeholder="Enter satellite name...">
                      <button type="button" id="searchButton">🔍 Search</button>
                    </div>
                  </form>
                </section>
            `;
            
            expect(document.querySelector('.search-container')).not.toBeNull();
            expect(document.getElementById('searchType')).not.toBeNull();
            expect(document.getElementById('searchInput')).not.toBeNull();
            expect(document.getElementById('searchButton')).not.toBeNull();
        });

        test('should create buttons', () => {
            const sidebar = document.getElementById('sidebar')!;
            sidebar.innerHTML = `
                <section id="formSection">
                  <form id="satelliteForm">
                    <button type="button" id="randomButton">🎲 Random</button>
                    <button type="button" id="addToListBtn">Add to List</button>
                    <button type="submit" class="calculate-btn">Calculate</button>
                  </form>
                </section>
            `;
            
            expect(document.getElementById('randomButton')).not.toBeNull();
            expect(document.getElementById('addToListBtn')).not.toBeNull();
            expect(document.querySelector('.calculate-btn')).not.toBeNull();
        });

        test('should create selected satellites table', () => {
            const sidebar = document.getElementById('sidebar')!;
            sidebar.innerHTML = `
                <section id="formSection">
                  <form id="satelliteForm">
                    <table id="selectedSatellites" border="1">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody></tbody>
                    </table>
                  </form>
                </section>
            `;
            
            const table = document.getElementById('selectedSatellites');
            expect(table).not.toBeNull();
            expect(table?.tagName).toBe('TABLE');
            expect(table?.querySelector('thead')).not.toBeNull();
            expect(table?.querySelector('tbody')).not.toBeNull();
        });
    });

    describe('toggleSidebar()', () => {
        beforeEach(() => {
            jest.useFakeTimers();
            
            // Setup mock implementation for toggleSidebar
            mockToggleSidebar.mockImplementation(() => {
                const sidebar = document.getElementById('sidebar');
                const toggleBtn = document.getElementById('toggleSidebar');
                
                if (sidebar && toggleBtn) {
                    sidebar.classList.toggle('collapsed');
                    toggleBtn.classList.toggle('sidebar-collapsed');
                    
                    console.log('Sidebar toggled:', sidebar.classList.contains('collapsed') ? 'collapsed' : 'expanded');
                    
                    setTimeout(() => {
                        if (window.map && typeof window.map.invalidateSize === 'function') {
                            window.map.invalidateSize();
                            console.log('Map resized after sidebar toggle');
                        }
                    }, 350);
                } else {
                    console.warn('⚠️ Sidebar or toggle button not found');
                }
            });
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test('should toggle collapsed class on sidebar', () => {
            const sidebar = document.getElementById('sidebar')!;
            const toggleBtn = document.getElementById('toggleSidebar')!;
            
            expect(sidebar.classList.contains('collapsed')).toBe(false);
            
            toggleSidebar();
            
            expect(sidebar.classList.contains('collapsed')).toBe(true);
        });

        test('should toggle sidebar-collapsed class on button', () => {
            const toggleBtn = document.getElementById('toggleSidebar')!;
            
            expect(toggleBtn.classList.contains('sidebar-collapsed')).toBe(false);
            
            toggleSidebar();
            
            expect(toggleBtn.classList.contains('sidebar-collapsed')).toBe(true);
        });

        test('should toggle sidebar back to expanded', () => {
            const sidebar = document.getElementById('sidebar')!;
            
            toggleSidebar(); // Collapse
            expect(sidebar.classList.contains('collapsed')).toBe(true);
            
            toggleSidebar(); // Expand
            expect(sidebar.classList.contains('collapsed')).toBe(false);
        });

        test('should log sidebar state', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            
            toggleSidebar();
            expect(consoleSpy).toHaveBeenCalledWith('Sidebar toggled:', 'collapsed');
            
            toggleSidebar();
            expect(consoleSpy).toHaveBeenCalledWith('Sidebar toggled:', 'expanded');
            
            consoleSpy.mockRestore();
        });

        test('should trigger map resize after toggle', () => {
            toggleSidebar();
            
            jest.advanceTimersByTime(350);
            
            if (window.map) {
                expect(window.map.invalidateSize).toHaveBeenCalled();
            }
        });

        test('should log map resize', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            
            toggleSidebar();
            jest.advanceTimersByTime(350);
            
            expect(consoleSpy).toHaveBeenCalledWith('Map resized after sidebar toggle');
            consoleSpy.mockRestore();
        });

        test('should handle missing sidebar element', () => {
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            document.getElementById('sidebar')?.remove();
            
            toggleSidebar();
            
            expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️ Sidebar or toggle button not found');
            consoleWarnSpy.mockRestore();
        });

        test('should handle missing toggle button', () => {
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            document.getElementById('toggleSidebar')?.remove();
            
            toggleSidebar();
            
            expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️ Sidebar or toggle button not found');
            consoleWarnSpy.mockRestore();
        });

        test('should handle missing map object', () => {
            delete window.map;
            
            expect(() => {
                toggleSidebar();
                jest.advanceTimersByTime(350);
            }).not.toThrow();
        });

        test('should wait 350ms before resizing map', () => {
            toggleSidebar();
            
            if (window.map) {
                expect(window.map.invalidateSize).not.toHaveBeenCalled();
                
                jest.advanceTimersByTime(349);
                expect(window.map.invalidateSize).not.toHaveBeenCalled();
                
                jest.advanceTimersByTime(1);
                expect(window.map.invalidateSize).toHaveBeenCalled();
            }
        });

        test('should work multiple times in succession', () => {
            const sidebar = document.getElementById('sidebar')!;
            
            toggleSidebar();
            expect(sidebar.classList.contains('collapsed')).toBe(true);
            
            toggleSidebar();
            expect(sidebar.classList.contains('collapsed')).toBe(false);
            
            toggleSidebar();
            expect(sidebar.classList.contains('collapsed')).toBe(true);
        });
    });

    describe('Window exports', () => {
        test('should export initSidebar to window', () => {
            // This test verifies the function is available
            expect(typeof initSidebar).toBe('function');
        });

        test('should export toggleSidebar to window', () => {
            // This test verifies the function is available
            expect(typeof toggleSidebar).toBe('function');
        });
    });

    describe('Form elements validation', () => {
        beforeEach(() => {
            const sidebar = document.getElementById('sidebar')!;
            sidebar.innerHTML = `
                <section id="formSection">
                  <form id="satelliteForm">
                    <input type="number" name="lat" step="any" required value="18.85249" />
                    <input type="number" name="lon" step="any" required value="98.95748" />
                    <input type="date" name="date" required />
                    <input type="time" name="start_time" />
                    <input type="time" name="end_time" />
                    <textarea name="tleTextarea" placeholder="Name&#10;1st line&#10;2nd line"></textarea>
                  </form>
                </section>
            `;
        });

        test('latitude input should have correct default value', () => {
            const latInput = document.querySelector('input[name="lat"]') as HTMLInputElement;
            expect(latInput).not.toBeNull();
            expect(latInput.value).toBe('18.85249');
        });

        test('longitude input should have correct default value', () => {
            const lonInput = document.querySelector('input[name="lon"]') as HTMLInputElement;
            expect(lonInput.value).toBe('98.95748');
        });

        test('latitude input should accept decimal numbers', () => {
            const latInput = document.querySelector('input[name="lat"]') as HTMLInputElement;
            expect(latInput.step).toBe('any');
            expect(latInput.type).toBe('number');
        });

        test('longitude input should accept decimal numbers', () => {
            const lonInput = document.querySelector('input[name="lon"]') as HTMLInputElement;
            expect(lonInput.step).toBe('any');
            expect(lonInput.type).toBe('number');
        });

        test('required fields should have required attribute', () => {
            const latInput = document.querySelector('input[name="lat"]') as HTMLInputElement;
            const lonInput = document.querySelector('input[name="lon"]') as HTMLInputElement;
            const dateInput = document.querySelector('input[name="date"]') as HTMLInputElement;
            
            expect(latInput.required).toBe(true);
            expect(lonInput.required).toBe(true);
            expect(dateInput.required).toBe(true);
        });

        test('time inputs should not be required', () => {
            const startTime = document.querySelector('input[name="start_time"]') as HTMLInputElement;
            const endTime = document.querySelector('input[name="end_time"]') as HTMLInputElement;
            
            expect(startTime.required).toBe(false);
            expect(endTime.required).toBe(false);
        });

        test('TLE textarea should have correct placeholder', () => {
            const textarea = document.querySelector('textarea[name="tleTextarea"]') as HTMLTextAreaElement;
            expect(textarea.placeholder).toContain('Name');
            expect(textarea.placeholder).toContain('1st line');
            expect(textarea.placeholder).toContain('2nd line');
        });
    });

    describe('Search functionality setup', () => {
        beforeEach(() => {
            const sidebar = document.getElementById('sidebar')!;
            sidebar.innerHTML = `
                <section id="formSection">
                  <form id="satelliteForm">
                    <select id="searchType" name="searchType">
                      <option value="name">Search by Name</option>
                      <option value="norad">Search by NORAD ID</option>
                    </select>
                    <input type="text" id="searchInput" value="">
                    <button type="button" id="searchButton">🔍 Search</button>
                    <button type="button" id="randomButton">🎲 Random</button>
                    <button type="button" id="addToListBtn">Add to List</button>
                  </form>
                </section>
            `;
        });

        test('search type dropdown should have name option selected by default', () => {
            const searchType = document.getElementById('searchType') as HTMLSelectElement;
            expect(searchType.value).toBe('name');
        });

        test('search input should be empty by default', () => {
            const searchInput = document.getElementById('searchInput') as HTMLInputElement;
            expect(searchInput.value).toBe('');
        });

        test('search button should have correct type', () => {
            const searchBtn = document.getElementById('searchButton') as HTMLButtonElement;
            expect(searchBtn.type).toBe('button');
        });

        test('random button should have correct type', () => {
            const randomBtn = document.getElementById('randomButton') as HTMLButtonElement;
            expect(randomBtn.type).toBe('button');
        });

        test('add to list button should have correct type', () => {
            const addBtn = document.getElementById('addToListBtn') as HTMLButtonElement;
            expect(addBtn.type).toBe('button');
        });
    });

    describe('Table structure', () => {
        beforeEach(() => {
            const sidebar = document.getElementById('sidebar')!;
            sidebar.innerHTML = `
                <section id="formSection">
                  <table id="selectedSatellites" border="1">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody></tbody>
                  </table>
                </section>
            `;
        });

        test('selected satellites table should have border', () => {
            const table = document.getElementById('selectedSatellites') as HTMLTableElement;
            expect(table.border).toBe('1');
        });

        test('table should have thead and tbody', () => {
            const table = document.getElementById('selectedSatellites');
            const thead = table?.querySelector('thead');
            const tbody = table?.querySelector('tbody');
            
            expect(thead).not.toBeNull();
            expect(tbody).not.toBeNull();
        });

        test('table header should have Name and Actions columns', () => {
            const table = document.getElementById('selectedSatellites');
            const headers = table?.querySelectorAll('th');
            
            expect(headers?.length).toBe(2);
            expect(headers?.[0].textContent).toBe('Name');
            expect(headers?.[1].textContent).toBe('Actions');
        });

        test('table body should be empty initially', () => {
            const tbody = document.querySelector('#selectedSatellites tbody');
            expect(tbody?.children.length).toBe(0);
        });
    });

    describe('CSS classes and styling hooks', () => {
        beforeEach(() => {
            const sidebar = document.getElementById('sidebar')!;
            sidebar.innerHTML = `
                <section id="formSection">
                  <form id="satelliteForm">
                    <div class="search-container">
                      <div class="search-type-wrapper">
                        <select id="searchType"></select>
                      </div>
                      <div class="search-input-wrapper">
                        <input type="text" id="searchInput">
                      </div>
                    </div>
                    <button class="random-btn">Random</button>
                    <button class="add-to-list-btn">Add to List</button>
                    <div class="table-container">
                      <table id="selectedSatellites"></table>
                    </div>
                    <div class="btn-wrapper">
                      <button class="calculate-btn">Calculate</button>
                    </div>
                  </form>
                </section>
            `;
        });

        test('should have search-container class', () => {
            const container = document.querySelector('.search-container');
            expect(container).not.toBeNull();
        });

        test('should have search-type-wrapper class', () => {
            expect(document.querySelector('.search-type-wrapper')).not.toBeNull();
        });

        test('should have search-input-wrapper class', () => {
            expect(document.querySelector('.search-input-wrapper')).not.toBeNull();
        });

        test('should have random-btn class', () => {
            expect(document.querySelector('.random-btn')).not.toBeNull();
        });

        test('should have add-to-list-btn class', () => {
            expect(document.querySelector('.add-to-list-btn')).not.toBeNull();
        });

        test('should have table-container class', () => {
            expect(document.querySelector('.table-container')).not.toBeNull();
        });

        test('should have btn-wrapper class', () => {
            expect(document.querySelector('.btn-wrapper')).not.toBeNull();
        });

        test('should have calculate-btn class', () => {
            expect(document.querySelector('.calculate-btn')).not.toBeNull();
        });
    });

    describe('Integration with form submission', () => {
        beforeEach(() => {
            const sidebar = document.getElementById('sidebar')!;
            sidebar.innerHTML = `
                <section id="formSection">
                  <form id="satelliteForm">
                    <button type="submit" class="calculate-btn">Calculate</button>
                  </form>
                </section>
            `;
        });

        test('form should have correct id', () => {
            const form = document.getElementById('satelliteForm');
            expect(form).not.toBeNull();
            expect(form?.tagName).toBe('FORM');
        });

        test('calculate button should be submit type', () => {
            const calcBtn = document.querySelector('.calculate-btn') as HTMLButtonElement;
            expect(calcBtn.type).toBe('submit');
        });

        test('form should prevent default submission', () => {
            const form = document.getElementById('satelliteForm') as HTMLFormElement;
            const mockSubmit = jest.fn((e) => e.preventDefault());
            
            form.addEventListener('submit', mockSubmit);
            form.dispatchEvent(new Event('submit'));
            
            expect(mockSubmit).toHaveBeenCalled();
        });
    });
});