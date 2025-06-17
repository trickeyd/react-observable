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

### 1. Create Store Modules

Create a module for each part of your store, exporting all the individual observables. It is best to use many observables, rather than to many properties in any one, as this will result in more targeted updates throughout your app.

```typescript
// src/store/modules/timing.ts
import { createObservable } from '@idiosync/react-observable'

export const counter$ = createObservable<number>({ initialValue: 0 })
export const timer$ = createObservable<number>({ initialValue: 100 })
```

```typescript
// src/store/modules/settings.ts
import { createPersistentObservable } from '@idiosync/react-observable'

export const settings$ = createPersistentObservable<ThemeConfig>({
  initialValue: { theme: 'light' },
  name: 'settings',
})
```

### 2. Construct Your Store from Store Modules

Each store module exports its observables, and you import the entire module as an alias when constructing your store.

```typescript
// src/store/create-observable-store.ts
import { createStore } from '@idiosync/react-observable'
import * as timing from './modules/timing'
import * as settings from './modules/settings'
// ...import other store modules

export function createObservableStore() {
  const store = {
    timing,
    settings,
    // ...other store modules
  }

  // Optionally pass persistentStorage here
  createStore(store)
  return store
}
```

### 3. Export the Store Type

```typescript
// src/app-shell.tsx
export const observableStore = createObservableStore()
```

### 4. Type Augmentation for Automatic Typing

Create a type augmentation file to merge your store type with the library's Store interface. This enables full type inference everywhere you use the library's hooks or context.

```typescript
// src/types/augmentations/react-observable.d.ts
import { observableStore } from '../../app-shell'
type ObservableStore = typeof observableStore

declare module '@idiosync/react-observable' {
  export interface Store extends ObservableStore {}
}
```

**After this, all hooks and context access will be fully typed, with no manual type wiring needed as observables are added and removed from the store modules.**

### 5. Basic Observable Usage

```typescript
import { useObservableValue } from '@idiosync/react-observable'

function Counter() {
  const count = useObservableValue(({ store }) => store.timing.counter$)
  return <div>Count: {count}</div>
}
```

### 6. Creating a Persistent Observable

```typescript
import { createPersistentObservable } from '@idiosync/react-observable'

const settings$ = createPersistentObservable({
  initialValue: { theme: 'light', fontSize: 16 },
  name: 'app-settings',
})

// Wait for hydration
await settings$.rehydrate()
```

### 7. React Context Integration

This should be added at the top level of your application. The store is added automatically, so only a loading element is added if required.

```typescript
import { ReactObservableProvider } from '@idiosync/react-observable'

function App() {
  return (
    <ReactObservableProvider loading={<LoadingSpinner />}>
      <YourApp />
    </ReactObservableProvider>
  )
}
```

## React Hooks

### useObservableValue

Get the current value of an observable and subscribe reactively. Streams can be used here for deriving values, but it is not advisable to use local variables in them, as the value as the time of stream creation will always be used. This hook is purely for values derived from state.

```typescript
import { useObservableValue } from '@idiosync/react-observable'

function Counter() {

  const count = useObservableValue(({ store }) => store.timing.counter$)

  const multipliedCount = useObservableValue(({ store: {
    timing:{ counter$ },
    multipliers: { mainMultipiler$ }
  }}) => counter$.withLatestFrom(mainMultipiler$).stream(([count, multiplier] => count * multiplier)))

  return (
    <div>
      <div>Count: {count}</div>
      <div>Multiplied Count: {multipliedCount}</div>
    </div>
  )
}
```

### useEffectStream

Create a derived value or effectful stream that reacts to a dependency array. $ is the entry point, so the stream must start there in order for the inputs or dependencies are passed.

```typescript
import { useEffectStream } from '@idiosync/react-observable'

function MultipliedCounter({ multiplier }) {

  const multipliedCount = useEffectStream(
    ({ $, store: {
      timing: {
        counter$
      }
    } }) => $.withLatestFrom(counter$).stream(([multiplier, count]) => count * multiplier),
    [multiplier]
  )
  return <div>Doubled: {multipliedCount}</div>
}
```

### useStoreObservable

Access a raw observable from the store.
!!WARNING: Any streams / subscriptions created from these observables in your compnenets or hooks will not automatically be cleaned up!!

```typescript
import { useStoreObservable } from '@idiosync/react-observable'

function RawCounter() {
  const counter$ = useStoreObservable(({ store }) => store.timing.counter$)
  // You can now use counter$ directly (subscribe, set, etc.)
}
```

## Command Streams

### createCommandStream

Create a command stream for side-effectful actions (e.g., API calls, orchestrations). These are implimented in stand-alone modules, and called from components or other command streams

```typescript
import { createCommandStream } from '@idiosync/react-observable'

const fetchUser = createCommandStream(({ $, store }) =>
  $.streamAsync(async ([userId]) => {
    // ...fetch user logic
    // Example: store.user.user$.set(fetchedUser)
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
// Access observables as store.segment.observable$
// Example: store.timing.counter$, store.settings.settings$
```

## Error Handling

Use `.catchError` on observables or streams to handle errors gracefully.

```typescript
counter$
  .stream((counter) => {
    if (counter < 0) {
      // this allows for very liberal error throwing
      // throughout streams
      throw new Error('counter is less that zero')
    }
  })
  .catchError((error, currentValue, set) => {
    // with centralised handling, for instance
    logError(Errors.COUNTER_ERROR, error.message)

    set(0) // fallback
  })
```

## API Reference

### Observables

- **`createObservable<T>(config): Observable<T>`**  
  Create a new observable with an initial value.

  ```typescript
  const counter$ = createObservable({ initialValue: 0 })
  ```

- **`createPersistentObservable<T>(config): PersistentObservable<T>`**  
  Create a persistent observable that syncs with async storage.

  ```typescript
  const settings$ = createPersistentObservable({
    initialValue: { theme: 'light' },
  })
  ```

- **`createObservableStore(config): Store`**  
  Create a store composed of multiple store modules.

#### Observable Instance Methods

- **`.get()`**  
  Get the current value of the observable.

  ```typescript
  const value = counter$.get()
  ```

- **`.set(value)`**  
  Set a new value (or updater function) for the observable.

  ```typescript
  counter$.set(5)
  counter$.set((current) => current + 1)
  ```

- **`.subscribe(listener, onError?, onComplete?)`**  
  Subscribe to value changes, errors, or completion. Returns an unsubscribe function.

  ```typescript
  const unsubscribe = counter$.subscribe(
    (value) => console.log('Value:', value),
    (error) => console.error('Error:', error),
    () => console.log('Completed!'),
  )
  // Later: unsubscribe()
  ```

- **`.stream(project, options?)`**  
  Create a derived observable (stream) from this observable, and project a new value.

  ```typescript
  const doubled$ = counter$.stream((value) => value * 2)
  ```

- **`.streamAsync(asyncProject, options?)`**  
  Create a derived observable (stream) from this observable using an async function. Useful for async transformations or side effects.

  ```typescript
  const userData$ = userId$.streamAsync(async (userId) => {
    const user = await fetchUser(userId)
    return user
  })
  ```

- **`.withLatestFrom(...observables)`**  
  Create a stream that emits tuples of the latest values from this and other observables.

  ```typescript
  const combined$ = counter$.withLatestFrom(settings$)
  ```

- **`combineLatestFrom(...observables): Observable<[...values]>`**  
  Combine multiple observables into one that emits arrays of their latest values.

  ```typescript
  const combined$ = counter$.combineLatestFrom(settings$)
  ```

- **`.catchError(handler)`**  
  Handle errors thrown in streams or async operations.

  ```typescript
  counter$
    .stream((val) => {
      if (val < 0) throw new Error('Negative!')
      return val
    })
    .catchError((error, current, set) => set(0))
  ```

- **`.reset()`**  
  Reset the observable to its initial value.

  ```typescript
  counter$.reset()
  ```

### Hooks

- `useObservableValue(initialiser)`
- `useEffectStream(initialiser, dependencies)`
- `useStoreObservable(initialiser)`

### Command Streams

- `createCommandStream(initialiser, options?)`

### Context

- `ReactObservableProvider`
- `ReactObservableContext`

## Custom Persistent Storage

By default, persistent observables use a built-in storage mechanism, but you can provide your own async storage implementation (e.g., for React Native, web, or custom backends) by passing it as an option to `createObservableStore`.

### PersistentStorage Type

The library exports a `PersistentStorage` TypeScript interface for your convenience:

```typescript
import { PersistentStorage } from '@idiosync/react-observable'

const persistentStorage: PersistentStorage = {
  getItem: async (key) => {
    /* ... */
  },
  setItem: async (key, value) => {
    /* ... */
  },
  removeItem: async (key) => {
    /* ... */
  },
}
```

### Example: Using React Native AsyncStorage

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  createObservableStore,
  PersistentStorage,
} from '@idiosync/react-observable'

const persistentStorage: PersistentStorage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
}

const store = createObservableStore(
  {
    user: createPersistentObservable({
      initialValue: null,
      name: 'user',
    }),
    // ...other observables
  },
  {
    persistentStorage,
  },
)
```

### Example: Using LocalStorage (Web)

```typescript
import {
  createObservableStore,
  PersistentStorage,
} from '@idiosync/react-observable'

const persistentStorage: PersistentStorage = {
  getItem: async (key) => localStorage.getItem(key),
  setItem: async (key, value) => localStorage.setItem(key, value),
  removeItem: async (key) => localStorage.removeItem(key),
}

const store = createObservableStore(
  {
    settings: createPersistentObservable({
      initialValue: { theme: 'light' },
      name: 'settings',
    }),
    // ...other observables
  },
  {
    persistentStorage,
  },
)
```

### Notes

- You only need to pass `persistentStorage` when creating your store.
- The storage object must implement `getItem`, `setItem`, and `removeItem`, each returning a Promise (even if using synchronous storage like localStorage).
- This allows you to use any async storage backend, including custom solutions.

## License

MIT
