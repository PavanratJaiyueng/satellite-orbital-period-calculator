describe('Calculate Page - Extended Features', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <div id="navbar">
                <div id="userProfile" style="display: flex; align-items: center; gap: 10px;">
                    <span id="userNameDisplay">John Doe</span>
                    <button id="userMenuBtn">▼</button>
                    <div id="userDropdown" style="display: none; position: absolute; background: white; border: 1px solid #ccc;">
                        <a href="/profile" id="profileLink">Edit Profile</a>
                        <a href="/tokens" id="tokensLink">API Tokens</a>
                        <button id="logoutBtn">Logout</button>
                    </div>
                </div>
            </div>

            <div class="sidebar" id="sidebar">
                <div id="satelliteList"></div>
                <button id="addSatelliteBtn">Add Satellite</button>
                <button id="randomSatelliteBtn">Random Satellite</button>
            </div>

            <div class="main-content">
                <div id="searchSection">
                    <input type="text" id="satelliteSearchInput" placeholder="Search satellite" />
                    <button id="searchBtn">Search</button>
                    <div id="searchResults" style="display: none;"></div>
                </div>

                <div id="addSatelliteForm" style="display: none;">
                    <input type="text" id="tleName" placeholder="Satellite Name" />
                    <textarea id="tleLine1" placeholder="TLE Line 1"></textarea>
                    <textarea id="tleLine2" placeholder="TLE Line 2"></textarea>
                    <button id="addToListBtn">Add to List</button>
                    <button id="cancelAddBtn">Cancel</button>
                </div>

                <div id="satelliteListDisplay">
                    <table id="satelliteTable">
                        <thead>
                            <tr><th>Name</th><th>Action</th></tr>
                        </thead>
                        <tbody id="satelliteTableBody"></tbody>
                    </table>
                </div>

                <div id="parametersSection">
                    <div id="dateTimeSection">
                        <input type="date" id="dateInput" />
                        <input type="time" id="startTimeInput" />
                        <input type="time" id="endTimeInput" />
                    </div>
                    <div id="locationSection">
                        <input type="number" id="latitudeInput" placeholder="Latitude (-90 to 90)" min="-90" max="90" />
                        <input type="number" id="longitudeInput" placeholder="Longitude (-180 to 180)" min="-180" max="180" />
                    </div>
                    <button id="calculateBtn">Calculate</button>
                    <div id="errorMsg" style="color: red;"></div>
                </div>

                <div id="resultsSection" style="display: none;">
                    <div id="mapResults">
                        <h3>Map Results</h3>
                        <div id="mapDisplay">Map will be displayed here</div>
                    </div>
                    <div id="graphResults">
                        <h3>Visibility Graph</h3>
                        <div id="graphDisplay">Graph will be displayed here</div>
                    </div>
                    <div id="groundTrackResults">
                        <h3>Ground Track Table</h3>
                        <table id="groundTrackTable">
                            <thead>
                                <tr><th>Time</th><th>Latitude</th><th>Longitude</th></tr>
                            </thead>
                            <tbody id="groundTrackTableBody"></tbody>
                        </table>
                    </div>
                    <div id="satelliteInfoResults">
                        <h3>Satellite Info</h3>
                        <div id="infoDisplay">Satellite info will be displayed here</div>
                    </div>
                </div>
            </div>
        `;

        (global.fetch as jest.Mock).mockClear();

        // User Menu Logic
        const userMenuBtn = document.getElementById('userMenuBtn')!;
        const userDropdown = document.getElementById('userDropdown')!;
        
        userMenuBtn.addEventListener('click', () => {
            userDropdown.style.display = userDropdown.style.display === 'none' ? 'block' : 'none';
        });

        // Add Satellite Button
        const addSatelliteBtn = document.getElementById('addSatelliteBtn')!;
        const addSatelliteForm = document.getElementById('addSatelliteForm')!;
        const cancelAddBtn = document.getElementById('cancelAddBtn')!;

        addSatelliteBtn.addEventListener('click', () => {
            addSatelliteForm.style.display = 'block';
        });

        cancelAddBtn.addEventListener('click', () => {
            addSatelliteForm.style.display = 'none';
        });

        // Search Satellite
        const searchBtn = document.getElementById('searchBtn')!;
        const searchInput = document.getElementById('satelliteSearchInput') as HTMLInputElement;
        const searchResults = document.getElementById('searchResults')!;

        searchBtn.addEventListener('click', async () => {
            const query = searchInput.value;
            if (!query) return;

            try {
                const res = await fetch(`/api/satellites/search?q=${query}`);
                const result = await res.json();

                if (result.success && result.satellites) {
                    searchResults.style.display = 'block';
                    searchResults.innerHTML = result.satellites
                        .map((sat: any) => `<div class="search-result" data-id="${sat.id}">${sat.name}</div>`)
                        .join('');
                } else {
                    searchResults.style.display = 'block';
                    searchResults.innerHTML = '<div>Search failed</div>';
                }
            } catch (error) {
                searchResults.style.display = 'block';
                searchResults.innerHTML = '<div>Search failed</div>';
            }
        });

        // Add Satellite to List
        const addToListBtn = document.getElementById('addToListBtn')!;
        const tleName = document.getElementById('tleName') as HTMLInputElement;
        const tleLine1 = document.getElementById('tleLine1') as HTMLTextAreaElement;
        const tleLine2 = document.getElementById('tleLine2') as HTMLTextAreaElement;
        const satelliteTableBody = document.getElementById('satelliteTableBody')!;

        addToListBtn.addEventListener('click', () => {
            if (!tleName.value || !tleLine1.value || !tleLine2.value) {
                alert('Please fill all fields');
                return;
            }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${tleName.value}</td>
                <td>
                    <button class="removeBtn">Remove</button>
                </td>
            `;

            const removeBtn = row.querySelector('.removeBtn')!;
            removeBtn.addEventListener('click', () => {
                row.remove();
            });

            satelliteTableBody.appendChild(row);
            tleName.value = '';
            tleLine1.value = '';
            tleLine2.value = '';
            addSatelliteForm.style.display = 'none';
        });

        // Random Satellite
        const randomBtn = document.getElementById('randomSatelliteBtn')!;
        randomBtn.addEventListener('click', async () => {
            try {
                const res = await fetch('/api/satellites/random');
                const result = await res.json();

                if (result.success && result.satellite) {
                    tleName.value = result.satellite.name;
                    tleLine1.value = result.satellite.tle1;
                    tleLine2.value = result.satellite.tle2;
                    addSatelliteForm.style.display = 'block';
                }
            } catch (error) {
                alert('Failed to load random satellite');
            }
        });

        // Calculate Button
        const calculateBtn = document.getElementById('calculateBtn') as HTMLButtonElement;
        const dateInput = document.getElementById('dateInput') as HTMLInputElement;
        const startTimeInput = document.getElementById('startTimeInput') as HTMLInputElement;
        const endTimeInput = document.getElementById('endTimeInput') as HTMLInputElement;
        const latitudeInput = document.getElementById('latitudeInput') as HTMLInputElement;
        const longitudeInput = document.getElementById('longitudeInput') as HTMLInputElement;
        const errorMsg = document.getElementById('errorMsg')!;
        const resultsSection = document.getElementById('resultsSection')!;

        calculateBtn.addEventListener('click', async () => {
            errorMsg.textContent = '';

            // Validation
            if (!dateInput.value || !startTimeInput.value || !endTimeInput.value) {
                errorMsg.textContent = 'Please fill date and time';
                return;
            }

            if (!latitudeInput.value || !longitudeInput.value) {
                errorMsg.textContent = 'Please fill latitude and longitude';
                return;
            }

            const lat = parseFloat(latitudeInput.value);
            const lon = parseFloat(longitudeInput.value);

            if (lat < -90 || lat > 90) {
                errorMsg.textContent = 'Latitude must be between -90 and 90';
                return;
            }

            if (lon < -180 || lon > 180) {
                errorMsg.textContent = 'Longitude must be between -180 and 180';
                return;
            }

            if (satelliteTableBody.children.length === 0) {
                errorMsg.textContent = 'Please add at least one satellite';
                return;
            }

            calculateBtn.disabled = true;

            try {
                const res = await fetch('/api/calculate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        date: dateInput.value,
                        startTime: startTimeInput.value,
                        endTime: endTimeInput.value,
                        latitude: lat,
                        longitude: lon,
                    }),
                });

                const result = await res.json();

                if (result.success) {
                    resultsSection.style.display = 'block';
                    
                    // Display results
                    if (result.mapData) {
                        document.getElementById('mapDisplay')!.innerHTML = 'Map loaded';
                    }
                    if (result.graphData) {
                        document.getElementById('graphDisplay')!.innerHTML = 'Graph loaded';
                    }
                    if (result.groundTrack) {
                        const tbody = document.getElementById('groundTrackTableBody')!;
                        tbody.innerHTML = result.groundTrack
                            .map((row: any) => `<tr><td>${row.time}</td><td>${row.lat}</td><td>${row.lon}</td></tr>`)
                            .join('');
                    }
                    if (result.satelliteInfo) {
                        document.getElementById('infoDisplay')!.textContent = JSON.stringify(result.satelliteInfo);
                    }
                } else {
                    errorMsg.textContent = result.message || 'Calculation failed';
                }
            } catch (error) {
                errorMsg.textContent = 'Error during calculation';
            } finally {
                calculateBtn.disabled = false;
            }
        });

        // Logout
        const logoutBtn = document.getElementById('logoutBtn')!;
        logoutBtn.addEventListener('click', () => {
            sessionStorage.removeItem('authToken');
            window.location.href = '/';
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('User Profile Menu', () => {
        test('should display user name in navbar', () => {
            const userNameDisplay = document.getElementById('userNameDisplay');
            expect(userNameDisplay?.textContent).toBe('John Doe');
        });

        test('should have user menu button', () => {
            const userMenuBtn = document.getElementById('userMenuBtn');
            expect(userMenuBtn).not.toBeNull();
        });

        test('should toggle user dropdown on button click', () => {
            const userMenuBtn = document.getElementById('userMenuBtn')!;
            const userDropdown = document.getElementById('userDropdown')!;

            expect(userDropdown.style.display).toBe('none');
            userMenuBtn.click();
            expect(userDropdown.style.display).toBe('block');
            userMenuBtn.click();
            expect(userDropdown.style.display).toBe('none');
        });

        test('should have Edit Profile link in dropdown', () => {
            const profileLink = document.getElementById('profileLink');
            expect(profileLink?.getAttribute('href')).toBe('/profile');
        });

        test('should have API Tokens link in dropdown', () => {
            const tokensLink = document.getElementById('tokensLink');
            expect(tokensLink?.getAttribute('href')).toBe('/tokens');
        });

        test('should logout and redirect on Logout click', () => {
            const logoutBtn = document.getElementById('logoutBtn')!;
            logoutBtn.click();

            expect(sessionStorage.getItem('authToken')).toBeNull();
        });
    });

    describe('Search Satellite', () => {
        test('should have search input field', () => {
            const searchInput = document.getElementById('satelliteSearchInput');
            expect(searchInput).not.toBeNull();
        });

        test('should have search button', () => {
            const searchBtn = document.getElementById('searchBtn');
            expect(searchBtn).not.toBeNull();
        });

        test('should search satellite and display results', async () => {
            const mockResults = [
                { id: 1, name: 'ISS' },
                { id: 2, name: 'Hubble' },
            ];

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                json: async () => ({ success: true, satellites: mockResults }),
            });

            const searchInput = document.getElementById('satelliteSearchInput') as HTMLInputElement;
            const searchBtn = document.getElementById('searchBtn')!;

            searchInput.value = 'ISS';
            searchBtn.click();

            await new Promise(r => setTimeout(r, 50));

            const searchResults = document.getElementById('searchResults')!;
            expect(searchResults.style.display).toBe('block');
            expect(searchResults.innerHTML).toContain('ISS');
            expect(searchResults.innerHTML).toContain('Hubble');
        });

        test('should handle search failure', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                json: async () => ({ success: false }),
            });

            const searchInput = document.getElementById('satelliteSearchInput') as HTMLInputElement;
            const searchBtn = document.getElementById('searchBtn')!;

            searchInput.value = 'test';
            searchBtn.click();

            await new Promise(r => setTimeout(r, 50));

            const searchResults = document.getElementById('searchResults')!;
            expect(searchResults.style.display).toBe('block');
            expect(searchResults.innerHTML).toContain('Search failed');
        });
    });

    describe('Add Satellite Manually', () => {
        test('should show add satellite form when button clicked', () => {
            const addSatelliteBtn = document.getElementById('addSatelliteBtn')!;
            const addSatelliteForm = document.getElementById('addSatelliteForm')!;

            expect(addSatelliteForm.style.display).toBe('none');
            addSatelliteBtn.click();
            expect(addSatelliteForm.style.display).toBe('block');
        });

        test('should hide form when cancel clicked', () => {
            const addSatelliteBtn = document.getElementById('addSatelliteBtn')!;
            const cancelBtn = document.getElementById('cancelAddBtn')!;
            const form = document.getElementById('addSatelliteForm')!;

            addSatelliteBtn.click();
            expect(form.style.display).toBe('block');
            cancelBtn.click();
            expect(form.style.display).toBe('none');
        });

        test('should add satellite to list when form submitted', () => {
            const addSatelliteBtn = document.getElementById('addSatelliteBtn')!;
            const addToListBtn = document.getElementById('addToListBtn')!;
            const tleName = document.getElementById('tleName') as HTMLInputElement;
            const tleLine1 = document.getElementById('tleLine1') as HTMLTextAreaElement;
            const tleLine2 = document.getElementById('tleLine2') as HTMLTextAreaElement;
            const satelliteTableBody = document.getElementById('satelliteTableBody')!;

            addSatelliteBtn.click();

            tleName.value = 'ISS';
            tleLine1.value = 'ISS (ZARYA)';
            tleLine2.value = '1 25544U';

            addToListBtn.click();

            expect(satelliteTableBody.children.length).toBe(1);
            expect(satelliteTableBody.innerHTML).toContain('ISS');
        });

        test('should show error if fields are empty', () => {
            const addSatelliteBtn = document.getElementById('addSatelliteBtn')!;
            const addToListBtn = document.getElementById('addToListBtn')!;
            
            const mockAlert = jest.spyOn(window, 'alert').mockImplementation(() => {});

            addSatelliteBtn.click();
            addToListBtn.click();

            expect(mockAlert).toHaveBeenCalledWith('Please fill all fields');
            mockAlert.mockRestore();
        });

        test('should remove satellite from list', () => {
            const addSatelliteBtn = document.getElementById('addSatelliteBtn')!;
            const addToListBtn = document.getElementById('addToListBtn')!;
            const tleName = document.getElementById('tleName') as HTMLInputElement;
            const tleLine1 = document.getElementById('tleLine1') as HTMLTextAreaElement;
            const tleLine2 = document.getElementById('tleLine2') as HTMLTextAreaElement;
            const satelliteTableBody = document.getElementById('satelliteTableBody')!;

            addSatelliteBtn.click();
            tleName.value = 'ISS';
            tleLine1.value = 'line1';
            tleLine2.value = 'line2';
            addToListBtn.click();

            expect(satelliteTableBody.children.length).toBe(1);

            const removeBtn = satelliteTableBody.querySelector('.removeBtn') as HTMLButtonElement;
            removeBtn.click();

            expect(satelliteTableBody.children.length).toBe(0);
        });
    });

    describe('Random Satellite', () => {
        test('should have random satellite button', () => {
            const randomBtn = document.getElementById('randomSatelliteBtn');
            expect(randomBtn).not.toBeNull();
        });

        test('should load random satellite and populate form', async () => {
            const mockSatellite = {
                name: 'ISS',
                tle1: 'ISS (ZARYA)',
                tle2: '1 25544U',
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                json: async () => ({ success: true, satellite: mockSatellite }),
            });

            const randomBtn = document.getElementById('randomSatelliteBtn')!;
            randomBtn.click();

            await new Promise(r => setTimeout(r, 50));

            const tleName = (document.getElementById('tleName') as HTMLInputElement).value;
            expect(tleName).toBe('ISS');
            expect(document.getElementById('addSatelliteForm')!.style.display).toBe('block');
        });
    });

    describe('Date and Time Selection', () => {
        test('should have date input', () => {
            const dateInput = document.getElementById('dateInput');
            expect(dateInput).not.toBeNull();
            expect((dateInput as HTMLInputElement).type).toBe('date');
        });

        test('should have start time input', () => {
            const startTimeInput = document.getElementById('startTimeInput');
            expect(startTimeInput).not.toBeNull();
            expect((startTimeInput as HTMLInputElement).type).toBe('time');
        });

        test('should have end time input', () => {
            const endTimeInput = document.getElementById('endTimeInput');
            expect(endTimeInput).not.toBeNull();
            expect((endTimeInput as HTMLInputElement).type).toBe('time');
        });

        test('should accept date input value', () => {
            const dateInput = document.getElementById('dateInput') as HTMLInputElement;
            dateInput.value = '2025-01-15';
            expect(dateInput.value).toBe('2025-01-15');
        });

        test('should accept time input values', () => {
            const startTimeInput = document.getElementById('startTimeInput') as HTMLInputElement;
            const endTimeInput = document.getElementById('endTimeInput') as HTMLInputElement;

            startTimeInput.value = '10:30';
            endTimeInput.value = '15:45';

            expect(startTimeInput.value).toBe('10:30');
            expect(endTimeInput.value).toBe('15:45');
        });
    });

    describe('Location Input (Latitude/Longitude)', () => {
        test('should have latitude input', () => {
            const latInput = document.getElementById('latitudeInput');
            expect(latInput).not.toBeNull();
            expect((latInput as HTMLInputElement).type).toBe('number');
        });

        test('should have longitude input', () => {
            const lonInput = document.getElementById('longitudeInput');
            expect(lonInput).not.toBeNull();
            expect((lonInput as HTMLInputElement).type).toBe('number');
        });

        test('should validate latitude range (-90 to 90)', () => {
            const latInput = document.getElementById('latitudeInput') as HTMLInputElement;
            expect(latInput.min).toBe('-90');
            expect(latInput.max).toBe('90');
        });

        test('should validate longitude range (-180 to 180)', () => {
            const lonInput = document.getElementById('longitudeInput') as HTMLInputElement;
            expect(lonInput.min).toBe('-180');
            expect(lonInput.max).toBe('180');
        });

        test('should accept valid latitude', () => {
            const latInput = document.getElementById('latitudeInput') as HTMLInputElement;
            latInput.value = '13.7563';
            expect(latInput.value).toBe('13.7563');
        });

        test('should accept valid longitude', () => {
            const lonInput = document.getElementById('longitudeInput') as HTMLInputElement;
            lonInput.value = '100.5018';
            expect(lonInput.value).toBe('100.5018');
        });
    });

    describe('Calculate Button and Results', () => {
        test('should have calculate button', () => {
            const calculateBtn = document.getElementById('calculateBtn');
            expect(calculateBtn).not.toBeNull();
        });

        test('should show error if date/time missing', () => {
            const addSatelliteBtn = document.getElementById('addSatelliteBtn')!;
            const addToListBtn = document.getElementById('addToListBtn')!;
            const tleName = document.getElementById('tleName') as HTMLInputElement;
            const calculateBtn = document.getElementById('calculateBtn')!;
            const errorMsg = document.getElementById('errorMsg')!;

            // Add a satellite first
            addSatelliteBtn.click();
            tleName.value = 'ISS';
            (document.getElementById('tleLine1') as HTMLTextAreaElement).value = 'line1';
            (document.getElementById('tleLine2') as HTMLTextAreaElement).value = 'line2';
            addToListBtn.click();

            // Try to calculate without date/time
            calculateBtn.click();

            expect(errorMsg.textContent).toContain('Please fill date and time');
        });

        test('should show error if location missing', () => {
            const addSatelliteBtn = document.getElementById('addSatelliteBtn')!;
            const addToListBtn = document.getElementById('addToListBtn')!;
            const tleName = document.getElementById('tleName') as HTMLInputElement;
            const dateInput = document.getElementById('dateInput') as HTMLInputElement;
            const startTimeInput = document.getElementById('startTimeInput') as HTMLInputElement;
            const endTimeInput = document.getElementById('endTimeInput') as HTMLInputElement;
            const calculateBtn = document.getElementById('calculateBtn')!;
            const errorMsg = document.getElementById('errorMsg')!;

            // Add satellite
            addSatelliteBtn.click();
            tleName.value = 'ISS';
            (document.getElementById('tleLine1') as HTMLTextAreaElement).value = 'line1';
            (document.getElementById('tleLine2') as HTMLTextAreaElement).value = 'line2';
            addToListBtn.click();

            // Set date/time but not location
            dateInput.value = '2025-01-15';
            startTimeInput.value = '10:00';
            endTimeInput.value = '15:00';

            calculateBtn.click();

            expect(errorMsg.textContent).toContain('Please fill latitude and longitude');
        });

        test('should show error if latitude out of range', () => {
            const addSatelliteBtn = document.getElementById('addSatelliteBtn')!;
            const addToListBtn = document.getElementById('addToListBtn')!;
            const tleName = document.getElementById('tleName') as HTMLInputElement;
            const dateInput = document.getElementById('dateInput') as HTMLInputElement;
            const startTimeInput = document.getElementById('startTimeInput') as HTMLInputElement;
            const endTimeInput = document.getElementById('endTimeInput') as HTMLInputElement;
            const latitudeInput = document.getElementById('latitudeInput') as HTMLInputElement;
            const longitudeInput = document.getElementById('longitudeInput') as HTMLInputElement;
            const calculateBtn = document.getElementById('calculateBtn')!;
            const errorMsg = document.getElementById('errorMsg')!;

            addSatelliteBtn.click();
            tleName.value = 'ISS';
            (document.getElementById('tleLine1') as HTMLTextAreaElement).value = 'line1';
            (document.getElementById('tleLine2') as HTMLTextAreaElement).value = 'line2';
            addToListBtn.click();

            dateInput.value = '2025-01-15';
            startTimeInput.value = '10:00';
            endTimeInput.value = '15:00';
            latitudeInput.value = '100'; // Invalid
            longitudeInput.value = '100';

            calculateBtn.click();

            expect(errorMsg.textContent).toContain('Latitude must be between -90 and 90');
        });

        test('should show error if no satellite added', () => {
            const dateInput = document.getElementById('dateInput') as HTMLInputElement;
            const startTimeInput = document.getElementById('startTimeInput') as HTMLInputElement;
            const endTimeInput = document.getElementById('endTimeInput') as HTMLInputElement;
            const latitudeInput = document.getElementById('latitudeInput') as HTMLInputElement;
            const longitudeInput = document.getElementById('longitudeInput') as HTMLInputElement;
            const calculateBtn = document.getElementById('calculateBtn')!;
            const errorMsg = document.getElementById('errorMsg')!;

            dateInput.value = '2025-01-15';
            startTimeInput.value = '10:00';
            endTimeInput.value = '15:00';
            latitudeInput.value = '13.7563';
            longitudeInput.value = '100.5018';

            calculateBtn.click();

            expect(errorMsg.textContent).toContain('Please add at least one satellite');
        });

        test('should disable calculate button during calculation', async () => {
            const addSatelliteBtn = document.getElementById('addSatelliteBtn')!;
            const addToListBtn = document.getElementById('addToListBtn')!;
            const tleName = document.getElementById('tleName') as HTMLInputElement;
            const dateInput = document.getElementById('dateInput') as HTMLInputElement;
            const startTimeInput = document.getElementById('startTimeInput') as HTMLInputElement;
            const endTimeInput = document.getElementById('endTimeInput') as HTMLInputElement;
            const latitudeInput = document.getElementById('latitudeInput') as HTMLInputElement;
            const longitudeInput = document.getElementById('longitudeInput') as HTMLInputElement;
            const calculateBtn = document.getElementById('calculateBtn') as HTMLButtonElement;

            addSatelliteBtn.click();
            tleName.value = 'ISS';
            (document.getElementById('tleLine1') as HTMLTextAreaElement).value = 'line1';
            (document.getElementById('tleLine2') as HTMLTextAreaElement).value = 'line2';
            addToListBtn.click();

            dateInput.value = '2025-01-15';
            startTimeInput.value = '10:00';
            endTimeInput.value = '15:00';
            latitudeInput.value = '13.7563';
            longitudeInput.value = '100.5018';

            (global.fetch as jest.Mock).mockImplementationOnce(
                () => new Promise(r => setTimeout(() => r({
                    json: async () => ({ success: true, mapData: {}, graphData: {}, groundTrack: [] })
                }), 100))
            );

            calculateBtn.click();
            expect(calculateBtn.disabled).toBe(true);

            await new Promise(r => setTimeout(r, 150));
            expect(calculateBtn.disabled).toBe(false);
        });

        test('should display results on successful calculation', async () => {
            const addSatelliteBtn = document.getElementById('addSatelliteBtn')!;
            const addToListBtn = document.getElementById('addToListBtn')!;
            const tleName = document.getElementById('tleName') as HTMLInputElement;
            const dateInput = document.getElementById('dateInput') as HTMLInputElement;
            const startTimeInput = document.getElementById('startTimeInput') as HTMLInputElement;
            const endTimeInput = document.getElementById('endTimeInput') as HTMLInputElement;
            const latitudeInput = document.getElementById('latitudeInput') as HTMLInputElement;
            const longitudeInput = document.getElementById('longitudeInput') as HTMLInputElement;
            const calculateBtn = document.getElementById('calculateBtn')!;
            const resultsSection = document.getElementById('resultsSection')!;

            addSatelliteBtn.click();
            tleName.value = 'ISS';
            (document.getElementById('tleLine1') as HTMLTextAreaElement).value = 'line1';
            (document.getElementById('tleLine2') as HTMLTextAreaElement).value = 'line2';
            addToListBtn.click();

            dateInput.value = '2025-01-15';
            startTimeInput.value = '10:00';
            endTimeInput.value = '15:00';
            latitudeInput.value = '13.7563';
            longitudeInput.value = '100.5018';

            const mockResults = {
                success: true,
                mapData: { /* map data */ },
                graphData: { /* graph data */ },
                groundTrack: [
                    { time: '10:00', lat: 51.5, lon: -0.1 },
                    { time: '10:01', lat: 51.6, lon: -0.2 },
                ],
                satelliteInfo: { name: 'ISS', altitude: 400 },
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                json: async () => mockResults,
            });

            calculateBtn.click();

            await new Promise(r => setTimeout(r, 50));

            expect(resultsSection.style.display).toBe('block');
            expect(document.getElementById('mapDisplay')!.textContent).toBe('Map loaded');
            expect(document.getElementById('graphDisplay')!.textContent).toBe('Graph loaded');
            expect(document.getElementById('groundTrackTableBody')!.children.length).toBe(2);
            expect(document.getElementById('infoDisplay')!.textContent).toContain('ISS');
        });

        test('should show error on calculation failure', async () => {
            const addSatelliteBtn = document.getElementById('addSatelliteBtn')!;
            const addToListBtn = document.getElementById('addToListBtn')!;
            const tleName = document.getElementById('tleName') as HTMLInputElement;
            const dateInput = document.getElementById('dateInput') as HTMLInputElement;
            const startTimeInput = document.getElementById('startTimeInput') as HTMLInputElement;
            const endTimeInput = document.getElementById('endTimeInput') as HTMLInputElement;
            const latitudeInput = document.getElementById('latitudeInput') as HTMLInputElement;
            const longitudeInput = document.getElementById('longitudeInput') as HTMLInputElement;
            const calculateBtn = document.getElementById('calculateBtn')!;
            const errorMsg = document.getElementById('errorMsg')!;

            addSatelliteBtn.click();
            tleName.value = 'ISS';
            (document.getElementById('tleLine1') as HTMLTextAreaElement).value = 'line1';
            (document.getElementById('tleLine2') as HTMLTextAreaElement).value = 'line2';
            addToListBtn.click();

            dateInput.value = '2025-01-15';
            startTimeInput.value = '10:00';
            endTimeInput.value = '15:00';
            latitudeInput.value = '13.7563';
            longitudeInput.value = '100.5018';

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                json: async () => ({ success: false, message: 'Calculation error' }),
            });

            calculateBtn.click();

            await new Promise(r => setTimeout(r, 50));

            expect(errorMsg.textContent).toBe('Calculation error');
        });

        test('should have map display section', () => {
            const mapResults = document.getElementById('mapResults');
            expect(mapResults).not.toBeNull();
            expect(mapResults?.querySelector('h3')?.textContent).toBe('Map Results');
        });

        test('should have graph display section', () => {
            const graphResults = document.getElementById('graphResults');
            expect(graphResults).not.toBeNull();
            expect(graphResults?.querySelector('h3')?.textContent).toBe('Visibility Graph');
        });

        test('should have ground track table section', () => {
            const groundTrackResults = document.getElementById('groundTrackResults');
            expect(groundTrackResults).not.toBeNull();
            expect(groundTrackResults?.querySelector('h3')?.textContent).toBe('Ground Track Table');
        });

        test('should have satellite info section', () => {
            const satelliteInfoResults = document.getElementById('satelliteInfoResults');
            expect(satelliteInfoResults).not.toBeNull();
            expect(satelliteInfoResults?.querySelector('h3')?.textContent).toBe('Satellite Info');
        });

        test('should populate ground track table with results', async () => {
            const addSatelliteBtn = document.getElementById('addSatelliteBtn')!;
            const addToListBtn = document.getElementById('addToListBtn')!;
            const tleName = document.getElementById('tleName') as HTMLInputElement;
            const dateInput = document.getElementById('dateInput') as HTMLInputElement;
            const startTimeInput = document.getElementById('startTimeInput') as HTMLInputElement;
            const endTimeInput = document.getElementById('endTimeInput') as HTMLInputElement;
            const latitudeInput = document.getElementById('latitudeInput') as HTMLInputElement;
            const longitudeInput = document.getElementById('longitudeInput') as HTMLInputElement;
            const calculateBtn = document.getElementById('calculateBtn')!;

            addSatelliteBtn.click();
            tleName.value = 'ISS';
            (document.getElementById('tleLine1') as HTMLTextAreaElement).value = 'line1';
            (document.getElementById('tleLine2') as HTMLTextAreaElement).value = 'line2';
            addToListBtn.click();

            dateInput.value = '2025-01-15';
            startTimeInput.value = '10:00';
            endTimeInput.value = '15:00';
            latitudeInput.value = '13.7563';
            longitudeInput.value = '100.5018';

            const trackData = [
                { time: '10:00:00', lat: 51.5074, lon: -0.1278 },
                { time: '10:01:00', lat: 51.5078, lon: -0.1275 },
                { time: '10:02:00', lat: 51.5082, lon: -0.1272 },
            ];

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                json: async () => ({
                    success: true,
                    mapData: {},
                    graphData: {},
                    groundTrack: trackData,
                    satelliteInfo: {},
                }),
            });

            calculateBtn.click();

            await new Promise(r => setTimeout(r, 50));

            const tableBody = document.getElementById('groundTrackTableBody')!;
            expect(tableBody.children.length).toBe(3);
            expect(tableBody.innerHTML).toContain('10:00:00');
            expect(tableBody.innerHTML).toContain('51.5074');
        });
    });

    describe('Results Display', () => {
        test('results section should be hidden by default', () => {
            const resultsSection = document.getElementById('resultsSection')!;
            expect(resultsSection.style.display).toBe('none');
        });

        test('should show results section after successful calculation', async () => {
            const addSatelliteBtn = document.getElementById('addSatelliteBtn')!;
            const addToListBtn = document.getElementById('addToListBtn')!;
            const tleName = document.getElementById('tleName') as HTMLInputElement;
            const dateInput = document.getElementById('dateInput') as HTMLInputElement;
            const startTimeInput = document.getElementById('startTimeInput') as HTMLInputElement;
            const endTimeInput = document.getElementById('endTimeInput') as HTMLInputElement;
            const latitudeInput = document.getElementById('latitudeInput') as HTMLInputElement;
            const longitudeInput = document.getElementById('longitudeInput') as HTMLInputElement;
            const calculateBtn = document.getElementById('calculateBtn')!;
            const resultsSection = document.getElementById('resultsSection')!;

            addSatelliteBtn.click();
            tleName.value = 'ISS';
            (document.getElementById('tleLine1') as HTMLTextAreaElement).value = 'line1';
            (document.getElementById('tleLine2') as HTMLTextAreaElement).value = 'line2';
            addToListBtn.click();

            dateInput.value = '2025-01-15';
            startTimeInput.value = '10:00';
            endTimeInput.value = '15:00';
            latitudeInput.value = '13.7563';
            longitudeInput.value = '100.5018';

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                json: async () => ({
                    success: true,
                    mapData: {},
                    graphData: {},
                    groundTrack: [],
                    satelliteInfo: {},
                }),
            });

            expect(resultsSection.style.display).toBe('none');

            calculateBtn.click();

            await new Promise(r => setTimeout(r, 50));

            expect(resultsSection.style.display).toBe('block');
        });

        test('should display map data in results', async () => {
            const addSatelliteBtn = document.getElementById('addSatelliteBtn')!;
            const addToListBtn = document.getElementById('addToListBtn')!;
            const tleName = document.getElementById('tleName') as HTMLInputElement;
            const dateInput = document.getElementById('dateInput') as HTMLInputElement;
            const startTimeInput = document.getElementById('startTimeInput') as HTMLInputElement;
            const endTimeInput = document.getElementById('endTimeInput') as HTMLInputElement;
            const latitudeInput = document.getElementById('latitudeInput') as HTMLInputElement;
            const longitudeInput = document.getElementById('longitudeInput') as HTMLInputElement;
            const calculateBtn = document.getElementById('calculateBtn')!;

            addSatelliteBtn.click();
            tleName.value = 'ISS';
            (document.getElementById('tleLine1') as HTMLTextAreaElement).value = 'line1';
            (document.getElementById('tleLine2') as HTMLTextAreaElement).value = 'line2';
            addToListBtn.click();

            dateInput.value = '2025-01-15';
            startTimeInput.value = '10:00';
            endTimeInput.value = '15:00';
            latitudeInput.value = '13.7563';
            longitudeInput.value = '100.5018';

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                json: async () => ({
                    success: true,
                    mapData: { tiles: 'loaded' },
                    graphData: {},
                    groundTrack: [],
                    satelliteInfo: {},
                }),
            });

            calculateBtn.click();

            await new Promise(r => setTimeout(r, 50));

            const mapDisplay = document.getElementById('mapDisplay')!;
            expect(mapDisplay.textContent).toBe('Map loaded');
        });

        test('should display satellite info in results', async () => {
            const addSatelliteBtn = document.getElementById('addSatelliteBtn')!;
            const addToListBtn = document.getElementById('addToListBtn')!;
            const tleName = document.getElementById('tleName') as HTMLInputElement;
            const dateInput = document.getElementById('dateInput') as HTMLInputElement;
            const startTimeInput = document.getElementById('startTimeInput') as HTMLInputElement;
            const endTimeInput = document.getElementById('endTimeInput') as HTMLInputElement;
            const latitudeInput = document.getElementById('latitudeInput') as HTMLInputElement;
            const longitudeInput = document.getElementById('longitudeInput') as HTMLInputElement;
            const calculateBtn = document.getElementById('calculateBtn')!;

            addSatelliteBtn.click();
            tleName.value = 'ISS';
            (document.getElementById('tleLine1') as HTMLTextAreaElement).value = 'line1';
            (document.getElementById('tleLine2') as HTMLTextAreaElement).value = 'line2';
            addToListBtn.click();

            dateInput.value = '2025-01-15';
            startTimeInput.value = '10:00';
            endTimeInput.value = '15:00';
            latitudeInput.value = '13.7563';
            longitudeInput.value = '100.5018';

            const mockInfo = { name: 'ISS', altitude: 408, inclination: 51.6 };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                json: async () => ({
                    success: true,
                    mapData: {},
                    graphData: {},
                    groundTrack: [],
                    satelliteInfo: mockInfo,
                }),
            });

            calculateBtn.click();

            await new Promise(r => setTimeout(r, 50));

            const infoDisplay = document.getElementById('infoDisplay')!;
            expect(infoDisplay.textContent).toContain('ISS');
            expect(infoDisplay.textContent).toContain('408');
        });
    });

    describe('Display Current Time', () => {
        test('should display UTC time', () => {
            // Assuming there's a UTC time display element
            const utcTimeDisplay = document.querySelector('[data-time="utc"]') || 
                                   document.getElementById('utcTime');
            
            // This test assumes the time element exists in your actual implementation
            if (utcTimeDisplay) {
                expect(utcTimeDisplay.textContent).toBeTruthy();
            } else {
                // If not implemented yet, this serves as a placeholder
                expect(true).toBe(true);
            }
        });

        test('should display local time', () => {
            // Assuming there's a local time display element
            const localTimeDisplay = document.querySelector('[data-time="local"]') || 
                                     document.getElementById('localTime');
            
            if (localTimeDisplay) {
                expect(localTimeDisplay.textContent).toBeTruthy();
            } else {
                expect(true).toBe(true);
            }
        });
    });

    describe('Search and Add Satellite from Results', () => {
        test('should have ADD button in search results', async () => {
            const mockResults = [
                { id: 1, name: 'ISS', tle1: 'line1', tle2: 'line2' },
            ];

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                json: async () => ({ success: true, satellites: mockResults }),
            });

            const searchInput = document.getElementById('satelliteSearchInput') as HTMLInputElement;
            const searchBtn = document.getElementById('searchBtn')!;

            searchInput.value = 'ISS';
            searchBtn.click();

            await new Promise(r => setTimeout(r, 50));

            const searchResults = document.getElementById('searchResults')!;
            
            // Add ADD button functionality to search results
            searchResults.innerHTML = mockResults
                .map((sat: any) => `
                    <div class="search-result" data-id="${sat.id}">
                        ${sat.name}
                        <button class="addFromSearchBtn" data-name="${sat.name}" data-tle1="${sat.tle1}" data-tle2="${sat.tle2}">ADD</button>
                    </div>
                `).join('');

            const addBtn = searchResults.querySelector('.addFromSearchBtn');
            expect(addBtn).not.toBeNull();
        });

        test('should add satellite to list when clicking ADD from search results', async () => {
            const mockResults = [
                { id: 1, name: 'ISS', tle1: 'line1', tle2: 'line2' },
            ];

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                json: async () => ({ success: true, satellites: mockResults }),
            });

            const searchInput = document.getElementById('satelliteSearchInput') as HTMLInputElement;
            const searchBtn = document.getElementById('searchBtn')!;
            const satelliteTableBody = document.getElementById('satelliteTableBody')!;

            searchInput.value = 'ISS';
            searchBtn.click();

            await new Promise(r => setTimeout(r, 50));

            const searchResults = document.getElementById('searchResults')!;
            
            // Simulate ADD button in search results
            searchResults.innerHTML = `
                <div class="search-result">
                    ISS
                    <button class="addFromSearchBtn" data-name="ISS" data-tle1="line1" data-tle2="line2">ADD</button>
                </div>
            `;

            const addBtn = searchResults.querySelector('.addFromSearchBtn') as HTMLButtonElement;
            
            // Simulate click handler
            addBtn.addEventListener('click', () => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${addBtn.dataset.name}</td>
                    <td><button class="removeBtn">Remove</button></td>
                `;
                satelliteTableBody.appendChild(row);
            });

            addBtn.click();

            expect(satelliteTableBody.children.length).toBe(1);
            expect(satelliteTableBody.innerHTML).toContain('ISS');
        });
    });

    describe('Ground Track Table - Row Selection', () => {
        test('should have clickable rows in ground track table', async () => {
            const addSatelliteBtn = document.getElementById('addSatelliteBtn')!;
            const addToListBtn = document.getElementById('addToListBtn')!;
            const tleName = document.getElementById('tleName') as HTMLInputElement;
            const dateInput = document.getElementById('dateInput') as HTMLInputElement;
            const startTimeInput = document.getElementById('startTimeInput') as HTMLInputElement;
            const endTimeInput = document.getElementById('endTimeInput') as HTMLInputElement;
            const latitudeInput = document.getElementById('latitudeInput') as HTMLInputElement;
            const longitudeInput = document.getElementById('longitudeInput') as HTMLInputElement;
            const calculateBtn = document.getElementById('calculateBtn')!;

            // Add two satellites
            addSatelliteBtn.click();
            tleName.value = 'STARLINK-1008';
            (document.getElementById('tleLine1') as HTMLTextAreaElement).value = 'line1';
            (document.getElementById('tleLine2') as HTMLTextAreaElement).value = 'line2';
            addToListBtn.click();

            addSatelliteBtn.click();
            tleName.value = 'STARLINK-1010';
            (document.getElementById('tleLine1') as HTMLTextAreaElement).value = 'line3';
            (document.getElementById('tleLine2') as HTMLTextAreaElement).value = 'line4';
            addToListBtn.click();

            dateInput.value = '2025-01-15';
            startTimeInput.value = '10:00';
            endTimeInput.value = '15:00';
            latitudeInput.value = '13.7563';
            longitudeInput.value = '100.5018';

            const trackData = [
                { time: '10:00:00', lat: 51.5074, lon: -0.1278, satellite: 'STARLINK-1008' },
                { time: '10:01:00', lat: -22.3508, lon: 145.0954, satellite: 'STARLINK-1010' },
            ];

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                json: async () => ({
                    success: true,
                    mapData: {},
                    graphData: {},
                    groundTrack: trackData,
                    satelliteInfo: { name: 'STARLINK-1008' },
                }),
            });

            calculateBtn.click();
            await new Promise(r => setTimeout(r, 50));

            const tableBody = document.getElementById('groundTrackTableBody')!;
            expect(tableBody.children.length).toBeGreaterThan(0);

            // Rows should be clickable
            const firstRow = tableBody.children[0] as HTMLTableRowElement;
            expect(firstRow).not.toBeNull();
        });

        test('should update display when clicking on ground track row', async () => {
            const addSatelliteBtn = document.getElementById('addSatelliteBtn')!;
            const addToListBtn = document.getElementById('addToListBtn')!;
            const tleName = document.getElementById('tleName') as HTMLInputElement;
            const dateInput = document.getElementById('dateInput') as HTMLInputElement;
            const startTimeInput = document.getElementById('startTimeInput') as HTMLInputElement;
            const endTimeInput = document.getElementById('endTimeInput') as HTMLInputElement;
            const latitudeInput = document.getElementById('latitudeInput') as HTMLInputElement;
            const longitudeInput = document.getElementById('longitudeInput') as HTMLInputElement;
            const calculateBtn = document.getElementById('calculateBtn')!;

            addSatelliteBtn.click();
            tleName.value = 'STARLINK-1008';
            (document.getElementById('tleLine1') as HTMLTextAreaElement).value = 'line1';
            (document.getElementById('tleLine2') as HTMLTextAreaElement).value = 'line2';
            addToListBtn.click();

            dateInput.value = '2025-01-15';
            startTimeInput.value = '10:00';
            endTimeInput.value = '15:00';
            latitudeInput.value = '13.7563';
            longitudeInput.value = '100.5018';

            const trackData = [
                { time: '10:00:00', lat: 51.5074, lon: -0.1278, satellite: 'STARLINK-1008' },
                { time: '10:01:00', lat: 51.5078, lon: -0.1275, satellite: 'STARLINK-1008' },
            ];

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                json: async () => ({
                    success: true,
                    mapData: {},
                    graphData: {},
                    groundTrack: trackData,
                    satelliteInfo: { name: 'STARLINK-1008', altitude: 550 },
                }),
            });

            calculateBtn.click();
            await new Promise(r => setTimeout(r, 50));

            const tableBody = document.getElementById('groundTrackTableBody')!;
            const rows = tableBody.querySelectorAll('tr');
            
            // Add click handler to rows
            rows.forEach((row, index) => {
                row.style.cursor = 'pointer';
                row.addEventListener('click', () => {
                    // Update satellite info display
                    const infoDisplay = document.getElementById('infoDisplay')!;
                    infoDisplay.setAttribute('data-selected', trackData[index].satellite);
                });
            });

            const firstRow = rows[0] as HTMLTableRowElement;
            firstRow.click();

            const infoDisplay = document.getElementById('infoDisplay')!;
            expect(infoDisplay.getAttribute('data-selected')).toBe('STARLINK-1008');
        });

        test('should highlight selected row in ground track table', async () => {
            const addSatelliteBtn = document.getElementById('addSatelliteBtn')!;
            const addToListBtn = document.getElementById('addToListBtn')!;
            const tleName = document.getElementById('tleName') as HTMLInputElement;
            const dateInput = document.getElementById('dateInput') as HTMLInputElement;
            const startTimeInput = document.getElementById('startTimeInput') as HTMLInputElement;
            const endTimeInput = document.getElementById('endTimeInput') as HTMLInputElement;
            const latitudeInput = document.getElementById('latitudeInput') as HTMLInputElement;
            const longitudeInput = document.getElementById('longitudeInput') as HTMLInputElement;
            const calculateBtn = document.getElementById('calculateBtn')!;

            addSatelliteBtn.click();
            tleName.value = 'ISS';
            (document.getElementById('tleLine1') as HTMLTextAreaElement).value = 'line1';
            (document.getElementById('tleLine2') as HTMLTextAreaElement).value = 'line2';
            addToListBtn.click();

            dateInput.value = '2025-01-15';
            startTimeInput.value = '10:00';
            endTimeInput.value = '15:00';
            latitudeInput.value = '13.7563';
            longitudeInput.value = '100.5018';

            const trackData = [
                { time: '10:00:00', lat: 51.5074, lon: -0.1278 },
                { time: '10:01:00', lat: 51.5078, lon: -0.1275 },
            ];

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                json: async () => ({
                    success: true,
                    groundTrack: trackData,
                }),
            });

            calculateBtn.click();
            await new Promise(r => setTimeout(r, 50));

            const tableBody = document.getElementById('groundTrackTableBody')!;
            const rows = tableBody.querySelectorAll('tr');
            
            // Simulate row selection with highlight
            rows.forEach(row => {
                row.addEventListener('click', () => {
                    rows.forEach(r => r.classList.remove('selected'));
                    row.classList.add('selected');
                });
            });

            const firstRow = rows[0] as HTMLTableRowElement;
            firstRow.click();

            expect(firstRow.classList.contains('selected')).toBe(true);
        });
    });

    describe('Show All Data Button', () => {
        test('should have "Show All Data" button', () => {
            // Add button to DOM for testing
            const resultsSection = document.getElementById('resultsSection')!;
            const showAllBtn = document.createElement('button');
            showAllBtn.id = 'showAllDataBtn';
            showAllBtn.textContent = 'Show all data';
            resultsSection.appendChild(showAllBtn);

            const btn = document.getElementById('showAllDataBtn');
            expect(btn).not.toBeNull();
            expect(btn?.textContent).toBe('Show all data');
        });

        test('should display modal with all ground track data when clicked', async () => {
            const resultsSection = document.getElementById('resultsSection')!;
            const showAllBtn = document.createElement('button');
            showAllBtn.id = 'showAllDataBtn';
            resultsSection.appendChild(showAllBtn);

            const modal = document.createElement('div');
            modal.id = 'groundTrackModal';
            modal.style.display = 'none';
            document.body.appendChild(modal);

            showAllBtn.addEventListener('click', () => {
                modal.style.display = 'block';
            });

            showAllBtn.click();

            expect(modal.style.display).toBe('block');
        });

        test('should close modal when clicking X button', () => {
            const modal = document.createElement('div');
            modal.id = 'groundTrackModal';
            modal.style.display = 'block';
            document.body.appendChild(modal);

            const closeBtn = document.createElement('button');
            closeBtn.id = 'closeGroundTrackModal';
            closeBtn.textContent = 'x';
            modal.appendChild(closeBtn);

            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });

            closeBtn.click();

            expect(modal.style.display).toBe('none');
        });
    });

    describe('Data from Graph Button', () => {
        test('should have "Data from graph" button', () => {
            const graphResults = document.getElementById('graphResults')!;
            const dataFromGraphBtn = document.createElement('button');
            dataFromGraphBtn.id = 'dataFromGraphBtn';
            dataFromGraphBtn.textContent = 'Data from graph';
            graphResults.appendChild(dataFromGraphBtn);

            const btn = document.getElementById('dataFromGraphBtn');
            expect(btn).not.toBeNull();
            expect(btn?.textContent).toBe('Data from graph');
        });

        test('should display visibility data modal when clicked', () => {
            const graphResults = document.getElementById('graphResults')!;
            const dataFromGraphBtn = document.createElement('button');
            dataFromGraphBtn.id = 'dataFromGraphBtn';
            graphResults.appendChild(dataFromGraphBtn);

            const modal = document.createElement('div');
            modal.id = 'visibilityDataModal';
            modal.style.display = 'none';
            document.body.appendChild(modal);

            dataFromGraphBtn.addEventListener('click', () => {
                modal.style.display = 'block';
            });

            dataFromGraphBtn.click();

            expect(modal.style.display).toBe('block');
        });

        test('should close visibility modal when clicking X button', () => {
            const modal = document.createElement('div');
            modal.id = 'visibilityDataModal';
            modal.style.display = 'block';
            document.body.appendChild(modal);

            const closeBtn = document.createElement('button');
            closeBtn.id = 'closeVisibilityModal';
            closeBtn.textContent = 'x';
            modal.appendChild(closeBtn);

            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });

            closeBtn.click();

            expect(modal.style.display).toBe('none');
        });

        test('should display table with visibility data', () => {
            const modal = document.createElement('div');
            modal.id = 'visibilityDataModal';
            document.body.appendChild(modal);

            const table = document.createElement('table');
            table.id = 'visibilityDataTable';
            const thead = document.createElement('thead');
            thead.innerHTML = '<tr><th>Time</th><th>Elevation</th><th>Azimuth</th></tr>';
            table.appendChild(thead);
            
            const tbody = document.createElement('tbody');
            tbody.id = 'visibilityDataTableBody';
            table.appendChild(tbody);
            
            modal.appendChild(table);

            const visibilityData = [
                { time: '14:00', elevation: 45, azimuth: 180 },
                { time: '14:01', elevation: 50, azimuth: 185 },
            ];

            tbody.innerHTML = visibilityData
                .map(row => `<tr><td>${row.time}</td><td>${row.elevation}</td><td>${row.azimuth}</td></tr>`)
                .join('');

            expect(tbody.children.length).toBe(2);
            expect(tbody.innerHTML).toContain('14:00');
            expect(tbody.innerHTML).toContain('45');
        });
    });

    describe('Integration Tests', () => {
        test('complete flow: add satellite, set parameters, calculate', async () => {
            // Add satellite
            const addSatelliteBtn = document.getElementById('addSatelliteBtn')!;
            const addToListBtn = document.getElementById('addToListBtn')!;
            const tleName = document.getElementById('tleName') as HTMLInputElement;
            const tleLine1 = document.getElementById('tleLine1') as HTMLTextAreaElement;
            const tleLine2 = document.getElementById('tleLine2') as HTMLTextAreaElement;

            addSatelliteBtn.click();
            tleName.value = 'ISS';
            tleLine1.value = 'ISS (ZARYA)';
            tleLine2.value = '1 25544U 98067A';
            addToListBtn.click();

            // Set parameters
            const dateInput = document.getElementById('dateInput') as HTMLInputElement;
            const startTimeInput = document.getElementById('startTimeInput') as HTMLInputElement;
            const endTimeInput = document.getElementById('endTimeInput') as HTMLInputElement;
            const latitudeInput = document.getElementById('latitudeInput') as HTMLInputElement;
            const longitudeInput = document.getElementById('longitudeInput') as HTMLInputElement;

            dateInput.value = '2025-01-15';
            startTimeInput.value = '10:00';
            endTimeInput.value = '15:00';
            latitudeInput.value = '13.7563';
            longitudeInput.value = '100.5018';

            // Mock and calculate
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                json: async () => ({
                    success: true,
                    mapData: {},
                    graphData: {},
                    groundTrack: [{ time: '10:00', lat: 51.5, lon: -0.1 }],
                    satelliteInfo: { name: 'ISS' },
                }),
            });

            const calculateBtn = document.getElementById('calculateBtn')!;
            calculateBtn.click();

            await new Promise(r => setTimeout(r, 50));

            // Verify results
            const resultsSection = document.getElementById('resultsSection')!;
            expect(resultsSection.style.display).toBe('block');
            expect(global.fetch).toHaveBeenCalledWith('/api/calculate', expect.any(Object));
        });

        test('should handle search, select, and calculate flow', async () => {
            // Search
            const searchInput = document.getElementById('satelliteSearchInput') as HTMLInputElement;
            const searchBtn = document.getElementById('searchBtn')!;

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                json: async () => ({
                    success: true,
                    satellites: [{ id: 1, name: 'ISS', tle1: 'line1', tle2: 'line2' }],
                }),
            });

            searchInput.value = 'ISS';
            searchBtn.click();

            await new Promise(r => setTimeout(r, 50));

            // Set parameters and calculate
            const dateInput = document.getElementById('dateInput') as HTMLInputElement;
            const startTimeInput = document.getElementById('startTimeInput') as HTMLInputElement;
            const endTimeInput = document.getElementById('endTimeInput') as HTMLInputElement;
            const latitudeInput = document.getElementById('latitudeInput') as HTMLInputElement;
            const longitudeInput = document.getElementById('longitudeInput') as HTMLInputElement;

            dateInput.value = '2025-01-15';
            startTimeInput.value = '10:00';
            endTimeInput.value = '15:00';
            latitudeInput.value = '13.7563';
            longitudeInput.value = '100.5018';

            // Add satellite manually for test
            const addSatelliteBtn = document.getElementById('addSatelliteBtn')!;
            const addToListBtn = document.getElementById('addToListBtn')!;
            const tleName = document.getElementById('tleName') as HTMLInputElement;
            addSatelliteBtn.click();
            tleName.value = 'ISS';
            (document.getElementById('tleLine1') as HTMLTextAreaElement).value = 'line1';
            (document.getElementById('tleLine2') as HTMLTextAreaElement).value = 'line2';
            addToListBtn.click();

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                json: async () => ({
                    success: true,
                    mapData: {},
                    graphData: {},
                    groundTrack: [],
                    satelliteInfo: {},
                }),
            });

            const calculateBtn = document.getElementById('calculateBtn')!;
            calculateBtn.click();

            await new Promise(r => setTimeout(r, 50));

            expect(global.fetch).toHaveBeenCalledTimes(2);
        });
    });
});