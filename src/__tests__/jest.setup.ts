// Test setup file
import '@testing-library/jest-dom'
import { createStore } from '../store/create-store'
import { createObservable } from '../factories/observable'

// Initialize store for all tests
createStore({
  test: {
    value$: createObservable({ initialValue: 'test value' }) as any,
  },
})

// Mock localStorage for persistent observable tests
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
  writable: true,
})
