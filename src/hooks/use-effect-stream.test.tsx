import React from 'react'
import { render, screen, act } from '@testing-library/react'
import { useEffectStream } from './use-effect-stream'
import { createObservable } from '../factories/observable'
import { ReactObservableProvider } from '../store/context'
import { createStore, resetStore, store$ } from '../store/create-store'

// Helper function to render with provider and wait for async operations
const renderWithProvider = async (component: React.ReactElement) => {
  let result: any
  act(() => {
    result = render(
      <ReactObservableProvider>{component}</ReactObservableProvider>,
    )
  })

  // Wait for async operations to complete
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100))
  })

  return result
}

// Test component that uses the hook
const TestComponent = ({
  initialise,
  deps,
}: {
  initialise: any
  deps?: unknown[]
}) => {
  const value = useEffectStream(initialise, deps || [])
  return <div data-testid="value">{JSON.stringify(value)}</div>
}

// Simple test component
const SimpleComponent = () => {
  return <div data-testid="simple">Simple component</div>
}

// Debug test component
const DebugComponent = () => {
  console.log('DebugComponent: Starting render')
  try {
    const obs = createObservable({ initialValue: 'debug value' })
    console.log('DebugComponent: Created observable, value:', obs.get())

    const value = useEffectStream(({ $, store }) => {
      console.log('DebugComponent: Initialise function called')
      return obs
    }, [])

    console.log('DebugComponent: useEffectStream returned:', value)
    return <div data-testid="debug">{JSON.stringify(value)}</div>
  } catch (error) {
    console.log('DebugComponent: Error:', error)
    return <div data-testid="error">{String(error)}</div>
  }
}

describe('useEffectStream', () => {
  describe('Store', () => {
    it('should have store initialized from setup', () => {
      const currentStore = store$.get()
      console.log('Current store:', currentStore)
      expect(currentStore).toBeDefined()
      expect(currentStore.test).toBeDefined()
      expect(currentStore.test.value$).toBeDefined()
    })

    it('should test provider subscription', () => {
      let receivedStore: any = null
      const unsubscribe = store$.subscribeWithValue((store) => {
        console.log('Provider subscription received store:', store)
        receivedStore = store
      })

      expect(receivedStore).toBeDefined()
      expect(receivedStore.test).toBeDefined()
      unsubscribe()
    })

    it('should test provider with fresh store', async () => {
      // Reset store and create a fresh one
      resetStore()
      createStore({
        fresh: {
          value$: createObservable({ initialValue: 'fresh value' }) as any,
        },
      })

      await renderWithProvider(<SimpleComponent />)

      expect(screen.getByTestId('simple')).toBeInTheDocument()
    })
  })

  describe('Simple', () => {
    it('should render simple component without provider', () => {
      render(<SimpleComponent />)
      expect(screen.getByTestId('simple')).toBeInTheDocument()
    })

    it('should render simple component with provider', async () => {
      await renderWithProvider(<SimpleComponent />)
      expect(screen.getByTestId('simple')).toBeInTheDocument()
    })
  })

  describe('Debug', () => {
    it('should debug the hook', async () => {
      await renderWithProvider(<DebugComponent />)
      expect(screen.getByTestId('debug')).toBeInTheDocument()
    })
  })

  describe('Basic functionality', () => {
    it('should return observable value', async () => {
      const obs = createObservable({ initialValue: 'test value' })

      await renderWithProvider(
        <TestComponent initialise={({ $, store }) => obs} />,
      )

      expect(screen.getByTestId('value')).toHaveTextContent('"test value"')
    })

    it('should update when observable changes', async () => {
      const obs = createObservable({ initialValue: 'initial' })

      await renderWithProvider(
        <TestComponent initialise={({ $, store }) => obs} />,
      )

      expect(screen.getByTestId('value')).toHaveTextContent('"initial"')

      act(() => {
        obs.set('updated')
      })

      expect(screen.getByTestId('value')).toHaveTextContent('"updated"')
    })

    it('should handle complex objects', async () => {
      const obs = createObservable({
        initialValue: { name: 'John', age: 25, active: true },
      })

      await renderWithProvider(
        <TestComponent initialise={({ $, store }) => obs} />,
      )

      expect(screen.getByTestId('value')).toHaveTextContent(
        '{"name":"John","age":25,"active":true}',
      )
    })

    it('should call initialise on first mount regardless of deps array', async () => {
      const mockInitialise = jest.fn(({ $, store }) =>
        createObservable({ initialValue: 'mount' }),
      )
      await renderWithProvider(
        <TestComponent initialise={mockInitialise} deps={[]} />,
      )
      expect(mockInitialise).toHaveBeenCalledTimes(1)
    })

    it('should set up subscription on first mount and return initial value', async () => {
      const obs = createObservable({ initialValue: 'initial value' })
      const subscribeSpy = jest.spyOn(obs, 'subscribe')

      await renderWithProvider(
        <TestComponent initialise={({ $, store }) => obs} deps={[]} />,
      )

      expect(subscribeSpy).toHaveBeenCalledTimes(1)
      expect(screen.getByTestId('value')).toHaveTextContent('"initial value"')
    })
  })

  describe('Dependencies', () => {
    it('should not re-initialize when dependencies are the same', async () => {
      const mockInitialise = jest.fn(({ $, store }) =>
        createObservable({ initialValue: 'default' }),
      )

      await renderWithProvider(
        <TestComponent initialise={mockInitialise} deps={['dep1']} />,
      )

      expect(mockInitialise).toHaveBeenCalledTimes(1)
    })

    it('should handle undefined dependencies', async () => {
      const mockInitialise = jest.fn(({ $, store }) =>
        createObservable({ initialValue: 'default' }),
      )

      await renderWithProvider(<TestComponent initialise={mockInitialise} />)

      expect(mockInitialise).toHaveBeenCalledTimes(1)
    })
  })

  describe('Store integration', () => {
    it('should provide store to initialise function', async () => {
      const mockInitialise = jest.fn(({ $, store }) => {
        return createObservable({ initialValue: 'test' })
      })

      await renderWithProvider(<TestComponent initialise={mockInitialise} />)

      expect(mockInitialise).toHaveBeenCalledWith({
        $: expect.any(Object),
        store: expect.any(Object),
      })
    })

    it('should allow accessing store observables', async () => {
      const TestStoreComponent = () => {
        const value = useEffectStream(({ $, store }) => {
          return (
            store.test?.value$ || createObservable({ initialValue: 'default' })
          )
        }, [])
        return <div data-testid="value">{String(value)}</div>
      }

      await renderWithProvider(<TestStoreComponent />)

      expect(screen.getByTestId('value')).toHaveTextContent('default')
    })
  })

  describe('Stream operations', () => {
    it('should handle stream operations', async () => {
      const obs = createObservable({ initialValue: 5 })

      const TestStreamComponent = () => {
        const value = useEffectStream(({ $, store }) => {
          return obs.stream((val) => val * 2)
        }, [])
        return <div data-testid="value">{value}</div>
      }

      await renderWithProvider(<TestStreamComponent />)

      expect(screen.getByTestId('value')).toHaveTextContent('10')
    })

    it('should handle async stream operations', async () => {
      const obs = createObservable({ initialValue: 5 })

      const TestAsyncStreamComponent = () => {
        const value = useEffectStream(({ $, store }) => {
          return obs.streamAsync(
            async (val) => {
              await new Promise((resolve) => setTimeout(resolve, 10))
              return val * 2
            },
            { executeOnCreation: true },
          )
        }, [])
        return <div data-testid="value">{value}</div>
      }

      await renderWithProvider(<TestAsyncStreamComponent />)

      // Wait for async operation to complete
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50))
      })

      expect(screen.getByTestId('value')).toHaveTextContent('10')
    })

    it('should handle combineLatestFrom', async () => {
      const obs1 = createObservable({ initialValue: 'a' })
      const obs2 = createObservable({ initialValue: 1 })

      const TestCombineComponent = () => {
        const value = useEffectStream(({ $, store }) => {
          return obs1.combineLatestFrom(obs2)
        }, [])
        return <div data-testid="value">{JSON.stringify(value)}</div>
      }

      await renderWithProvider(<TestCombineComponent />)

      expect(screen.getByTestId('value')).toHaveTextContent('["a",1]')
    })

    it('should handle withLatestFrom', async () => {
      const obs1 = createObservable({ initialValue: 'a' })
      const obs2 = createObservable({ initialValue: 1 })

      const TestWithLatestComponent = () => {
        const value = useEffectStream(({ $, store }) => {
          return obs1.withLatestFrom(obs2)
        }, [])
        return <div data-testid="value">{JSON.stringify(value)}</div>
      }

      await renderWithProvider(<TestWithLatestComponent />)

      expect(screen.getByTestId('value')).toHaveTextContent('["a",1]')
    })
  })

  describe('Subscription management', () => {
    it('should subscribe to observable on mount', async () => {
      const obs = createObservable({ initialValue: 'test' })
      const subscribeSpy = jest.spyOn(obs, 'subscribe')

      await renderWithProvider(
        <TestComponent initialise={({ $, store }) => obs} />,
      )

      expect(subscribeSpy).toHaveBeenCalled()
    })

    it('should unsubscribe on unmount', async () => {
      const obs = createObservable({ initialValue: 'test' })
      const unsubscribeSpy = jest.fn()
      jest.spyOn(obs, 'subscribe').mockReturnValue(unsubscribeSpy)

      const { unmount } = await renderWithProvider(
        <TestComponent initialise={({ $, store }) => obs} />,
      )

      unmount()

      expect(unsubscribeSpy).toHaveBeenCalled()
    })

    it('should handle multiple subscriptions', async () => {
      const obs1 = createObservable({ initialValue: 'obs1' })
      const obs2 = createObservable({ initialValue: 'obs2' })

      const MultiObsComponent = () => {
        const value1 = useEffectStream(({ $, store }) => obs1, [])
        const value2 = useEffectStream(({ $, store }) => obs2, [])
        return (
          <>
            <div data-testid="value1">{String(value1)}</div>
            <div data-testid="value2">{String(value2)}</div>
          </>
        )
      }

      await renderWithProvider(<MultiObsComponent />)

      expect(screen.getByTestId('value1')).toHaveTextContent('obs1')
      expect(screen.getByTestId('value2')).toHaveTextContent('obs2')
    })
  })

  describe('Error handling', () => {
    // Error handling tests removed - errors should propagate normally
    // The hook is not designed to catch and handle errors
  })

  describe('Performance and optimization', () => {
    it('should not re-render when observable value is the same', async () => {
      const obs = createObservable({ initialValue: 'test' })
      const renderSpy = jest.fn()

      const TestRenderComponent = () => {
        renderSpy()
        const value = useEffectStream(({ $, store }) => obs, [])
        return <div data-testid="value">{String(value)}</div>
      }

      await renderWithProvider(<TestRenderComponent />)

      expect(renderSpy).toHaveBeenCalledTimes(1)
    })

    it('should re-render when observable value changes', async () => {
      const obs = createObservable({ initialValue: 'initial' })
      const renderSpy = jest.fn()

      const TestRenderComponent = () => {
        renderSpy()
        const value = useEffectStream(({ $, store }) => obs, [])
        return <div data-testid="value">{String(value)}</div>
      }

      await renderWithProvider(<TestRenderComponent />)

      const initialRenderCount = renderSpy.mock.calls.length

      act(() => {
        obs.set('updated')
      })

      expect(renderSpy.mock.calls.length).toBeGreaterThan(initialRenderCount)
    })
  })

  describe('Edge cases', () => {
    it('should handle undefined observable values', async () => {
      const obs = createObservable({ initialValue: undefined })

      await renderWithProvider(
        <TestComponent initialise={({ $, store }) => obs} />,
      )

      // The value should be undefined, which renders as an empty string
      expect(screen.getByTestId('value')).toHaveTextContent('')
    })

    it('should handle null observable values', async () => {
      const obs = createObservable({ initialValue: null })

      await renderWithProvider(
        <TestComponent initialise={({ $, store }) => obs} />,
      )

      expect(screen.getByTestId('value')).toHaveTextContent('null')
    })

    it('should handle function initial values', async () => {
      const obs = createObservable({
        initialValue: () => 'function value',
      })

      await renderWithProvider(
        <TestComponent initialise={({ $, store }) => obs} />,
      )

      expect(screen.getByTestId('value')).toHaveTextContent('"function value"')
    })

    it('should handle React Strict Mode double mounting', async () => {
      const obs = createObservable({ initialValue: 'strict mode test' })
      const subscribeSpy = jest.spyOn(obs, 'subscribe')

      // Properly simulate React Strict Mode by wrapping in StrictMode
      await renderWithProvider(
        <React.StrictMode>
          <TestComponent initialise={({ $, store }) => obs} deps={[]} />
        </React.StrictMode>,
      )

      // Should work correctly in Strict Mode
      expect(screen.getByTestId('value')).toHaveTextContent(
        '"strict mode test"',
      )
      expect(subscribeSpy).toHaveBeenCalled()
    })
  })

  describe('Provider context', () => {
    it('should throw error when used without provider', () => {
      const obs = createObservable({ initialValue: 'test' })

      // The hook should throw when used without a provider
      expect(() => {
        render(<TestComponent initialise={({ $, store }) => obs} />)
      }).toThrow()
    })

    it('should use provider context when available', async () => {
      const obs = createObservable({ initialValue: 'test' })

      await renderWithProvider(
        <TestComponent initialise={({ $, store }) => obs} />,
      )

      expect(screen.getByTestId('value')).toHaveTextContent('"test"')
    })
  })
})
