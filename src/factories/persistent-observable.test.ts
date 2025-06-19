import { createPersistentObservable } from './persistent-observable'
import { createStore, resetStore } from '../store/create-store'
import { PersistentObservable } from '../types/observable'

// Mock storage implementation
const mockStorage = {
  data: new Map<string, string>(),
  getItem: jest.fn((key: string) =>
    Promise.resolve(mockStorage.data.get(key) || null),
  ),
  setItem: jest.fn((key: string, value: string) =>
    Promise.resolve(mockStorage.data.set(key, value)),
  ),
  removeItem: jest.fn((key: string) =>
    Promise.resolve(mockStorage.data.delete(key)),
  ),
  clear: jest.fn(() => Promise.resolve(mockStorage.data.clear())),
}

describe('createPersistentObservable', () => {
  beforeEach(() => {
    mockStorage.data.clear()
    jest.clearAllMocks()

    // Reset store and set up persistent storage for tests
    resetStore()
    createStore({}, { persistentStorage: mockStorage })
  })

  describe('Basic functionality', () => {
    it('should create a persistent observable', () => {
      const obs = createPersistentObservable({
        name: 'test-key',
        initialValue: 'default',
      })

      expect(obs.get()).toBe('default')
    })

    it('should load value from storage on creation', async () => {
      mockStorage.setItem('test-key', JSON.stringify('stored value'))

      const obs = createPersistentObservable({
        name: 'test-key',
        initialValue: 'default',
      }) as PersistentObservable<string>

      // Rehydrate to load from storage
      await obs.rehydrate()

      expect(obs.get()).toBe('stored value')
      expect(mockStorage.getItem).toHaveBeenCalledWith('test-key')
    })

    it('should use initial value when storage is empty', async () => {
      const obs = createPersistentObservable({
        name: 'test-key',
        initialValue: 'default',
      }) as PersistentObservable<string>

      // Rehydrate to check storage
      await obs.rehydrate()

      expect(obs.get()).toBe('default')
      expect(mockStorage.getItem).toHaveBeenCalledWith('test-key')
    })

    it('should handle function initial value', () => {
      const obs = createPersistentObservable({
        name: 'test-key',
        initialValue: () => 'function default',
      })

      expect(obs.get()).toBe('function default')
    })
  })

  describe('Persistence behavior', () => {
    it('should save value to storage when set', async () => {
      const obs = createPersistentObservable({
        name: 'test-key',
        initialValue: 'default',
      })

      obs.set('new value')

      // Wait for async storage operation
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify('new value'),
      )
    })

    it('should save complex objects to storage', async () => {
      const obs = createPersistentObservable({
        name: 'test-key',
        initialValue: { name: 'default' },
      })

      const complexValue = { name: 'John', age: 25, active: true }
      obs.set(complexValue)

      // Wait for async storage operation
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify(complexValue),
      )
    })

    it('should save arrays to storage', async () => {
      const obs = createPersistentObservable({
        name: 'test-key',
        initialValue: [] as (string | number)[],
      })

      const arrayValue = [1, 2, 3, 'test']
      obs.set(arrayValue)

      // Wait for async storage operation
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify(arrayValue),
      )
    })

    it('should handle function setter', async () => {
      const obs = createPersistentObservable({
        name: 'test-key',
        initialValue: 10,
      })

      obs.set((current) => current + 5)

      // Wait for async storage operation
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify(15),
      )
    })
  })

  describe('Hydration', () => {
    it('should hydrate from storage correctly', async () => {
      const storedData = { user: 'John', settings: { theme: 'dark' } }
      mockStorage.setItem('test-key', JSON.stringify(storedData))

      const obs = createPersistentObservable({
        name: 'test-key',
        initialValue: { user: 'default' },
      }) as PersistentObservable<{ user: string; settings?: { theme: string } }>

      await obs.rehydrate()
      expect(obs.get()).toEqual(storedData)
    })

    it('should handle invalid JSON in storage', async () => {
      mockStorage.setItem('test-key', 'invalid json')

      const obs = createPersistentObservable({
        name: 'test-key',
        initialValue: 'default',
      }) as PersistentObservable<string>

      await obs.rehydrate()
      expect(obs.get()).toBe('default')
    })

    it('should handle null values from storage', async () => {
      mockStorage.setItem('test-key', JSON.stringify(null))

      const obs = createPersistentObservable({
        name: 'test-key',
        initialValue: 'default',
      }) as PersistentObservable<string>

      await obs.rehydrate()
      expect(obs.get()).toBeNull()
    })

    it('should handle undefined values from storage', async () => {
      mockStorage.setItem('test-key', JSON.stringify(undefined))

      const obs = createPersistentObservable({
        name: 'test-key',
        initialValue: 'default',
      }) as PersistentObservable<string>

      await obs.rehydrate()
      expect(obs.get()).toBe('default')
    })
  })

  describe('Storage error handling', () => {
    it('should handle storage get errors gracefully', async () => {
      const errorStorage = {
        ...mockStorage,
        getItem: jest.fn(() => {
          throw new Error('Storage error')
        }),
      }

      // Reset and recreate store with error storage
      resetStore()
      createStore({}, { persistentStorage: errorStorage })

      const obs = createPersistentObservable({
        name: 'test-key',
        initialValue: 'default',
      }) as PersistentObservable<string>

      await expect(obs.rehydrate()).rejects.toThrow('Storage error')
      expect(obs.get()).toBe('default')
    })

    it('should handle storage set errors gracefully', async () => {
      const errorStorage = {
        ...mockStorage,
        setItem: jest.fn(() => {
          throw new Error('Storage error')
        }),
      }

      // Reset and recreate store with error storage
      resetStore()
      createStore({}, { persistentStorage: errorStorage })

      const obs = createPersistentObservable({
        name: 'test-key',
        initialValue: 'default',
      })

      // Should not throw error
      expect(() => obs.set('new value')).not.toThrow()
      expect(obs.get()).toBe('new value')
    })
  })

  describe('Observable functionality', () => {
    it('should maintain all observable functionality', () => {
      const obs = createPersistentObservable({
        name: 'test-key',
        initialValue: 'default',
      })

      const listener = jest.fn()
      obs.subscribe(listener)

      obs.set('new value')
      expect(listener).toHaveBeenCalledWith('new value', expect.any(Array))
    })

    it('should handle subscriptions correctly', () => {
      const obs = createPersistentObservable({
        name: 'test-key',
        initialValue: 'default',
      })

      const listener = jest.fn()
      const unsubscribe = obs.subscribe(listener)

      obs.set('value1')
      unsubscribe()
      obs.set('value2')

      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener).toHaveBeenCalledWith('value1', expect.any(Array))
    })

    it('should handle error emissions', () => {
      const obs = createPersistentObservable({
        name: 'test-key',
        initialValue: 'default',
      })

      const errorHandler = jest.fn()
      obs.subscribe(undefined, errorHandler)

      const error = new Error('Test error')
      obs.emitError(error)

      expect(errorHandler).toHaveBeenCalledWith(error, expect.any(Array))
    })

    it('should handle completion', () => {
      const obs = createPersistentObservable({
        name: 'test-key',
        initialValue: 'default',
      })

      const completeHandler = jest.fn()
      obs.subscribe(undefined, undefined, completeHandler)

      obs.emitComplete()
      expect(completeHandler).toHaveBeenCalledWith(expect.any(Array))
    })
  })

  describe('Key management', () => {
    it('should use different keys for different observables', async () => {
      const obs1 = createPersistentObservable({
        name: 'key1',
        initialValue: 'value1',
      })

      const obs2 = createPersistentObservable({
        name: 'key2',
        initialValue: 'value2',
      })

      obs1.set('new1')
      obs2.set('new2')

      // Wait for async storage operations
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'key1',
        JSON.stringify('new1'),
      )
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'key2',
        JSON.stringify('new2'),
      )
    })

    it('should handle key collisions', async () => {
      const obs1 = createPersistentObservable({
        name: 'same-key',
        initialValue: 'value1',
      })

      const obs2 = createPersistentObservable({
        name: 'same-key',
        initialValue: 'value2',
      }) as PersistentObservable<string>

      obs1.set('new1')

      // Wait for async storage operation
      await new Promise((resolve) => setTimeout(resolve, 0))

      await obs2.rehydrate()
      expect(obs2.get()).toBe('new1') // Should share storage
    })
  })

  describe('Performance considerations', () => {
    it('should not save on silent set', async () => {
      const obs = createPersistentObservable({
        name: 'test-key',
        initialValue: 'default',
      })

      obs.setSilent('silent value')

      // Wait for any async operations
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockStorage.setItem).toHaveBeenCalled()
      expect(obs.get()).toBe('silent value')
    })

    it('should handle large objects efficiently', async () => {
      const largeObject = {
        data: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          value: `item-${i}`,
        })),
        metadata: { timestamp: Date.now(), version: '1.0' },
      }

      const obs = createPersistentObservable({
        name: 'large-key',
        initialValue: {
          data: [] as any[],
          metadata: { timestamp: 0, version: '0.0' },
        },
      })

      expect(() => obs.set(largeObject)).not.toThrow()

      // Wait for async storage operation
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'large-key',
        JSON.stringify(largeObject),
      )
    })
  })

  describe('Edge cases', () => {
    it('should handle circular references gracefully', async () => {
      const circular: any = { name: 'test' }
      circular.self = circular

      const obs = createPersistentObservable({
        name: 'circular-key',
        initialValue: 'default',
      })

      // Should not throw when setting circular reference
      expect(() => obs.set(circular)).not.toThrow()

      // Wait for async storage operation
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    it('should handle functions in objects', async () => {
      const objWithFunction = {
        name: 'test',
        method: () => 'hello',
      }

      const obs = createPersistentObservable({
        name: 'function-key',
        initialValue: 'default' as any,
      })

      obs.set(objWithFunction as any)

      // Wait for async storage operation
      await new Promise((resolve) => setTimeout(resolve, 0))

      // Functions should be lost in JSON serialization
      const saved = JSON.parse(mockStorage.setItem.mock.calls[0][1])
      expect(saved.method).toBeUndefined()
    })

    it('should handle undefined storage', () => {
      // Reset and create store without persistent storage
      resetStore()
      createStore({})

      const obs = createPersistentObservable({
        name: 'test-key',
        initialValue: 'default',
      })

      expect(() => obs.set('new value')).not.toThrow()
      expect(obs.get()).toBe('new value')
    })
  })
})
