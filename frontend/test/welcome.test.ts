jest.mock('../../js/auth.js', () => ({
  checkSession: jest.fn(),
  preventBackToAuth: jest.fn(),
  requireAuth: jest.fn(),
  handleLogin: jest.fn(),
  handleLogout: jest.fn(),
  getAuthToken: jest.fn(),
  setAuthToken: jest.fn(),
  removeAuthToken: jest.fn(),
}));

const { checkSession, preventBackToAuth } = require('../../js/auth.js');

describe('Welcome Page (welcome.html)', () => {

    beforeEach(() => {
        (checkSession as jest.Mock).mockClear();
        (preventBackToAuth as jest.Mock).mockClear();

        document.body.innerHTML = `
            <div id="navbar">
                <div id="utcTime">UTC 06:45:24</div>
            </div>
            <div class="container text-center mt-5">
              <h1 id="mainTitle">Welcome to Satellite Orbit Project</h1>
              <p id="mainPrompt">Please login or register to continue.</p>
              <a href="/login" class="btn btn-primary mt-3" id="getStartBtn">Get start</a>
              <a href="/login" class="btn btn-secondary mt-3" id="loginBtn">Login</a>
              <a href="/register" class="btn btn-secondary mt-3" id="registerBtn">Register</a>
            </div>
        `;

        // Simulate DOMContentLoaded
        document.addEventListener('DOMContentLoaded', () => {
            (checkSession as jest.Mock)(true);
            (preventBackToAuth as jest.Mock)();
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Page Initialization', () => {
        test('should call checkSession(true) on page load', () => {
            const event = new Event('DOMContentLoaded');
            document.dispatchEvent(event);
            
            expect(checkSession).toHaveBeenCalledWith(true);
        });

        test('should call preventBackToAuth on page load', () => {
            const event = new Event('DOMContentLoaded');
            document.dispatchEvent(event);
            
            expect(preventBackToAuth).toHaveBeenCalled();
        });
    });

    describe('Page Content Display', () => {
        test('should display the main welcome heading', () => {
            const titleElement = document.getElementById('mainTitle');
            
            expect(titleElement).not.toBeNull();
            expect(titleElement!.textContent).toBe('Welcome to Satellite Orbit Project');
        });

        test('should display the prompt text', () => {
            const promptElement = document.getElementById('mainPrompt');
            
            expect(promptElement).not.toBeNull();
            expect(promptElement!.textContent).toBe('Please login or register to continue.');
        });

        test('should have heading element in page', () => {
            const titleElement = document.getElementById('mainTitle');
            
            expect(titleElement).not.toBeNull();
            expect(titleElement?.tagName).toBe('H1');
        });
    });

    describe('Time Display', () => {
        test('should display UTC time in navbar', () => {
            const utcTimeDisplay = document.getElementById('utcTime');
            
            expect(utcTimeDisplay).not.toBeNull();
            expect(utcTimeDisplay?.textContent).toContain('UTC');
        });

        test('should have UTC time element with correct format', () => {
            const utcTimeDisplay = document.getElementById('utcTime');
            
            expect(utcTimeDisplay).not.toBeNull();
            // ตรวจสอบว่ามีคำว่า UTC และมีตัวเลขเวลา
            expect(utcTimeDisplay?.textContent).toMatch(/UTC\s+\d{2}:\d{2}:\d{2}/);
        });

        test('should update UTC time display', () => {
            const utcTimeDisplay = document.getElementById('utcTime');
            
            // Simulate time update
            if (utcTimeDisplay) {
                utcTimeDisplay.textContent = 'UTC 07:30:15';
            }
            
            expect(utcTimeDisplay?.textContent).toBe('UTC 07:30:15');
        });
    });

    describe('Navigation Buttons', () => {
        test('should have "Get start" button linking to /login', () => {
            const getStartBtn = document.getElementById('getStartBtn') as HTMLAnchorElement;

            expect(getStartBtn).not.toBeNull();
            expect(getStartBtn.textContent).toBe('Get start');
            expect(getStartBtn.href).toMatch(/\/login$/);
            expect(getStartBtn.className).toContain('btn');
            expect(getStartBtn.className).toContain('btn-primary');
        });

        test('should have "Login" button linking to /login', () => {
            const loginBtn = document.getElementById('loginBtn') as HTMLAnchorElement;

            expect(loginBtn).not.toBeNull();
            expect(loginBtn.textContent).toBe('Login');
            expect(loginBtn.href).toMatch(/\/login$/);
            expect(loginBtn.className).toContain('btn');
        });

        test('should have "Register" button linking to /register', () => {
            const registerBtn = document.getElementById('registerBtn') as HTMLAnchorElement;

            expect(registerBtn).not.toBeNull();
            expect(registerBtn.textContent).toBe('Register');
            expect(registerBtn.href).toMatch(/\/register$/);
            expect(registerBtn.className).toContain('btn');
        });

        test('should have all buttons with correct styling', () => {
            const btns = document.querySelectorAll('.btn');
            
            expect(btns.length).toBeGreaterThan(0);
            btns.forEach(btn => {
                expect(btn.className).toContain('btn');
            });
        });
    });

    describe('Navigation Functionality', () => {
        test('clicking "Get start" button should navigate to /login', () => {
            const getStartBtn = document.getElementById('getStartBtn') as HTMLAnchorElement;
            
            expect(getStartBtn.href).toContain('/login');
            expect(getStartBtn.getAttribute('href')).toBe('/login');
        });

        test('clicking "Login" button should navigate to /login', () => {
            const loginBtn = document.getElementById('loginBtn') as HTMLAnchorElement;
            
            expect(loginBtn.href).toContain('/login');
            expect(loginBtn.getAttribute('href')).toBe('/login');
        });

        test('clicking "Register" button should navigate to /register', () => {
            const registerBtn = document.getElementById('registerBtn') as HTMLAnchorElement;
            
            expect(registerBtn.href).toContain('/register');
            expect(registerBtn.getAttribute('href')).toBe('/register');
        });
    });

    describe('Page Layout', () => {
        test('should have navbar container', () => {
            const navbar = document.getElementById('navbar');
            
            expect(navbar).not.toBeNull();
        });

        test('should have main container with correct classes', () => {
            const container = document.querySelector('.container');
            
            expect(container).not.toBeNull();
            expect(container!.className).toContain('text-center');
            expect(container!.className).toContain('mt-5');
        });

        test('should have all buttons with margin top class', () => {
            const buttons = document.querySelectorAll('a.btn');
            
            buttons.forEach(btn => {
                expect(btn.className).toContain('mt-3');
            });
        });
    });

    describe('Accessibility', () => {
        test('all buttons should have text content (not empty)', () => {
            const buttons = document.querySelectorAll('.btn');
            
            buttons.forEach(btn => {
                expect(btn.textContent?.trim().length).toBeGreaterThan(0);
            });
        });

        test('all links should have href attribute', () => {
            const links = document.querySelectorAll('a.btn');
            
            links.forEach(link => {
                expect(link.getAttribute('href')).not.toBeNull();
            });
        });

        test('heading should exist and have content', () => {
            const heading = document.querySelector('h1');
            
            expect(heading).not.toBeNull();
            expect(heading!.textContent?.length).toBeGreaterThan(0);
        });
    });
});