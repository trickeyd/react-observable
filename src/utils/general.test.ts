import {
  isFunction,
  isObject,
  isPlainObject,
  tryCatch,
  tryCatchSync,
  uuid,
} from './general'

describe('General utilities', () => {
  describe('isFunction', () => {
    it('should return true for functions', () => {
      expect(isFunction(() => {})).toBe(true)
      expect(isFunction(function () {})).toBe(true)
      expect(isFunction(async () => {})).toBe(true)
      expect(isFunction(function* () {})).toBe(true)
    })

    it('should return false for non-functions', () => {
      expect(isFunction('string')).toBe(false)
      expect(isFunction(123)).toBe(false)
      expect(isFunction(true)).toBe(false)
      expect(isFunction(null)).toBe(false)
      expect(isFunction(undefined)).toBe(false)
      expect(isFunction({})).toBe(false)
      expect(isFunction([])).toBe(false)
    })

    it('should handle edge cases', () => {
      expect(isFunction(new Function())).toBe(true)
      expect(isFunction(Object)).toBe(true)
      expect(isFunction(Array)).toBe(true)
      expect(isFunction(Date)).toBe(true)
    })
  })

  describe('isObject', () => {
    it('should return true for objects', () => {
      expect(isObject({})).toBe(true)
      expect(isObject({ key: 'value' })).toBe(true)
      expect(isObject(new Object())).toBe(true)
      expect(isObject(Object.create(null))).toBe(true)
    })

    it('should return false for non-objects', () => {
      expect(isObject('string')).toBe(false)
      expect(isObject(123)).toBe(false)
      expect(isObject(true)).toBe(false)
      expect(isObject(null)).toBe(false)
      expect(isObject(undefined)).toBe(false)
      expect(isObject(() => {})).toBe(false)
    })

    it('should handle arrays', () => {
      expect(isObject([])).toBe(true)
      expect(isObject([1, 2, 3])).toBe(true)
      expect(isObject(new Array())).toBe(true)
    })

    it('should handle built-in objects', () => {
      expect(isObject(new Date())).toBe(true)
      expect(isObject(new RegExp('test'))).toBe(true)
      expect(isObject(new Error())).toBe(true)
      expect(isObject(new Map())).toBe(true)
      expect(isObject(new Set())).toBe(true)
    })
  })

  describe('isPlainObject', () => {
    it('should return true for plain objects', () => {
      expect(isPlainObject({})).toBe(true)
      expect(isPlainObject({ key: 'value' })).toBe(true)
      expect(isPlainObject(Object.create(null))).toBe(false)
    })

    it('should return false for non-plain objects', () => {
      expect(isPlainObject([])).toBe(false)
      expect(isPlainObject(new Date())).toBe(false)
      expect(isPlainObject(new RegExp('test'))).toBe(false)
      expect(isPlainObject(new Error())).toBe(false)
      expect(isPlainObject(new Map())).toBe(false)
      expect(isPlainObject(new Set())).toBe(false)
      expect(isPlainObject(() => {})).toBe(false)
    })

    it('should handle edge cases', () => {
      expect(isPlainObject(Object.create({}))).toBe(true)
      expect(isPlainObject(Object.create(Object.prototype))).toBe(true)
    })

    it('should handle null and undefined', () => {
      expect(isPlainObject(null)).toBe(false)
      expect(isPlainObject(undefined)).toBe(false)
    })
  })

  describe('tryCatch', () => {
    it('should return success result for successful operations', async () => {
      const [data, error] = await tryCatch(async () => 'success')
      expect(error).toBeUndefined()
      expect(data).toBe('success')
    })

    it('should return error result for failed operations', async () => {
      const errorObj = new Error('Test error')
      const [data, error] = await tryCatch(async () => {
        throw errorObj
      })
      expect(data).toBeUndefined()
      expect(error).toBe(errorObj)
    })

    it('should handle synchronous errors in async functions', async () => {
      const [data, error] = await tryCatch(async () => {
        throw new Error('Sync error')
      })
      expect(data).toBeUndefined()
      expect(error).toBeInstanceOf(Error)
      if (error) {
        expect(error.message).toBe('Sync error')
      }
    })

    it('should handle non-error throws', async () => {
      const [data, error] = await tryCatch(async () => {
        throw 'string error'
      })
      expect(data).toBeUndefined()
      expect(error).toBeInstanceOf(Error)
      if (error) {
        expect(error.message).toBe('string error')
      }
    })

    it('should handle complex return values', async () => {
      const complexValue = {
        name: 'test',
        data: [1, 2, 3],
        nested: { value: true },
      }
      const [data, error] = await tryCatch(async () => complexValue)
      expect(error).toBeUndefined()
      expect(data).toEqual(complexValue)
    })
  })

  describe('tryCatchSync', () => {
    it('should return success result for successful operations', () => {
      const [data, error] = tryCatchSync(() => 'success')
      expect(error).toBeUndefined()
      expect(data).toBe('success')
    })

    it('should return error result for failed operations', () => {
      const errorObj = new Error('Test error')
      const [data, error] = tryCatchSync(() => {
        throw errorObj
      })
      expect(data).toBeUndefined()
      expect(error).toBe(errorObj)
    })

    it('should handle non-error throws', () => {
      const [data, error] = tryCatchSync(() => {
        throw 'string error'
      })
      expect(data).toBeUndefined()
      expect(error).toBeInstanceOf(Error)
      if (error) {
        expect(error.message).toBe('string error')
      }
    })

    it('should handle complex return values', () => {
      const complexValue = {
        name: 'test',
        data: [1, 2, 3],
        nested: { value: true },
      }
      const [data, error] = tryCatchSync(() => complexValue)
      expect(error).toBeUndefined()
      expect(data).toEqual(complexValue)
    })

    it('should handle functions that return undefined', () => {
      const [data, error] = tryCatchSync(() => undefined)
      expect(error).toBeUndefined()
      expect(data).toBeUndefined()
    })
  })

  describe('uuid', () => {
    it('should generate unique strings', () => {
      const uuid1 = uuid()
      const uuid2 = uuid()

      expect(uuid1).not.toBe(uuid2)
      expect(typeof uuid1).toBe('string')
      expect(typeof uuid2).toBe('string')
    })

    it('should generate strings with expected format', () => {
      const generatedUuid = uuid()

      // Should be a string
      expect(typeof generatedUuid).toBe('string')

      // Should not be empty
      expect(generatedUuid.length).toBeGreaterThan(0)

      // Should contain only valid characters (alphanumeric and hyphens)
      expect(generatedUuid).toMatch(/^[a-zA-Z0-9-]+$/)
    })

    it('should generate multiple unique values', () => {
      const uuids: Set<string> = new Set()

      for (let i = 0; i < 100; i++) {
        uuids.add(uuid())
      }

      expect(uuids.size).toBe(100)
    })

    it('should handle rapid successive calls', () => {
      const uuids: string[] = []

      for (let i = 0; i < 10; i++) {
        uuids.push(uuid())
      }

      // All should be unique
      const uniqueUuids: Set<string> = new Set(uuids)
      expect(uniqueUuids.size).toBe(10)
    })
  })

  describe('Integration tests', () => {
    it('should work together in complex scenarios', async () => {
      const testObject = {
        method: () => 'result',
        asyncMethod: async () => 'async result',
        errorMethod: () => {
          throw new Error('test error')
        },
      }

      // Test isObject
      expect(isObject(testObject)).toBe(true)
      expect(isPlainObject(testObject)).toBe(true)

      // Test isFunction
      expect(isFunction(testObject.method)).toBe(true)
      expect(isFunction(testObject.asyncMethod)).toBe(true)
      expect(isFunction(testObject.errorMethod)).toBe(true)

      // Test tryCatch with function
      const [asyncData, asyncError] = await tryCatch(testObject.asyncMethod)
      expect(asyncError).toBeUndefined()
      expect(asyncData).toBe('async result')

      // Test tryCatchSync with function
      const [syncData, syncError] = tryCatchSync(testObject.method)
      expect(syncError).toBeUndefined()
      expect(syncData).toBe('result')

      // Test error handling
      const [errData, errError] = tryCatchSync(testObject.errorMethod)
      expect(errData).toBeUndefined()
      expect(errError).toBeInstanceOf(Error)

      // Test uuid generation
      const id = uuid()
      expect(typeof id).toBe('string')
      expect(id.length).toBeGreaterThan(0)
    })

    it('should handle edge cases in combination', () => {
      // Test with null/undefined
      expect(isObject(null)).toBe(false)
      expect(isObject(undefined)).toBe(false)
      expect(isFunction(null)).toBe(false)
      expect(isFunction(undefined)).toBe(false)

      // Test tryCatchSync with null/undefined
      const [nullData, nullError] = tryCatchSync(() => null)
      expect(nullError).toBeUndefined()
      expect(nullData).toBeNull()

      const [undefinedData, undefinedError] = tryCatchSync(() => undefined)
      expect(undefinedError).toBeUndefined()
      expect(undefinedData).toBeUndefined()
    })
  })
})
