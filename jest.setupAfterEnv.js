// jest.setupAfterEnv.js

// Silence jsdom navigation errors
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    const firstArg = args[0];
    
    // Check if it's a string
    if (typeof firstArg === 'string' && firstArg.includes('Not implemented: navigation')) {
      return;
    }
    
    // Check if it's an Error object
    if (firstArg instanceof Error && firstArg.message.includes('Not implemented: navigation')) {
      return;
    }
    
    // Check if it has a 'type' property set to 'not implemented'
    if (firstArg && typeof firstArg === 'object' && firstArg.type === 'not implemented') {
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
  jest.clearAllMocks();
  
  // Reset sessionStorage and localStorage
  if (global.sessionStorage && typeof global.sessionStorage.clear === 'function') {
      global.sessionStorage.clear();
  }
  if (global.localStorage && typeof global.localStorage.clear === 'function') {
      global.localStorage.clear();
  }
});