# @idiosync/react-observable

A lightweight state management library for React applications that provides a simple and powerful way to handle reactive state.

## Installation

```bash
npm install @idiosync/react-observable
# or
yarn add @idiosync/react-observable
```

## Features

- Simple and intuitive API
- Type-safe with TypeScript
- Reactive state management
- Stream-based data flow
- Error handling
- Automatic type inference
- Deep readonly types for immutability
- Persistent state storage with AsyncStorage
- React context integration

## Usage

### Creating an Observable

```typescript
import { createObservable } from '@idiosync/react-observable'

const counter$ = createObservable({
  initialValue: 0,
  name: 'counter'
})

// Get the current value
const currentValue = counter$.get()

// Set a new value
counter$.set(1)

// Set using a function
counter$.set(current => current + 1)

// Subscribe to changes
const unsubscribe = counter$.subscribe(value => {
  console.log('Counter changed:', value)
})
```

### Creating a Persistent Observable

```typescript
import { createPersistentObservable } from '@idiosync/react-observable'

const settings$ = createPersistentObservable({
  initialValue: { theme: 'light', fontSize: 16 },
  name: 'app-settings',
  // Optional: Custom merge function for hydration
  mergeOnHydration: (initial, persisted) => ({
    ...initial,
    ...persisted,
    // Ensure certain fields are always present
    theme: persisted.theme || initial.theme,
  })
})

// Wait for hydration to complete
await settings$.rehydrate()

// The value will persist between app restarts
settings$.set({ theme: 'dark' })
```

### Using with React Context

```typescript
import { createObservableStore, ReactObservableProvider } from '@idiosync/react-observable'

// Create your store
const store = createObservableStore({
  counter: createObservable({ initialValue: 0 }),
  settings: createPersistentObservable({
    initialValue: { theme: 'light' },
    name: 'app-settings'
  })
})

// Wrap your app with the provider
function App() {
  return (
    <ReactObservableProvider store={store} loading={<LoadingSpinner />}>
      <YourApp />
    </ReactObservableProvider>
  )
}

// Use the store in your components
function Counter() {
  const store = useContext(ReactObservableContext)
  const counter$ = store?.counter

  useEffect(() => {
    const unsubscribe = counter$?.subscribe(value => {
      console.log('Counter changed:', value)
    })
    return () => unsubscribe?.()
  }, [counter$])

  return (
    <button onClick={() => counter$?.set(c => c + 1)}>
      Count: {counter$?.get()}
    </button>
  )
}
```

### Creating a Stream

```typescript
const doubled$ = counter$.stream(
  value => value * 2,
  { name: 'doubled' }
)

// Subscribe to the stream
doubled$.subscribe(value => {
  console.log('Doubled value:', value)
})
```

### Creating an Observable Store

```typescript
import { createObservableStore } from '@idiosync/react-observable'

const store = createObservableStore({
  counter: createObservable({ initialValue: 0 }),
  user: createObservable({ initialValue: null })
})

// Access observables
const counter$ = store.counter
const user$ = store.user
```

### Combining Observables

```typescript
const combined$ = counter$.combineLatestFrom(user$)
combined$.subscribe(([counter, user]) => {
  console.log('Counter:', counter, 'User:', user)
})
```

### Error Handling

```typescript
const safe$ = counter$.catchError((error, currentValue, setter) => {
  console.error('Error occurred:', error)
  // Optionally set a fallback value
  setter(0)
})
```

## Error Handling with `catchError`

The `catchError` operator allows you to intercept and handle errors in an observable stream. Its design is intended to:

- Allow you to throw a new error at any catch boundary for better debugging (e.g., to mark a specific problem section of your stream).
- Forward the original error if you wish.
- Do nothing, in which case a special `ReactObservableError` is emitted to ensure the stream completes and downstream handlers can continue to propagate errors as needed.

This approach enables you to use `throw` liberally throughout your stream logic, and to pinpoint problem sections by throwing custom errors at any `catchError` boundary.

### Usage Example

```ts
observable
  .streamAsync(async (value) => {
    if (value < 0) throw new Error('Negative value!');
    return value * 2;
  })
  .catchError((error, currentValue, set) => {
    // You can throw a new error for this section
    if (error.message.includes('Negative')) {
      throw new Error('CustomSectionError: Negative encountered in stream!');
    }
    // Or forward the original error
    throw error;
    // Or do nothing to suppress and allow the stream to complete
  });
```

**Notes:**
- If you throw a new error in the handler, it will be emitted downstream.
- If you do nothing, a special `ReactObservableError` is emitted to ensure the stream completes.
- Downstream `catchError` handlers will ignore `ReactObservableError` and pass it on, allowing the stream to complete gracefully.

## API Reference

### Type Augmentations

To use type augmentations with the library, you'll need to:

1. Create a type declaration file (e.g., `src/types/augmentations/react-observable.d.ts`):
```typescript
declare module '@idiosync/react-observable' {
  // Your type augmentations here
}
```

2. Add the path to your `tsconfig.json`:
```json
{
  "compilerOptions": {
    "typeRoots": [
      "./node_modules/@types",
      "./src/types/augmentations"
    ]
  }
}
```

3. Import the type declarations in your app's entry point (e.g., `index.js` or `index.ts`):
```typescript
import './src/types/augmentations/react-observable.d'
```

This allows you to extend the library's types while maintaining type safety.

### createObservable

Creates a new observable with the given configuration.

```typescript
createObservable<T>({
  initialValue?: T | (() => T),
  equalityFn?: (a: T, b: T) => boolean,
  name?: string
}): Observable<T>
```

### createPersistentObservable

Creates a new persistent observable that saves its state to AsyncStorage.

```typescript
createPersistentObservable<T>({
  initialValue: T | (() => T),
  name: string,
  equalityFn?: (a: T, b: T) => boolean,
  mergeOnHydration?: (initialValue: T, persisted: unknown) => T
}): PersistentObservable<T>
```

### Observable Methods

- `get()`: Get the current value
- `set(value: T | ((current: T) => T), forceEmit?: boolean)`: Set a new value
- `subscribe(listener?: (value: T) => void, onError?: (error: Error) => void)`: Subscribe to changes
- `stream<T>(project: (value: T) => T, options?: StreamOptions)`: Create a new stream
- `combineLatestFrom(...observables)`: Combine with other observables
- `catchError(onError?: (error: Error, currentValue: T, setter: (value: T) => void) => void)`: Handle errors

### PersistentObservable Methods

In addition to all Observable methods, PersistentObservable includes:
- `rehydrate(): Promise<void>`: Wait for the initial state to be loaded from storage
- `reset()`: Reset to the initial value and clear storage

### createObservableStore

Creates a store containing multiple observables.

```typescript
createObservableStore<Store>(config: ObservableStoreConfig<Store>): ObservableStore<Store>
```

### React Context

The library provides React context integration through:

```typescript
ReactObservableProvider: React.FC<{
  store: ObservableStore<unknown>
  children: ReactNode
  loading?: ReactNode
}>

ReactObservableContext: React.Context<ObservableStore<unknown> | null>
```

The provider automatically handles:
- Loading states for persistent observables
- Context distribution
- Type safety with TypeScript

## License

MIT 