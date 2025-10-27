// jest.setupAfterEnv.ts

// ใช้ Type Declaration เพื่อให้ TypeScript รู้จัก Mock Properties ที่เรากำหนดเองใน jest.setup.js
declare global {
  namespace jest {
    // ขยาย Type ของ Mock Functions ที่เราสร้างขึ้น
    interface Mock {
      DEFAULT_HREF: string;
    }
  }
}

// ขยาย Type ของ window.location
interface CustomLocation extends Location {
    DEFAULT_HREF?: string;
}

// Silence jsdom navigation errors
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Not implemented: navigation') ||
       args[0].includes('Error: Not implemented'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Reset mocks before each test
beforeEach(() => {
  // 1. ล้างสถานะการถูกเรียกของ Mock Functions ทั้งหมด
  // คำสั่งนี้จะล้าง global.fetch, global.alert, global.confirm โดยอัตโนมัติ
  jest.clearAllMocks();
  
  // Reset sessionStorage and localStorage (ล้างข้อมูลใน store)
  if (global.sessionStorage && typeof global.sessionStorage.clear === 'function') {
      global.sessionStorage.clear();
  }
  if (global.localStorage && typeof global.localStorage.clear === 'function') {
      global.localStorage.clear();
  }
  
  // Reset window.location.href ไปยังค่าเริ่มต้น
  // ใช้ Type Assertion (as CustomLocation) เพื่อเข้าถึง DEFAULT_HREF ที่เรากำหนดเอง
  const loc = window.location as CustomLocation;
  if (loc && loc.DEFAULT_HREF) {
    loc.href = loc.DEFAULT_HREF;
  } else {
    // Fallback/Safety check
    window.location.href = 'http://localhost/';
  }
  
  // Reset mock functions สำหรับ location.replace และ location.assign
  // เนื่องจาก window.location เป็นวัตถุที่ถูกกำหนดค่าขึ้นใหม่ทั้งหมดใน jest.setup.js 
  // จึงจำเป็นต้องเรียก .mockClear() บนฟังก์ชันเหล่านี้แยกต่างหาก
  if (window.location && typeof (window.location.replace as jest.Mock).mockClear === 'function') {
    (window.location.replace as jest.Mock).mockClear();
  }
  if (window.location && typeof (window.location.assign as jest.Mock).mockClear === 'function') {
    (window.location.assign as jest.Mock).mockClear();
  }
});