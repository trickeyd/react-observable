# @idiosync/react-observable

A lightweight, type-safe, and reactive state management library for React applications. Designed for composability, streams, and ergonomic integration with React hooks and context.

## Features

- Simple, intuitive, and type-safe API
- Reactive state management with observables and streams
- Command streams for side-effectful actions
- React context integration for global stores
- Flexible hooks for value, effect, and observable access
- Persistent state storage (e.g., AsyncStorage)
- Error handling and stream completion
- Deep readonly types for immutability

## Why Not Redux? (What This Library Fixes)

While Redux is a powerful and popular state management solution, it comes with several pain points that @idiosync/react-observable is designed to solve:

- **Boilerplate Overhead:** Redux requires a lot of setup—actions, reducers, action types, selectors, and middleware. With react-observable, you create and use observables directly, with minimal ceremony.
- **Async Flow Complexity:** Handling async logic in Redux (with thunks, sagas, or middleware) is verbose and often hard to follow. This library provides command streams and async stream operators for natural, readable async flows.
- **Reactivity:** Redux state updates are synchronous and require manual subscription/selectors. Observables are inherently reactive—components update automatically when values change, and you can compose streams for derived state.
- **Ergonomics:** Redux's API is not ergonomic for modern React. This library provides hooks that feel like React, with dependency arrays, context, and direct observable access.
- **Type Safety:** Redux can be type-safe, but it requires a lot of manual typing. This library is type-safe by default, with deep readonly types and automatic inference.
- **No More Action Types/Reducers:** You don't need to define action types, reducers, or switch statements. Just use streams, commands, and observables.
- **Better Side Effect Handling:** Side effects are first-class citizens via command streams and async operators, not bolted on with middleware.
- **Persistent State:** Built-in support for persistent observables (e.g., AsyncStorage) without extra libraries or boilerplate.

**In summary:**

- Less boilerplate
- More natural async and reactive flows
- Modern, ergonomic React API
- Type safety and persistence out of the box

## Installation

```bash
npm install @idiosync/react-observable
# or
yarn add @idiosync/react-observable
```

## Quick Start

### 1. Creating an Observable

```typescript
import { createObservable } from '@idiosync/react-observable'

const counter$ = createObservable({ initialValue: 0 })

counter$.set(1)
counter$.subscribe((value) => console.log('Counter:', value))
```

### 2. Creating a Persistent Observable

```typescript
import { createPersistentObservable } from '@idiosync/react-observable'

const settings$ = createPersistentObservable({
  initialValue: { theme: 'light', fontSize: 16 },
  name: 'app-settings',
})

// Wait for hydration
await settings$.rehydrate()
```

### 3. Creating an Observable Store

```typescript
import { createObservableStore } from '@idiosync/react-observable'

const store = createObservableStore({
  counter: createObservable({ initialValue: 0 }),
  settings: createPersistentObservable({
    initialValue: { theme: 'light' },
    name: 'settings',
  }),
})
```

### 4. React Context Integration

```typescript
import { ReactObservableProvider } from '@idiosync/react-observable'

function App() {
  return (
    <ReactObservableProvider store={store} loading={<LoadingSpinner />}>
      <YourApp />
    </ReactObservableProvider>
  )
}
```

## React Hooks

### useObservableValue

Get the current value of an observable and subscribe reactively.

```typescript
import { useObservableValue } from '@idiosync/react-observable'

function Counter() {
  const count = useObservableValue(({ store }) => store.counter)
  return <div>Count: {count}</div>
}
```

### useEffectStream

Create a derived value or effectful stream that reacts to a dependency array.

```typescript
import { useEffectStream } from '@idiosync/react-observable'

function DoubledCounter({ multiplier }) {
  const doubled = useEffectStream(
    ({ $, store }) => store.counter.stream(count => count * multiplier),
    [multiplier]
  )
  return <div>Doubled: {doubled}</div>
}
```

### useStoreObservable

Access a raw observable from the store (not proxied, not value).

```typescript
import { useStoreObservable } from '@idiosync/react-observable'

function RawCounter() {
  const counter$ = useStoreObservable(({ store }) => store.counter)
  // You can now use counter$ directly (subscribe, set, etc.)
}
```

## Command Streams

### createCommandStream

Create a command stream for side-effectful actions (e.g., API calls, orchestrations).

```typescript
import { createCommandStream } from '@idiosync/react-observable'

const fetchUser = createCommandStream(({ $, store }) =>
  $.streamAsync(async ([userId]) => {
    // ...fetch user logic
    return userData
  }),
)

// Usage in a component
async function handleFetch() {
  const [user, error] = await fetchUser('user-id')
}
```

## Context API

```typescript
import { ReactObservableProvider, ReactObservableContext } from '@idiosync/react-observable'

// Wrap your app
<ReactObservableProvider store={store}>
  <App />
</ReactObservableProvider>

// Access the store directly (advanced)
const store = useContext(ReactObservableContext)
```

## Error Handling

Use `.catchError` on observables or streams to handle errors gracefully.

```typescript
counter$.catchError((error, currentValue, set) => {
  // Handle or log error
  set(0) // fallback
})
```

## Stream Completion

Signal that a stream has finished using `emitComplete`.

```typescript
const obs$ = createObservable({ initialValue: 0 })
obs$.emitComplete()
```

## API Reference

### Observables

- `createObservable<T>(config): Observable<T>`
- `createPersistentObservable<T>(config): PersistentObservable<T>`
- `createObservableStore(config): Store`
- `combineLatestFrom(...observables): Observable<[...values]>`
- `.subscribe(listener, onError?, onComplete?)`
- `.set(value)`
- `.get()`
- `.stream(project, options?)`
- `.catchError(handler)`
- `.emitComplete()`

### Hooks

- `useObservableValue(initialiser)`
- `useEffectStream(initialiser, dependencies)`
- `useStoreObservable(initialiser)`

### Command Streams

- `createCommandStream(initialiser, options?)`

### Context

- `ReactObservableProvider`
- `ReactObservableContext`

## License

MIT
