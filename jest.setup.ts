// jest.setup.ts

// Polyfill สำหรับ fetch API
global.fetch = jest.fn();

// Polyfill สำหรับ alert, confirm
global.alert = jest.fn();
global.confirm = jest.fn();

if (typeof PromiseRejectionEvent === 'undefined') {
  global.PromiseRejectionEvent = class PromiseRejectionEvent extends Event {
    reason: any;
    promise: Promise<any>;

    constructor(type: string, options: { reason?: any, promise?: Promise<any> }) {
      super(type);
      this.reason = options?.reason;
      this.promise = options?.promise as Promise<any>;
    }
  } as typeof PromiseRejectionEvent;
}

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value.toString(); }),
    removeItem: jest.fn((key: string) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: jest.fn((index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    })
  };
})();
global.sessionStorage = sessionStorageMock as any;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value.toString(); }),
    removeItem: jest.fn((key: string) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: jest.fn((index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    })
  };
})();
global.localStorage = localStorageMock as any;