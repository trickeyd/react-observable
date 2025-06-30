import { createObservable } from './observable'

describe('createObservable', () => {
  describe('Basic functionality', () => {
    it('should create an observable with initial value', () => {
      const obs = createObservable({ initialValue: 'test' })
      expect(obs.get()).toBe('test')
    })

    it('should create an observable with function initial value', () => {
      const obs = createObservable({ initialValue: () => 'test' })
      expect(obs.get()).toBe('test')
    })

    it('should create an observable with undefined initial value', () => {
      const obs = createObservable()
      expect(obs.get()).toBeUndefined()
    })

    it('should have unique ID', () => {
      const obs1 = createObservable()
      const obs2 = createObservable()
      expect(obs1.getId()).not.toBe(obs2.getId())
    })

    it('should have default name based on ID', () => {
      const obs = createObservable()
      expect(obs.getName()).toBe(obs.getId())
    })

    it('should allow setting custom name', () => {
      const obs = createObservable({ name: 'custom-name' })
      expect(obs.getName()).toBe('custom-name')
    })

    it('should allow changing name', () => {
      const obs = createObservable({ name: 'old-name' })
      obs.setName('new-name')
      expect(obs.getName()).toBe('new-name')
    })
  })

  describe('Value setting and getting', () => {
    it('should set and get primitive values', () => {
      const obs = createObservable({ initialValue: 0 })
      obs.set(42)
      expect(obs.get()).toBe(42)
    })

    it('should set and get object values', () => {
      const obs = createObservable({ initialValue: { name: 'test' } })
      const newValue = { name: 'updated', age: 25 }
      obs.set(newValue)
      expect(obs.get()).toEqual(newValue)
    })

    it('should set value using function', () => {
      const obs = createObservable({ initialValue: 10 })
      obs.set((current) => current + 5)
      expect(obs.get()).toBe(15)
    })

    it('should not emit when value is the same', () => {
      const obs = createObservable({ initialValue: 'test' })
      const listener = jest.fn()
      obs.subscribe(listener)

      obs.set('test') // Same value
      expect(listener).not.toHaveBeenCalled()
    })

    it('should not emit when equality function returns true', () => {
      const obs = createObservable({
        initialValue: { id: 1, name: 'test' },
        equalityFn: (a, b) => a.id === b.id,
      })
      const listener = jest.fn()
      obs.subscribe(listener)

      // Setting same ID but different name - equalityFn returns true, so should NOT emit
      obs.set({ id: 1, name: 'different' })
      expect(listener).not.toHaveBeenCalled()
    })

    it('should emit when equality function returns false', () => {
      const obs = createObservable({
        initialValue: { id: 1, name: 'test' },
        equalityFn: (a, b) => a.id === b.id,
      })
      const listener = jest.fn()
      obs.subscribe(listener)

      // Setting different ID - equalityFn returns false, so should emit
      obs.set({ id: 2, name: 'test' })
      expect(listener).toHaveBeenCalledWith(
        { id: 2, name: 'test' },
        expect.any(Array),
      )
    })
  })

  describe('Subscription and emission', () => {
    it('should notify subscribers when value changes', () => {
      const obs = createObservable({ initialValue: 'initial' })
      const listener = jest.fn()
      obs.subscribe(listener)

      obs.set('new value')
      expect(listener).toHaveBeenCalledWith('new value', expect.any(Array))
    })

    it('should notify multiple subscribers', () => {
      const obs = createObservable({ initialValue: 'initial' })
      const listener1 = jest.fn()
      const listener2 = jest.fn()

      obs.subscribe(listener1)
      obs.subscribe(listener2)

      obs.set('new value')
      expect(listener1).toHaveBeenCalledWith('new value', expect.any(Array))
      expect(listener2).toHaveBeenCalledWith('new value', expect.any(Array))
    })

    it('should allow unsubscribing', () => {
      const obs = createObservable({ initialValue: 'initial' })
      const listener = jest.fn()
      const unsubscribe = obs.subscribe(listener)

      unsubscribe()
      obs.set('new value')
      expect(listener).not.toHaveBeenCalled()
    })

    it('should handle subscribeOnce correctly', () => {
      const obs = createObservable({ initialValue: 'initial' })
      const listener = jest.fn()
      obs.subscribeOnce(listener)

      obs.set('first')
      obs.set('second')

      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener).toHaveBeenCalledWith('first', expect.any(Array))
    })

    it('should handle subscribeWithValue correctly', () => {
      const obs = createObservable({ initialValue: 'initial' })
      const listener = jest.fn()
      obs.subscribeWithValue(listener)

      expect(listener).toHaveBeenCalledWith('initial')

      obs.set('new value')
      expect(listener).toHaveBeenCalledWith('new value', expect.any(Array))
    })

    it('should track emit count', () => {
      const obs = createObservable({ initialValue: 'initial' })
      expect(obs.getEmitCount()).toBe(0)

      obs.set('first')
      expect(obs.getEmitCount()).toBe(1)

      obs.set('second')
      expect(obs.getEmitCount()).toBe(2)
    })
  })

  describe('Error handling', () => {
    it('should emit errors to error subscribers', () => {
      const obs = createObservable({ initialValue: 'initial' })
      const errorHandler = jest.fn()
      obs.subscribe(undefined, errorHandler)

      const error = new Error('Test error')
      obs.emitError(error)

      expect(errorHandler).toHaveBeenCalledWith(error, expect.any(Array))
    })

    it('should handle errors in catchError', () => {
      const obs = createObservable({ initialValue: 'initial' })
      const errorHandler = jest.fn()
      const errorObservable = obs.catchError(errorHandler)

      const error = new Error('Test error')
      obs.emitError(error)

      expect(errorHandler).toHaveBeenCalledWith(error, 'initial')
    })

    it('should allow recovery from errors', () => {
      const obs = createObservable({ initialValue: 'initial' })
      const errorObservable = obs.catchError((error, currentValue) => {
        return { restoreValue: 'recovered' }
      })

      obs.emitError(new Error('Test error'))
      expect(errorObservable.get()).toBe('recovered')
    })
  })

  describe('Stream completion', () => {
    it('should emit completion to completion subscribers', () => {
      const obs = createObservable({ initialValue: 'initial' })
      const completeHandler = jest.fn()
      obs.subscribe(undefined, undefined, completeHandler)

      obs.emitStreamHalted()
      expect(completeHandler).toHaveBeenCalledWith(expect.any(Array))
    })
  })

  describe('Stack tracking', () => {
    it('should include stack information in emissions', () => {
      const obs = createObservable({ initialValue: 'initial' })
      const listener = jest.fn()
      obs.subscribe(listener)

      obs.set('new value')

      const callArgs = listener.mock.calls[0]
      const stack = callArgs[1]

      expect(stack).toBeInstanceOf(Array)
      expect(stack[0]).toHaveProperty('id')
      expect(stack[0]).toHaveProperty('name')
      expect(stack[0]).toHaveProperty('emitCount')
      expect(stack[0]).toHaveProperty('isError')
    })

    it('should mark error stack items as errors', () => {
      const obs = createObservable({ initialValue: 'initial' })
      const errorHandler = jest.fn()
      obs.subscribe(undefined, errorHandler)

      obs.emitError(new Error('Test error'))

      const callArgs = errorHandler.mock.calls[0]
      const stack = callArgs[1]

      expect(stack[0].isError).toBe(true)
    })
  })

  describe('Stream operations', () => {
    it('should handle stream projection', () => {
      const obs = createObservable({ initialValue: 5 })
      const streamed = obs.stream((value) => value * 2)

      expect(streamed.get()).toBe(10)

      obs.set(10)
      expect(streamed.get()).toBe(20)
    })

    it('should handle async stream projection', async () => {
      const obs = createObservable({ initialValue: 5 })
      const streamed = obs.streamAsync(async (value) => value * 2)

      // Trigger the stream by setting a different value
      obs.set(10)

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(streamed.get()).toBe(20)
    })

    it('should handle tap operator', () => {
      const obs = createObservable({ initialValue: 'initial' })
      const sideEffect = jest.fn()
      const tapped = obs.tap(sideEffect)

      // Should return a new observable, not the same one
      expect(tapped).not.toBe(obs)
      expect(tapped.get()).toBe('initial')
      // Should not call callback on creation
      expect(sideEffect).not.toHaveBeenCalled()

      // Test that tap calls callback and passes through values when emitted
      const listener = jest.fn()
      tapped.subscribe(listener)

      obs.set('new value')
      expect(sideEffect).toHaveBeenCalledWith('new value')
      expect(listener).toHaveBeenCalledWith('new value', expect.any(Array))
      expect(tapped.get()).toBe('new value')
    })

    it('should handle tap operator with chaining', () => {
      const obs = createObservable({ initialValue: 5 })
      const tap1 = jest.fn()
      const tap2 = jest.fn()

      const chained = obs.tap(tap1).tap(tap2)

      expect(chained.get()).toBe(5)
      // Should not call callbacks on creation
      expect(tap1).not.toHaveBeenCalled()
      expect(tap2).not.toHaveBeenCalled()

      const listener = jest.fn()
      chained.subscribe(listener)

      obs.set(10)
      expect(tap1).toHaveBeenCalledWith(10)
      expect(tap2).toHaveBeenCalledWith(10)
      expect(listener).toHaveBeenCalledWith(10, expect.any(Array))
    })

    it('should handle tap operator with objects', () => {
      const obs = createObservable({ initialValue: { name: 'test', count: 0 } })
      const sideEffect = jest.fn()
      const tapped = obs.tap(sideEffect)

      expect(tapped.get()).toEqual({ name: 'test', count: 0 })
      // Should not call callback on creation
      expect(sideEffect).not.toHaveBeenCalled()

      const listener = jest.fn()
      tapped.subscribe(listener)

      obs.set({ name: 'updated', count: 5 })
      expect(sideEffect).toHaveBeenCalledWith({ name: 'updated', count: 5 })
      expect(listener).toHaveBeenCalledWith(
        { name: 'updated', count: 5 },
        expect.any(Array),
      )
    })

    it('should handle delay operator', async () => {
      const obs = createObservable({ initialValue: 'initial' })
      const delayed = obs.delay(10) // Use a small delay for testing
      const listener = jest.fn()
      delayed.subscribe(listener)

      obs.set('new value')
      expect(listener).not.toHaveBeenCalled()

      // Wait for the delay
      await new Promise((resolve) => setTimeout(resolve, 20))
      expect(listener).toHaveBeenCalledWith('new value', expect.any(Array))
    })

    it('should handle guard operator', () => {
      const obs = createObservable({ initialValue: 5 })
      const guarded = obs.guard((next, prev) => next > prev)
      const listener = jest.fn()
      guarded.subscribe(listener)

      obs.set(3) // Should not emit (3 < 5)
      expect(listener).not.toHaveBeenCalled()

      obs.set(7) // Should emit (7 > 5)
      expect(listener).toHaveBeenCalledWith(7, expect.any(Array))
    })
  })

  describe('Combination operations', () => {
    it('should handle combineLatestFrom', () => {
      const obs1 = createObservable({ initialValue: 'a' })
      const obs2 = createObservable({ initialValue: 1 })
      const combined = obs1.combineLatestFrom(obs2)

      expect(combined.get()).toEqual(['a', 1])

      obs1.set('b')
      expect(combined.get()).toEqual(['b', 1])

      obs2.set(2)
      expect(combined.get()).toEqual(['b', 2])
    })

    it('should handle withLatestFrom', () => {
      const obs1 = createObservable({ initialValue: 'a' })
      const obs2 = createObservable({ initialValue: 1 })
      const withLatest = obs1.withLatestFrom(obs2)

      expect(withLatest.get()).toEqual(['a', 1])

      obs1.set('b')
      expect(withLatest.get()).toEqual(['b', 1])

      // withLatestFrom only updates when the source observable changes
      // Changing obs2 doesn't trigger an update
      obs2.set(2)
      expect(withLatest.get()).toEqual(['b', 1])
    })
  })

  describe('Map entries', () => {
    it('should map observable entries', () => {
      const obs = createObservable({ initialValue: { name: 'test', age: 25 } })
      const mapped = obs.mapEntries({ keys: ['name', 'age'] })

      expect(mapped).toHaveProperty('name$')
      expect(mapped).toHaveProperty('age$')
      expect(mapped.name$.get()).toBe('test')
      expect(mapped.age$.get()).toBe(25)
    })

    it('should update mapped entries when source changes', () => {
      const obs = createObservable({ initialValue: { name: 'test', age: 25 } })
      const mapped = obs.mapEntries({ keys: ['name', 'age'] })

      obs.set({ name: 'updated', age: 30 })

      expect(mapped.name$.get()).toBe('updated')
      expect(mapped.age$.get()).toBe(30)
    })
  })

  describe('Reset functionality', () => {
    it('should reset to initial value', () => {
      const obs = createObservable({ initialValue: 'initial' })
      obs.set('changed')
      expect(obs.get()).toBe('changed')

      obs.reset()
      expect(obs.get()).toBe('initial')
    })

    it('should reset function initial value', () => {
      const obs = createObservable({ initialValue: () => 'initial' })
      obs.set('changed')
      expect(obs.get()).toBe('changed')

      obs.reset()
      expect(obs.get()).toBe('initial')
    })
  })

  describe('Silent operations', () => {
    it('should set value without emitting', () => {
      const obs = createObservable({ initialValue: 'initial' })
      const listener = jest.fn()
      obs.subscribe(listener)

      obs.setSilent('silent')
      expect(obs.get()).toBe('silent')
      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('emitWhenValuesAreEqual option', () => {
    it('should emit when value is the same if emitWhenValuesAreEqual is true', () => {
      const obs = createObservable({
        initialValue: 'test',
        emitWhenValuesAreEqual: true,
      })
      const listener = jest.fn()
      obs.subscribe(listener)

      obs.set('test') // Same value
      expect(listener).toHaveBeenCalledWith('test', expect.any(Array))
    })

    it('should not emit when value is the same if emitWhenValuesAreEqual is false', () => {
      const obs = createObservable({
        initialValue: 'test',
        emitWhenValuesAreEqual: false,
      })
      const listener = jest.fn()
      obs.subscribe(listener)

      obs.set('test') // Same value
      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('onStreamHalted callback', () => {
    it('should call onStreamHalted when value is the same and emitWhenValuesAreEqual is false', () => {
      const obs = createObservable({
        initialValue: 'test',
        emitWhenValuesAreEqual: false,
      })
      const onStreamHalted = jest.fn()
      obs.subscribe(undefined, undefined, onStreamHalted)

      obs.set('test') // Same value
      expect(onStreamHalted).toHaveBeenCalledWith(expect.any(Array))
    })

    it('should call onStreamHalted when equalityFn returns true', () => {
      const obs = createObservable({
        initialValue: { id: 1, name: 'test' },
        equalityFn: (a, b) => a.id === b.id,
      })
      const onStreamHalted = jest.fn()
      obs.subscribe(undefined, undefined, onStreamHalted)

      // Setting same ID but different name - equalityFn returns true, so should halt
      obs.set({ id: 1, name: 'different' })
      expect(onStreamHalted).toHaveBeenCalledWith(expect.any(Array))
    })
  })

  describe('onStreamHalted downstream propagation', () => {
    it('should call onStreamHalted on downstream observable when upstream emits equal value and emitWhenValuesAreEqual is false', () => {
      const upstream = createObservable({
        initialValue: 42,
        emitWhenValuesAreEqual: false,
      })
      const downstream = upstream.stream((v) => v * 2)
      const onStreamHalted = jest.fn()
      downstream.subscribe(undefined, undefined, onStreamHalted)

      upstream.set(42) // Same value, should halt downstream
      expect(onStreamHalted).toHaveBeenCalledWith(expect.any(Array))
    })
  })

  describe('finally operator', () => {
    it('should call finally callback on value emission', () => {
      const obs = createObservable({ initialValue: 1 })
      const callback = jest.fn()
      const final$ = obs.finally(callback)

      obs.set(2)
      expect(callback).toHaveBeenCalledWith(
        'onValue',
        2,
        undefined,
        expect.any(Array),
      )
    })

    it('should call finally callback on error', () => {
      const obs = createObservable({ initialValue: 1 })
      const callback = jest.fn()
      const final$ = obs.finally(callback)
      const error = new Error('fail')

      obs.emitError(error)
      expect(callback).toHaveBeenCalledWith(
        'onError',
        undefined,
        error,
        expect.any(Array),
      )
    })

    it('should call finally callback on stream halt', () => {
      const obs = createObservable({ initialValue: 1 })
      const callback = jest.fn()
      const final$ = obs.finally(callback)

      obs.emitStreamHalted()
      expect(callback).toHaveBeenCalledWith(
        'onComplete',
        undefined,
        undefined,
        expect.any(Array),
      )
    })

    it('should allow chaining after finally', () => {
      const obs = createObservable({ initialValue: 1 })
      const callback = jest.fn()
      const chained$ = obs.finally(callback).stream((x) => x * 2)

      obs.set(3)
      expect(chained$.get()).toBe(6)
      expect(callback).toHaveBeenCalledWith(
        'onValue',
        3,
        undefined,
        expect.any(Array),
      )
    })
  })
})
