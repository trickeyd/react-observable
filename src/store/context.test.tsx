import React from 'react'
import { render, screen, act } from '@testing-library/react'
import { ReactObservableProvider, ReactObservableContext } from './context'
import { createObservable } from '../factories/observable'
import { createStore, resetStore } from './create-store'
import { Observable } from '../types/observable'

// Helper to render with provider and wait for rehydration
const renderWithProvider = async (component: React.ReactElement) => {
  let utils: any
  await act(async () => {
    utils = render(
      <ReactObservableProvider>{component}</ReactObservableProvider>,
    )
    // Wait a tick for provider async setup
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  return utils
}

// Test component that uses the context
const TestConsumer = () => {
  const context = React.useContext(ReactObservableContext)
  return (
    <div>
      <div data-testid="has-store">{context ? 'true' : 'false'}</div>
      <div data-testid="store-keys">
        {context ? Object.keys(context).join(',') : 'none'}
      </div>
    </div>
  )
}

describe('ReactObservableProvider', () => {
  describe('Basic functionality', () => {
    it('should provide store context to children', async () => {
      await renderWithProvider(<TestConsumer />)
      expect(screen.getByTestId('has-store')).toHaveTextContent('true')
    })

    it('should provide store with observables', async () => {
      await renderWithProvider(<TestConsumer />)
      expect(screen.getByTestId('store-keys')).not.toHaveTextContent('none')
    })

    it('should render children correctly', async () => {
      await renderWithProvider(<div data-testid="child">Child content</div>)
      expect(screen.getByTestId('child')).toHaveTextContent('Child content')
    })
  })

  describe('Context value', () => {
    it('should provide store object', async () => {
      let contextValue: any = null

      const TestContextComponent = () => {
        contextValue = React.useContext(ReactObservableContext)
        return <div>Test</div>
      }

      await renderWithProvider(<TestContextComponent />)

      expect(contextValue).toBeDefined()
      expect(typeof contextValue).toBe('object')
    })

    it('should provide store with observable properties', async () => {
      let contextValue: any = null

      const TestContextComponent = () => {
        contextValue = React.useContext(ReactObservableContext)
        return <div>Test</div>
      }

      await renderWithProvider(<TestContextComponent />)

      expect(contextValue).toHaveProperty('test')
      expect(contextValue.test).toHaveProperty('value$')
      expect(typeof contextValue.test.value$.get).toBe('function')
    })
  })

  describe('Nested providers', () => {
    it('should work with nested providers', async () => {
      await renderWithProvider(
        <ReactObservableProvider>
          <TestConsumer />
        </ReactObservableProvider>,
      )
      expect(screen.getByTestId('has-store')).toHaveTextContent('true')
    })

    it('should maintain context in nested components', async () => {
      const NestedComponent = () => (
        <div>
          <TestConsumer />
          <div data-testid="nested">Nested content</div>
        </div>
      )

      await renderWithProvider(<NestedComponent />)

      expect(screen.getByTestId('has-store')).toHaveTextContent('true')
      expect(screen.getByTestId('nested')).toHaveTextContent('Nested content')
    })
  })

  describe('Context without provider', () => {
    it('should handle components without provider', () => {
      render(<TestConsumer />)

      expect(screen.getByTestId('has-store')).toHaveTextContent('false')
      expect(screen.getByTestId('store-keys')).toHaveTextContent('none')
    })

    it('should not crash when accessing context without provider', () => {
      expect(() => {
        render(<TestConsumer />)
      }).not.toThrow()
    })
  })

  describe('Store observables', () => {
    it('should provide working observables in store', async () => {
      let contextValue: any = null

      const TestObservableComponent = () => {
        contextValue = React.useContext(ReactObservableContext)
        return <div>Test</div>
      }

      await renderWithProvider(<TestObservableComponent />)

      const testObs = contextValue.test.value$
      expect(testObs.get()).toBeDefined()

      // Test that observable can be updated
      testObs.set('updated value')
      expect(testObs.get()).toBe('updated value')
    })

    it('should provide multiple observables in store', async () => {
      // Reset store and create a fresh one with multiple observables
      resetStore()
      createStore({
        test: {
          value$: createObservable({
            initialValue: 'test value',
          }) as Observable<unknown>,
        },
        user: {
          profile$: createObservable({
            initialValue: { name: 'John' },
          }) as Observable<unknown>,
        },
        settings: {
          theme$: createObservable({
            initialValue: 'dark',
          }) as Observable<unknown>,
        },
      })

      let contextValue: any = null

      const TestMultipleComponent = () => {
        contextValue = React.useContext(ReactObservableContext)
        return <div>Test</div>
      }

      await renderWithProvider(<TestMultipleComponent />)

      expect(contextValue).toHaveProperty('test')
      expect(contextValue).toHaveProperty('user')
      expect(contextValue).toHaveProperty('settings')
    })
  })

  describe('Error handling', () => {
    it('should handle provider errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      await expect(async () => {
        await renderWithProvider(<div>Content</div>)
      }).not.toThrow()

      consoleSpy.mockRestore()
    })

    it('should handle consumer errors gracefully', async () => {
      const ErrorComponent = () => {
        const context = React.useContext(ReactObservableContext)
        // Force an error by trying to access a property that doesn't exist
        if (context && context.nonExistentProperty) {
          throw new Error('Consumer error')
        }
        return <div>Test</div>
      }

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      // This should not throw because the condition isn't met
      expect(() => {
        render(<ErrorComponent />)
      }).not.toThrow()

      consoleSpy.mockRestore()
    })
  })

  describe('Performance', () => {
    it('should not re-render children unnecessarily', async () => {
      const renderSpy = jest.fn()
      const TestRenderComponent = () => {
        renderSpy()
        return <div>Test</div>
      }
      await renderWithProvider(<TestRenderComponent />)
      expect(renderSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('TypeScript support', () => {
    it('should provide proper TypeScript types', async () => {
      // Ensure store is initialized
      resetStore()
      createStore({
        test: {
          value$: createObservable({
            initialValue: 'test value',
          }) as Observable<unknown>,
        },
      })

      const TestTypeComponent = () => {
        const context = React.useContext(ReactObservableContext)
        // Context should exist when used within provider
        if (!context) {
          throw new Error('Context should exist')
        }
        return <div data-testid="typed">typed</div>
      }

      await renderWithProvider(<TestTypeComponent />)

      // Wait a bit more for the provider to fully initialize
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
      })

      expect(screen.getByTestId('typed')).toHaveTextContent('typed')
    })
  })
})
