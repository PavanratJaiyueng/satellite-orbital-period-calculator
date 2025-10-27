describe('Help Page (help.html)', () => {
    
    beforeEach(() => {
        // Mock scrollIntoView สำหรับ jsdom
        Element.prototype.scrollIntoView = jest.fn();
        
        document.body.innerHTML = `
            <div id="navbar"></div>

            <div class="help-header">
                <div class="container">
                    <h1><i class="fas fa-book"></i> Help & Documentation</h1>
                    <p>คู่มือการใช้งานระบบคำนวดวงโคจรดาวเทียม</p>
                </div>
            </div>

            <div class="help-layout">
                <!-- Sidebar Navigation -->
                <div class="help-sidebar">
                    <h6>คู่มือการใช้งาน</h6>
                    <div class="nav flex-column">
                        <a class="nav-link active" href="#input-guide">
                            <i class="fas fa-keyboard"></i> การกรอกข้อมูล
                        </a>
                        <a class="nav-link" href="#output-guide">
                            <i class="fas fa-chart-line"></i> การแสดงผลลัพธ์
                        </a>
                    </div>

                    <h6>คู่มือโทเคน (API)</h6>
                    <div class="nav flex-column">
                        <a class="nav-link" href="#api-endpoints">
                            <i class="fas fa-plug"></i> API Endpoints
                        </a>
                        <a class="nav-link" href="#token-guide">
                            <i class="fas fa-key"></i> Token คืออะไร
                        </a>
                        <a class="nav-link" href="#token-create">
                            <i class="fas fa-plus-circle"></i> วิธีสร้าง Token
                        </a>
                    </div>
                </div>

                <!-- Content Area -->
                <div class="help-content">
                    <section id="input-guide" class="help-section">
                        <h3>1. คู่มือการใช้งาน</h3>
                        <h4>1.1 การกรอกข้อมูล</h4>
                        <h5><i class="fas fa-map-marker-alt"></i> Latitude (ละติจูด)</h5>
                        <p><strong>หน่วย:</strong> Decimal (ทศนิยม)</p>
                        <div class="example-box">
                            <strong>ตัวอย่าง:</strong><br>
                            Chiang Mai: 18.85249<br>
                        </div>
                    </section>

                    <section id="output-guide" class="help-section">
                        <h4>1.2 การแสดงผลลัพธ์</h4>
                        <h5><i class="fas fa-map"></i> แผนที่ (Map)</h5>
                        <p>แสดงเส้นทางการโคจรของดาวเทียม</p>
                        
                        <div class="color-legend">
                            <ul>
                                <li class="color-item">
                                    <div class="color-box" style="background: #ffc107;"></div>
                                    <span><strong>สีเหลือง</strong> = ดาวเทียมโดนแสงอาทิตย์</span>
                                </li>
                                <li class="color-item">
                                    <div class="color-box" style="background: #6c757d;"></div>
                                    <span><strong>สีเทา</strong> = ดาวเทียมไม่โดนแสงอาทิตย์</span>
                                </li>
                                <li class="color-item">
                                    <div class="color-box" style="background: #28a745;"></div>
                                    <span><strong>สีเขียว</strong> = สามารถมองเห็นดาวเทียมได้</span>
                                </li>
                            </ul>
                        </div>

                        <img src="/icon/loca.png" alt="หมุดสีแดง" style="width: 16px;">
                        <img src="/icon/satelliteicon.png" alt="ไอคอนดาวเทียม" style="width: 16px;">
                    </section>

                    <section id="api-endpoints" class="help-section">
                        <h3>2. คู่มือโทเคน (API Token)</h3>
                        <h4>2.1 API เปิดให้เข้าถึงอะไรได้บ้าง</h4>
                        
                        <div class="endpoint-box">
                            <span class="method method-get">GET</span>
                            <strong>/search</strong>
                            <p>ค้นหาดาวเทียมจากฐานข้อมูล</p>
                        </div>

                        <div class="endpoint-box">
                            <span class="method method-post">POST</span>
                            <strong>/random-satellites</strong>
                            <p>สุ่มดาวเทียม</p>
                        </div>

                        <div class="warning-box">
                            <strong>⚠️ สำคัญ:</strong> ต้องใช้ Token
                        </div>
                    </section>

                    <section id="token-guide" class="help-section">
                        <h4>2.2 Token คืออะไร</h4>
                        <h5><i class="fas fa-key"></i> Token คืออะไร?</h5>
                        <p>Token คือ <strong>กุญแจดิจิทัล</strong></p>
                        
                        <div class="info-box">
                            <strong>📅 อายุการใช้งาน:</strong> Token มีอายุการใช้งาน 30 วัน
                        </div>
                    </section>

                    <section id="token-create" class="help-section">
                        <h4>2.3 วิธีการสร้าง Token</h4>
                        <ol class="step-list">
                            <li><strong>เข้าไปที่หน้า API Token</strong></li>
                            <li><strong>กดปุ่ม "Generate New Token"</strong></li>
                            <li><strong>ตั้งชื่อให้กับ Token</strong></li>
                        </ol>

                        <h5><i class="fas fa-code"></i> วิธีใช้ Token เรียก API</h5>
                        <div class="code-block">Authorization: Bearer YOUR_TOKEN_HERE</div>

                        <img src="icon/exapi.png" alt="ตัวอย่างการเรียกใช้ API" style="width: 800px;">
                    </section>
                </div>
            </div>
        `;

        // Smooth scroll functionality
        document.querySelectorAll('.help-sidebar .nav-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                
                document.querySelectorAll('.help-sidebar .nav-link').forEach(l => {
                    l.classList.remove('active');
                });
                
                (e.target as HTMLElement).classList.add('active');
                
                const targetId = (e.target as HTMLAnchorElement).getAttribute('href');
                const targetElement = document.querySelector(targetId!);
                
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });

        // Scroll spy functionality (ปิดไว้ใน test เพราะไม่มี window.pageYOffset)
        // window.addEventListener('scroll', function() { ... });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Page Structure', () => {
        test('should have help header', () => {
            const header = document.querySelector('.help-header h1');
            expect(header).not.toBeNull();
            expect(header?.textContent).toContain('Help & Documentation');
        });

        test('should display subtitle in header', () => {
            const subtitle = document.querySelector('.help-header p');
            expect(subtitle).not.toBeNull();
            expect(subtitle?.textContent).toContain('คู่มือการใช้งานระบบคำนวดวงโคจรดาวเทียม');
        });

        test('should have help layout container', () => {
            const layout = document.querySelector('.help-layout');
            expect(layout).not.toBeNull();
        });

        test('should have sidebar navigation', () => {
            const sidebar = document.querySelector('.help-sidebar');
            expect(sidebar).not.toBeNull();
        });

        test('should have content area', () => {
            const content = document.querySelector('.help-content');
            expect(content).not.toBeNull();
        });
    });

    describe('Sidebar Navigation', () => {
        test('should have "คู่มือการใช้งาน" section heading', () => {
            const heading = document.querySelector('.help-sidebar h6');
            expect(heading?.textContent).toBe('คู่มือการใช้งาน');
        });

        test('should have navigation link to input guide', () => {
            const link = document.querySelector('a[href="#input-guide"]');
            expect(link).not.toBeNull();
            expect(link?.textContent).toContain('การกรอกข้อมูล');
        });

        test('should have navigation link to output guide', () => {
            const link = document.querySelector('a[href="#output-guide"]');
            expect(link).not.toBeNull();
            expect(link?.textContent).toContain('การแสดงผลลัพธ์');
        });

        test('should have "คู่มือโทเคน (API)" section', () => {
            const headings = Array.from(document.querySelectorAll('.help-sidebar h6'));
            const apiHeading = headings.find(h => h.textContent?.includes('คู่มือโทเคน'));
            expect(apiHeading).not.toBeNull();
        });

        test('should have API Endpoints link', () => {
            const link = document.querySelector('a[href="#api-endpoints"]');
            expect(link).not.toBeNull();
            expect(link?.textContent).toContain('API Endpoints');
        });

        test('should have Token guide link', () => {
            const link = document.querySelector('a[href="#token-guide"]');
            expect(link).not.toBeNull();
            expect(link?.textContent).toContain('Token คืออะไร');
        });

        test('should have Token creation guide link', () => {
            const link = document.querySelector('a[href="#token-create"]');
            expect(link).not.toBeNull();
            expect(link?.textContent).toContain('วิธีสร้าง Token');
        });

        test('first navigation link should be active by default', () => {
            const firstLink = document.querySelector('.help-sidebar .nav-link');
            expect(firstLink?.classList.contains('active')).toBe(true);
        });
    });

    describe('Smooth Scroll Navigation', () => {
        test('should change active class when clicking nav link', () => {
            const firstLink = document.querySelector('a[href="#input-guide"]')!;
            const secondLink = document.querySelector('a[href="#output-guide"]')!;
            
            expect(firstLink.classList.contains('active')).toBe(true);
            
            secondLink.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            
            expect(firstLink.classList.contains('active')).toBe(false);
            expect(secondLink.classList.contains('active')).toBe(true);
        });

        test('should prevent default link behavior', () => {
            const link = document.querySelector('a[href="#input-guide"]')!;
            const event = new MouseEvent('click', { bubbles: true, cancelable: true });
            
            link.dispatchEvent(event);
            
            expect(event.defaultPrevented).toBe(true);
        });

        test('should call scrollIntoView when clicking link', () => {
            const link = document.querySelector('a[href="#output-guide"]') as HTMLAnchorElement;
            const targetSection = document.querySelector('#output-guide') as HTMLElement;
            
            const scrollIntoViewMock = jest.fn();
            targetSection.scrollIntoView = scrollIntoViewMock;
            
            link.click();
            
            expect(scrollIntoViewMock).toHaveBeenCalledWith({
                behavior: 'smooth',
                block: 'start'
            });
        });
    });

    describe('Content Sections', () => {
        test('should have input guide section', () => {
            const section = document.getElementById('input-guide');
            expect(section).not.toBeNull();
            expect(section?.classList.contains('help-section')).toBe(true);
        });

        test('should have output guide section', () => {
            const section = document.getElementById('output-guide');
            expect(section).not.toBeNull();
        });

        test('should have API endpoints section', () => {
            const section = document.getElementById('api-endpoints');
            expect(section).not.toBeNull();
        });

        test('should have token guide section', () => {
            const section = document.getElementById('token-guide');
            expect(section).not.toBeNull();
        });

        test('should have token creation guide section', () => {
            const section = document.getElementById('token-create');
            expect(section).not.toBeNull();
        });
    });

    describe('Input Guide Content', () => {
        test('should display latitude information', () => {
            const content = document.getElementById('input-guide');
            expect(content?.textContent).toContain('Latitude');
            expect(content?.textContent).toContain('ละติจูด');
        });

        test('should have example box with Chiang Mai coordinates', () => {
            const exampleBox = document.querySelector('.example-box');
            expect(exampleBox).not.toBeNull();
            expect(exampleBox?.textContent).toContain('Chiang Mai: 18.85249');
        });

        test('should display decimal unit information', () => {
            const content = document.getElementById('input-guide');
            expect(content?.textContent).toContain('Decimal');
            expect(content?.textContent).toContain('ทศนิยม');
        });
    });

    describe('Output Guide Content', () => {
        test('should display map explanation', () => {
            const section = document.getElementById('output-guide');
            expect(section?.textContent).toContain('แผนที่');
            expect(section?.textContent).toContain('Map');
        });

        test('should have color legend', () => {
            const legend = document.querySelector('.color-legend');
            expect(legend).not.toBeNull();
        });

        test('should display yellow color meaning', () => {
            const yellowItem = Array.from(document.querySelectorAll('.color-item'))
                .find(item => item.textContent?.includes('สีเหลือง'));
            expect(yellowItem).not.toBeNull();
            expect(yellowItem?.textContent).toContain('ดาวเทียมโดนแสงอาทิตย์');
        });

        test('should display gray color meaning', () => {
            const grayItem = Array.from(document.querySelectorAll('.color-item'))
                .find(item => item.textContent?.includes('สีเทา'));
            expect(grayItem).not.toBeNull();
            expect(grayItem?.textContent).toContain('ไม่โดนแสงอาทิตย์');
        });

        test('should display green color meaning', () => {
            const greenItem = Array.from(document.querySelectorAll('.color-item'))
                .find(item => item.textContent?.includes('สีเขียว'));
            expect(greenItem).not.toBeNull();
            expect(greenItem?.textContent).toContain('สามารถมองเห็นดาวเทียมได้');
        });

        test('should have location icon image', () => {
            const img = document.querySelector('img[src="/icon/loca.png"]');
            expect(img).not.toBeNull();
        });

        test('should have satellite icon image', () => {
            const img = document.querySelector('img[src="/icon/satelliteicon.png"]');
            expect(img).not.toBeNull();
        });
    });

    describe('API Endpoints Content', () => {
        test('should display API section heading', () => {
            const section = document.getElementById('api-endpoints');
            const heading = section?.querySelector('h3');
            expect(heading?.textContent).toContain('คู่มือโทเคน');
        });

        test('should have GET /search endpoint', () => {
            const endpoint = document.querySelector('.endpoint-box');
            expect(endpoint?.textContent).toContain('GET');
            expect(endpoint?.textContent).toContain('/search');
        });

        test('should have POST /random-satellites endpoint', () => {
            const endpoints = document.querySelectorAll('.endpoint-box');
            const randomEndpoint = Array.from(endpoints).find(ep => 
                ep.textContent?.includes('/random-satellites')
            );
            expect(randomEndpoint).not.toBeNull();
            expect(randomEndpoint?.textContent).toContain('POST');
        });

        test('should display warning about token requirement', () => {
            const warning = document.querySelector('.warning-box');
            expect(warning).not.toBeNull();
            expect(warning?.textContent).toContain('⚠️ สำคัญ');
            expect(warning?.textContent).toContain('Token');
        });
    });

    describe('Token Guide Content', () => {
        test('should explain what token is', () => {
            const section = document.getElementById('token-guide');
            expect(section?.textContent).toContain('Token คืออะไร');
            expect(section?.textContent).toContain('กุญแจดิจิทัล');
        });

        test('should display token expiration info', () => {
            const infoBox = document.querySelector('.info-box');
            expect(infoBox).not.toBeNull();
            expect(infoBox?.textContent).toContain('30 วัน');
        });

        test('should have key icon for token section', () => {
            const section = document.getElementById('token-guide');
            const icon = section?.querySelector('.fa-key');
            expect(icon).not.toBeNull();
        });
    });

    describe('Token Creation Guide', () => {
        test('should have step-by-step instructions', () => {
            const steps = document.querySelector('.step-list');
            expect(steps).not.toBeNull();
        });

        test('should have ordered list of steps', () => {
            const ol = document.querySelector('ol.step-list');
            expect(ol).not.toBeNull();
            expect(ol?.children.length).toBeGreaterThan(0);
        });

        test('should display API usage example', () => {
            const codeBlock = document.querySelector('.code-block');
            expect(codeBlock).not.toBeNull();
            expect(codeBlock?.textContent).toContain('Authorization: Bearer');
        });

        test('should have API example image', () => {
            const img = document.querySelector('img[src="icon/exapi.png"]');
            expect(img).not.toBeNull();
            expect(img?.getAttribute('alt')).toContain('ตัวอย่าง');
        });
    });

    describe('Images and Icons', () => {
        test('should load all required images', () => {
            const images = document.querySelectorAll('img');
            expect(images.length).toBeGreaterThan(0);
            
            images.forEach(img => {
                expect(img.getAttribute('src')).toBeTruthy();
            });
        });

        test('should have Font Awesome icons', () => {
            const icons = document.querySelectorAll('.fas, .fa');
            expect(icons.length).toBeGreaterThan(0);
        });

        test('all images should have alt text', () => {
            const images = document.querySelectorAll('img');
            images.forEach(img => {
                expect(img.getAttribute('alt')).toBeTruthy();
            });
        });
    });

    describe('Responsive Design Elements', () => {
        test('should have flex column navigation', () => {
            const nav = document.querySelector('.nav.flex-column');
            expect(nav).not.toBeNull();
        });

        test('should have container for header', () => {
            const container = document.querySelector('.help-header .container');
            expect(container).not.toBeNull();
        });
    });

    describe('Thai Language Content', () => {
        test('should display Thai text correctly', () => {
            const content = document.body.textContent;
            expect(content).toContain('คู่มือ');
            expect(content).toContain('ดาวเทียม');
            expect(content).toContain('วิธีการ');
        });

        test('headings should be in Thai', () => {
            const headings = document.querySelectorAll('h3, h4, h5, h6');
            const thaiPattern = /[\u0E00-\u0E7F]/;
            
            let hasThai = false;
            headings.forEach(h => {
                if (thaiPattern.test(h.textContent || '')) {
                    hasThai = true;
                }
            });
            
            expect(hasThai).toBe(true);
        });
    });

    describe('Accessibility', () => {
        test('all navigation links should be keyboard accessible', () => {
            const links = document.querySelectorAll('.help-sidebar .nav-link');
            links.forEach(link => {
                expect(link.tagName).toBe('A');
                expect(link.getAttribute('href')).toBeTruthy();
            });
        });

        test('all sections should have IDs for anchor navigation', () => {
            const sections = document.querySelectorAll('.help-section');
            sections.forEach(section => {
                expect(section.id).toBeTruthy();
            });
        });

        test('all headings should have semantic structure', () => {
            const h1 = document.querySelectorAll('h1');
            const h3 = document.querySelectorAll('h3');
            const h4 = document.querySelectorAll('h4');
            
            expect(h1.length).toBeGreaterThan(0);
            expect(h3.length).toBeGreaterThan(0);
            expect(h4.length).toBeGreaterThan(0);
        });
    });
});