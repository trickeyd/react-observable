import { createCommandStream } from './create-command-stream'
import { createObservable } from './observable'
import { createStore, resetStore } from '../store/create-store'

describe('createCommandStream', () => {
  beforeAll(() => {
    // Reset the store before creating a new one
    resetStore()

    const testStore = {
      test: {
        value$: createObservable({
          initialValue: 'store value',
          name: 'test.value',
        }),
      },
      counter: {
        count$: createObservable({ initialValue: 0, name: 'counter.count' }),
      },
      user: {
        name$: createObservable({ initialValue: 'John', name: 'user.name' }),
        age$: createObservable({ initialValue: 25, name: 'user.age' }),
      },
    }
    createStore(testStore as any)
  })

  describe('Basic functionality', () => {
    it('should create a command stream function', () => {
      const command = createCommandStream<string, string>(({ $, store }) => {
        return $.stream((value) => value) as any
      })

      expect(typeof command).toBe('function')
      expect(command.exit$).toBeDefined()
    })

    it('should execute and return a promise', async () => {
      const command = createCommandStream<string, string>(({ $, store }) => {
        return $.stream((value) => value) as any
      })

      const result = command('test')
      expect(result).toBeInstanceOf(Promise)

      const [data, error] = await result
      expect(data).toBe('test')
      expect(error).toBeUndefined()
    })

    it('should handle async operations', async () => {
      const command = createCommandStream<string, string>(({ $, store }) => {
        return $.streamAsync(async (value) => {
          await new Promise((resolve) => setTimeout(resolve, 10))
          return value + ' processed'
        }) as any
      })

      const [data, error] = await command('test')
      expect(data).toBe('test processed')
      expect(error).toBeUndefined()
    })
  })

  describe('Error handling', () => {
    it('should handle errors in stream', async () => {
      const command = createCommandStream<string, string>(({ $, store }) => {
        return $.streamAsync(async (value) => {
          throw new Error('Test error')
        }) as any
      })

      const [data, error] = await command('test')
      expect(data).toBeUndefined()
      expect(error).toBeInstanceOf(Error)
      expect(error?.message).toContain('Test error')
    })

    it('should call onError callback when provided', async () => {
      const onError = jest.fn()
      const command = createCommandStream<string, string>(
        ({ $, store }) => {
          return $.streamAsync(async (value) => {
            throw new Error('Test error')
          }) as any
        },
        { onError },
      )

      await command('test')
      expect(onError).toHaveBeenCalledWith(expect.any(Error), expect.any(Array))
    })
  })

  describe('Execution tracking', () => {
    it('should track multiple concurrent executions', async () => {
      const command = createCommandStream<string, string>(({ $, store }) => {
        return $.streamAsync(async (value) => {
          await new Promise((resolve) => setTimeout(resolve, 50))
          return value
        }) as any
      })

      const execution1 = command('first')
      const execution2 = command('second')

      const [result1, error1] = await execution1
      const [result2, error2] = await execution2

      expect(result1).toBe('first')
      expect(result2).toBe('second')
      expect(error1).toBeUndefined()
      expect(error2).toBeUndefined()
    })

    it('should isolate execution results', async () => {
      const command = createCommandStream<string, string>(({ $, store }) => {
        return $.stream((value) => value) as any
      })

      const promise1 = command('value1')
      const promise2 = command('value2')

      const [data1] = await promise1
      const [data2] = await promise2

      expect(data1).toBe('value1')
      expect(data2).toBe('value2')
    })
  })

  describe('Exit observable', () => {
    it('should provide exit observable', () => {
      const command = createCommandStream<string, string>(({ $, store }) => {
        return $.stream((value) => value) as any
      })

      expect(command.exit$).toBeDefined()
      expect(typeof command.exit$.subscribe).toBe('function')
    })

    it('should emit results to exit observable', async () => {
      const command = createCommandStream<string, string>(({ $, store }) => {
        return $.stream((value) => value) as any
      })

      const listener = jest.fn()
      command.exit$.subscribe(listener)

      await command('test')

      expect(listener).toHaveBeenCalledWith('test', expect.any(Array))
    })

    it('should handle initial value in exit observable', () => {
      const command = createCommandStream<string, string>(
        ({ $, store }) => {
          return $.stream((value) => value) as any
        },
        { initialValue: 'initial' },
      )

      expect(command.exit$.get()).toBe('initial')
    })
  })

  describe('Stream operations', () => {
    it('should handle stream with latest from', async () => {
      const command = createCommandStream<string, string>(({ $, store }) => {
        return $.withLatestFrom(
          createObservable({ initialValue: 'context' }),
        ).stream(([value, context]) => `${value} with ${context}`) as any
      })

      const [data] = await command('input')
      expect(data).toBe('input with context')
    })

    it('should handle combine latest from', async () => {
      const command = createCommandStream<string, string>(({ $, store }) => {
        return $.combineLatestFrom(
          createObservable({ initialValue: 'a' }),
          createObservable({ initialValue: 'b' }),
        ).stream(([value, a, b]) => `${value}-${a}-${b}`) as any
      })

      const [data] = await command('input')
      expect(data).toBe('input-a-b')
    })

    it('should handle tap operations', async () => {
      const sideEffect = jest.fn()
      const command = createCommandStream<string, string>(({ $, store }) => {
        return $.tap(sideEffect).stream((value) => value) as any
      })

      await command('test')
      expect(sideEffect).toHaveBeenCalledWith('test')
    })

    it('should handle catch error operations', async () => {
      const command = createCommandStream<string, string>(({ $, store }) => {
        return $.stream((value) => {
          if (value === 'test') {
            throw new Error('Stream error')
          }
          return value
        }).catchError((error, currentValue) => {
          return { restoreValue: 'recovered' }
        }) as any
      })

      const [data, error] = await command('test')
      expect(data).toBe('recovered')
      expect(error).toBeUndefined()
    })
  })

  describe('Store integration', () => {
    it('should provide store to stream', async () => {
      const command = createCommandStream<string, string>(({ $, store }) => {
        return $.stream((value) => {
          const storeValue = (store.test.value$ as any).get()
          return `${value} - ${storeValue}`
        }) as any
      })

      const [data] = await command('input')
      expect(data).toBe('input - store value')
    })

    it('should handle store updates', async () => {
      const command = createCommandStream<string, string>(({ $, store }) => {
        return $.stream((value) => {
          const currentCount = (store.counter.count$ as any).get()
          ;(store.counter.count$ as any).set(currentCount + 1)
          return (store.counter.count$ as any).get()
        }) as any
      })

      const [data] = await command('increment')
      expect(data).toBe(2)
    })
  })

  describe('Complex scenarios', () => {
    it('should handle store updates in complex scenarios', async () => {
      const command = createCommandStream<string, string>(({ $, store }) => {
        return $.stream((value) => {
          const name = (store.user.name$ as any).get()
          const age = (store.user.age$ as any).get()
          return `${value} by ${name} (${age})`
        }) as any
      })

      const [data] = await command('action')
      expect(data).toBe('action by John (25)')
    })

    it('should handle chained operations', async () => {
      const command = createCommandStream<string, string>(({ $, store }) => {
        return $.stream((value) => value)
          .stream((value) => value.toUpperCase())
          .stream((value) => `${value}!`) as any
      })

      const [data] = await command('hello')
      expect(data).toBe('HELLO!')
    })

    it('should handle async chained operations', async () => {
      const command = createCommandStream<string, string>(({ $, store }) => {
        return $.streamAsync(async (value) => {
          await new Promise((resolve) => setTimeout(resolve, 10))
          return value + '1'
        }).streamAsync(async (value) => {
          await new Promise((resolve) => setTimeout(resolve, 10))
          return value + '2'
        }) as any
      })

      const [data] = await command('test')
      expect(data).toBe('test12')
    })
  })
})
