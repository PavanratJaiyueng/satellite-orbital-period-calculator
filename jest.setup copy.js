// jest.setup.js

// Polyfill สำหรับ fetch API
global.fetch = jest.fn();

// Polyfill สำหรับ alert, confirm
global.alert = jest.fn();
global.confirm = jest.fn();

if (typeof PromiseRejectionEvent === 'undefined') {
  global.PromiseRejectionEvent = class PromiseRejectionEvent extends Event {
    constructor(type, options) {
      super(type);
      this.reason = options?.reason;
      this.promise = options?.promise;
    }
  };
}

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => { store[key] = value.toString(); }),
    removeItem: jest.fn((key) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: jest.fn((index) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    })
  };
})();
global.sessionStorage = sessionStorageMock;

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => { store[key] = value.toString(); }),
    removeItem: jest.fn((key) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: jest.fn((index) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    })
  };
})();
global.localStorage = localStorageMock;

// ===================================================
// Mock window.location (Stateful Mock ที่แก้ไขแล้ว)
// ใช้ delete/reassign เพื่อหลีกเลี่ยง TypeError
// ===================================================

// 1. Internal State: ใช้ตัวแปรภายในเพื่อเก็บ URL
let href = 'http://localhost/';
const DEFAULT_HREF = href; 

// 2. Helper function: อัปเดต State และจัดการ Relative Path
function updateLocation(url) {
    try {
        // ใช้ URL constructor เพื่อแปลง Path สัมพัทธ์ (/login) ให้เป็น URL เต็ม (http://localhost/login)
        const urlObj = new URL(url, DEFAULT_HREF);
        href = urlObj.href;
    } catch (e) {
        // Fallback
        href = url;
    }
}

// 3. Mock Object: กำหนด Getter/Setter ที่ถูกต้อง
const mockLocation = {
    // Mock Functions: ต้องเป็น jest.fn() และเรียก updateLocation() โดยตรง 
    // **ห้ามเรียก window.location.href = url; ซ้ำ**
    assign: jest.fn((url) => { updateLocation(url); }),
    reload: jest.fn(),
    replace: jest.fn((url) => { updateLocation(url); }),
    
    // Getter สำหรับ href: ดึงค่าจาก State ภายใน
    get href() {
        return href;
    },
    // Setter สำหรับ href: อัปเดต State ภายในเมื่อมีการเรียก window.location.href = '...'
    set href(url) {
        updateLocation(url); 
    },
    
    // Getters สำหรับ Properties อื่นๆ ที่คำนวณจาก href (เพื่อความสมบูรณ์)
    get pathname() {
        try { return new URL(href).pathname; } catch { return '/'; }
    },
    get search() {
        try { return new URL(href).search; } catch { return ''; }
    },
    get hash() {
        try { return new URL(href).hash; } catch { return ''; }
    },
    get host() { try { return new URL(href).host; } catch { return 'localhost'; } },
    get hostname() { try { return new URL(href).hostname; } catch { return 'localhost'; } },
    get port() { try { return new URL(href).port; } catch { return ''; } },
    get protocol() { try { return new URL(href).protocol; } catch { return 'http:'; } },
    get origin() { try { return new URL(href).origin; } catch { return 'http://localhost'; } },
    
    // Custom Property สำหรับใช้ในการ Reset ใน beforeEach()
    DEFAULT_HREF: DEFAULT_HREF,
};

// 4. แทนที่ window.location ใน JSDOM โดยตรง
// นี่คือวิธีที่ถูกต้องเพื่อหลีกเลี่ยง TypeError
delete window.location; 
window.location = mockLocation;

// ===================================================