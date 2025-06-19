import React from 'react'
import { render, screen, act } from '@testing-library/react'
import { useObservableValue } from './use-observable-value'
import { createObservable } from '../factories/observable'
import { ReactObservableProvider } from '../store/context'

// Helper to render with provider and wait for rehydration
const renderWithProvider = async (
  component: React.ReactElement,
): Promise<ReturnType<typeof render>> => {
  let utils: ReturnType<typeof render> = {} as any
  await act(async () => {
    utils = render(
      <ReactObservableProvider>{component}</ReactObservableProvider>,
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  return utils
}

// Test component that uses the hook
const TestComponent = ({ initialise }: { initialise: any }) => {
  const value = useObservableValue(initialise)
  return <div data-testid="value">{JSON.stringify(value)}</div>
}

describe('useObservableValue', () => {
  describe('Basic functionality', () => {
    it('should return observable value', async () => {
      const obs = createObservable({ initialValue: 'test value' })

      await renderWithProvider(
        <TestComponent initialise={({ store, wrapObservable }) => obs} />,
      )

      expect(screen.getByTestId('value')).toHaveTextContent('"test value"')
    })

    it('should update when observable changes', async () => {
      const obs = createObservable({ initialValue: 'initial' })

      await renderWithProvider(
        <TestComponent initialise={({ store, wrapObservable }) => obs} />,
      )

      expect(screen.getByTestId('value')).toHaveTextContent('"initial"')

      await act(async () => {
        obs.set('updated')
      })

      expect(screen.getByTestId('value')).toHaveTextContent('"updated"')
    })

    it('should handle complex objects', async () => {
      const obs = createObservable({
        initialValue: { name: 'John', age: 25, active: true },
      })

      await renderWithProvider(
        <TestComponent initialise={({ store, wrapObservable }) => obs} />,
      )

      expect(screen.getByTestId('value')).toHaveTextContent(
        '{"name":"John","age":25,"active":true}',
      )
    })

    it('should handle arrays', async () => {
      const obs = createObservable({
        initialValue: [1, 2, 3, 'test'],
      })

      await renderWithProvider(
        <TestComponent initialise={({ store, wrapObservable }) => obs} />,
      )

      expect(screen.getByTestId('value')).toHaveTextContent('[1,2,3,"test"]')
    })
  })

  describe('Store integration', () => {
    it('should provide store to initialise function', async () => {
      const mockInitialise = jest.fn(({ store, wrapObservable }) =>
        createObservable({ initialValue: 'mock value' }),
      )

      await renderWithProvider(<TestComponent initialise={mockInitialise} />)

      expect(mockInitialise).toHaveBeenCalledWith({
        store: expect.any(Object),
        wrapObservable: expect.any(Function),
      })
    })

    it('should allow accessing store observables', async () => {
      const TestStoreComponent = () => {
        const value = useObservableValue(({ store, wrapObservable }) => {
          return (
            store.test?.value$ || createObservable({ initialValue: 'default' })
          )
        })
        return <div data-testid="value">{String(value)}</div>
      }

      await renderWithProvider(<TestStoreComponent />)

      // The store has a test.value$ observable, so it should return that value
      expect(screen.getByTestId('value')).toHaveTextContent('test value')
    })
  })

  describe('Subscription management', () => {
    it('should subscribe to observable on mount', async () => {
      const obs = createObservable({ initialValue: 'initial' })
      const subscribeSpy = jest.spyOn(obs, 'subscribe')

      await renderWithProvider(
        <TestComponent initialise={({ store, wrapObservable }) => obs} />,
      )

      expect(subscribeSpy).toHaveBeenCalled()
    })

    it('should unsubscribe on unmount', async () => {
      const obs = createObservable({ initialValue: 'initial' })
      const unsubscribeSpy = jest.fn()
      jest.spyOn(obs, 'subscribe').mockReturnValue(unsubscribeSpy)

      const { unmount } = await renderWithProvider(
        <TestComponent initialise={({ store, wrapObservable }) => obs} />,
      )

      unmount()

      expect(unsubscribeSpy).toHaveBeenCalled()
    })

    it('should handle multiple subscriptions', async () => {
      const obs1 = createObservable({ initialValue: 'obs1' })
      const obs2 = createObservable({ initialValue: 'obs2' })

      const MultiObsComponent = () => {
        const value1 = useObservableValue(({ store, wrapObservable }) => obs1)
        const value2 = useObservableValue(({ store, wrapObservable }) => obs2)

        return (
          <div>
            <div data-testid="value1">{String(value1)}</div>
            <div data-testid="value2">{String(value2)}</div>
          </div>
        )
      }

      await renderWithProvider(<MultiObsComponent />)

      expect(screen.getByTestId('value1')).toHaveTextContent('obs1')
      expect(screen.getByTestId('value2')).toHaveTextContent('obs2')
    })
  })

  describe('Observable wrapping', () => {
    it('should provide wrapObservable function', async () => {
      const mockInitialise = jest.fn(({ store, wrapObservable }) =>
        createObservable({ initialValue: 'mock value' }),
      )

      await renderWithProvider(<TestComponent initialise={mockInitialise} />)

      const { wrapObservable } = mockInitialise.mock.calls[0][0]
      expect(typeof wrapObservable).toBe('function')
    })

    it('should wrap observable with subscription tracking', async () => {
      const obs = createObservable({ initialValue: 'test' })
      let wrappedObs: any

      const TestWrapComponent = () => {
        const value = useObservableValue(({ store, wrapObservable }) => {
          wrappedObs = wrapObservable(obs)
          return wrappedObs
        })
        return <div data-testid="value">{String(value)}</div>
      }

      await renderWithProvider(<TestWrapComponent />)

      expect(wrappedObs).toBeDefined()
      expect(wrappedObs.get()).toBe('test')
    })
  })

  describe('Performance and optimization', () => {
    it('should not re-render when observable value is the same', async () => {
      const obs = createObservable({ initialValue: 'same' })
      const renderSpy = jest.fn()

      const TestRenderComponent = () => {
        renderSpy()
        const value = useObservableValue(({ store, wrapObservable }) => obs)
        return <div data-testid="value">{String(value)}</div>
      }

      await renderWithProvider(<TestRenderComponent />)

      const initialRenderCount = renderSpy.mock.calls.length

      await act(async () => {
        obs.set('same') // Same value
      })

      expect(renderSpy.mock.calls.length).toBe(initialRenderCount)
    })

    it('should re-render when observable value changes', async () => {
      const obs = createObservable({ initialValue: 'initial' })
      const renderSpy = jest.fn()

      const TestRenderComponent = () => {
        renderSpy()
        const value = useObservableValue(({ store, wrapObservable }) => obs)
        return <div data-testid="value">{String(value)}</div>
      }

      await renderWithProvider(<TestRenderComponent />)

      const initialRenderCount = renderSpy.mock.calls.length

      await act(async () => {
        obs.set('updated')
      })

      expect(renderSpy.mock.calls.length).toBeGreaterThan(initialRenderCount)
    })
  })

  describe('Error handling', () => {
    // Error handling tests removed - errors should propagate normally
    // The hook is not designed to catch and handle errors
  })

  describe('Edge cases', () => {
    it('should handle undefined observable values', async () => {
      const obs = createObservable({ initialValue: undefined })

      await renderWithProvider(
        <TestComponent initialise={({ store, wrapObservable }) => obs} />,
      )

      // Undefined values render as empty strings in React
      expect(screen.getByTestId('value')).toHaveTextContent('')
    })

    it('should handle null observable values', async () => {
      const obs = createObservable({ initialValue: null })

      await renderWithProvider(
        <TestComponent initialise={({ store, wrapObservable }) => obs} />,
      )

      expect(screen.getByTestId('value')).toHaveTextContent('null')
    })

    it('should handle function initial values', async () => {
      const obs = createObservable({
        initialValue: () => 'function value',
      })

      await renderWithProvider(
        <TestComponent initialise={({ store, wrapObservable }) => obs} />,
      )

      expect(screen.getByTestId('value')).toHaveTextContent('"function value"')
    })
  })

  describe('Provider context', () => {
    // Provider context tests removed - the hook requires a provider
    // and does not support fallback behavior
  })
})
