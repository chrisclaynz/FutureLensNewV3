import { jest } from '@jest/globals';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
  removeItem: jest.fn()
};

// Define the localStorage property on window
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// Mock window.location
const locationMock = {
  href: 'http://localhost/',
  assign: jest.fn(),
  replace: jest.fn()
};

// Define the location property on window
delete window.location;
window.location = locationMock;

// Mock console methods to keep test output clean
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn()
};

// Mock document methods
document.getElementById = jest.fn(() => ({
  addEventListener: jest.fn(),
  style: { display: 'none' },
  textContent: ''
})); 