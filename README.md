# @idiosync/react-observable

A lightweight, type-safe, and reactive state management library for React applications. Designed for composability, streams, and ergonomic integration with React hooks and context.

## Features

- **Simple & Intuitive**: Create observables and use them directly with React hooks
- **Type-Safe**: Full TypeScript support with automatic type inference
- **Reactive**: Components automatically update when observables change
- **Stream-Based**: Powerful stream operators for derived state and async operations
- **Context Integration**: Global store management with React context
- **Persistent Storage**: Built-in support for AsyncStorage, localStorage, and custom backends
- **Error Handling**: Centralized error handling with `.catchError()`
- **Immutable**: Deep readonly types prevent accidental mutations

## Why Not Redux? (What This Library Fixes)

While Redux is powerful, it comes with pain points that `@idiosync/react-observable` solves:

- **Less Boilerplate**: No actions, reducers, or action types needed
- **Natural Async Flows**: Command streams and async operators instead of thunks/sagas
- **Reactive by Default**: Components update automatically, no manual subscriptions
- **Modern React API**: Hooks that feel like React with dependency arrays
- **Type Safety**: Automatic inference with deep readonly types
- **Better Side Effects**: First-class command streams for side effects
- **Built-in Persistence**: No extra libraries needed for persistent state

## Installation

```bash
npm install @idiosync/react-observable
# or
yarn add @idiosync/react-observable
```

## Quick Start

### 1. Create Your Store

Start by creating observables for your application state:

```typescript
// src/store/modules/user.ts
import { createObservable } from '@idiosync/react-observable'

export const user$ = createObservable<User | null>({
  initialValue: null,
})

export const isAuthenticated$ = createObservable<boolean>({
  initialValue: false,
})
```

```typescript
// src/store/modules/settings.ts
import { createPersistentObservable } from '@idiosync/react-observable'

export const theme$ = createPersistentObservable<'light' | 'dark'>({
  initialValue: 'light',
  // The name will be used for the async key, but if not supplied,
  // it will default to the observable's name when the store is created
  name: 'theme',
})

export const fontSize$ = createPersistentObservable<number>({
  initialValue: 16,
})
```

### 2. Create Your Store

Combine your modules into a store:

```typescript
// src/store/index.ts
import { createStore } from '@idiosync/react-observable'
import * as user from './modules/user'
import * as settings from './modules/settings'

export function createAppStore() {
  const store = {
    user,
    settings,
  }

  createStore(store)
  return store
}
```

### 3. Set Up the Provider

Wrap your app with the provider (required for all hooks):

```typescript
// src/App.tsx
import { ReactObservableProvider } from '@idiosync/react-observable'
import { createAppStore } from './store'

createAppStore()

function App() {
  return (
    <ReactObservableProvider loading={<div>Loading...</div>}>
      <YourApp />
    </ReactObservableProvider>
  )
}
```

### 4. Type Augmentation (Optional but Recommended)

For full type inference, create a type augmentation file:

```typescript
// src/types/react-observable.d.ts
import { createAppStore } from '../store'

type AppStore = ReturnType<typeof createAppStore>

declare module '@idiosync/react-observable' {
  export interface Store extends AppStore {}
}
```

### 5. Use in Components

Now you can use observables in your components:

```typescript
import { useObservableValue } from '@idiosync/react-observable'

function UserProfile() {
  const user = useObservableValue(({ store }) => store.user.user$)
  const theme = useObservableValue(({ store }) => store.settings.theme$)

  if (!user) return <div>Please log in</div>

  return (
    <div className={`profile ${theme}`}>
      <h1>Welcome, {user.name}!</h1>
    </div>
  )
}
```

## React Hooks

### useObservableValue

Get the current value of an observable. Perfect for simple state access:

```typescript
import { useObservableValue } from '@idiosync/react-observable'

function Counter() {
  const count = useObservableValue(({ store }) => store.counter.count$)

  return <div>Count: {count}</div>
}
```

### useEffectStream

Create derived state that reacts to dependencies. Use this for computed values or when you need to react to prop changes:

```typescript
import { useEffectStream } from '@idiosync/react-observable'

function MultipliedCounter({ multiplier }: { multiplier: number }) {
  const result = useEffectStream(
    ({ $, store }) =>
      $.withLatestFrom(store.counter.count$)
        .stream(([[mult], count]) => count * mult),
    [multiplier]
  )

  return <div>Result: {result}</div>
}
```

#### Dependency Arrays vs Input Arrays

This library uses **input arrays** rather than React's dependency arrays:

- **Input Array**: The `$` observable receives dependency values as an array `[multiplier]`
- **Stream Destructuring**: `$.withLatestFrom(store.counter.count$)` emits `[[multiplier], count]`, hence `[[mult], count]`

When `multiplier` changes, it flows: `[multiplier]` → `$` → `[[multiplier], count]` → destructured as `[[mult], count]`

Unlike a useEffect, access to the componenet scope will not update, so you should never access component level variables directly.

### useStoreObservable

Access raw observables from the store (advanced usage):

```typescript
import { useStoreObservable } from '@idiosync/react-observable'

function CounterWithActions() {
  const counter$ = useStoreObservable(({ store }) => store.counter.count$)

  const increment = () => counter$.set(count => count + 1)
  const decrement = () => counter$.set(count => count - 1)

  return (
    <div>
      <button onClick={decrement}>-</button>
      <span>{counter$.get()}</span>
      <button onClick={increment}>+</button>
    </div>
  )
}
```

## Command Streams

Command streams are perfect for side effects like API calls:

```typescript
// src/commands/user.ts
import { createCommandStream } from '@idiosync/react-observable'

export const fetchUser = createCommandStream(({ $, store }) =>
  $.streamAsync(async ([userId]: [string]) => {
    const response = await fetch(`/api/users/${userId}`)
    const user = await response.json()

    // Update the store
    store.user.user$.set(user)
    store.user.isAuthenticated$.set(true)

    return user
  })
)

// Usage in component
function UserProfile({ userId }: { userId: string }) {
  const handleFetch = useCallback(async () => {
    const [user, error] = await fetchUser(userId)
    if (error) {
      console.error('Failed to fetch user:', error)
    }
  }, [userId])

  return <button onClick={handleFetch}>Load User</button>
}
```

## Observable Methods

### Basic Operations

```typescript
const counter$ = createObservable({ initialValue: 0 })

// Get current value
const current = counter$.get()

// Set new value
counter$.set(5)
counter$.set((current) => current + 1)

// Subscribe to changes
const unsubscribe = counter$.subscribe((value) => {
  console.log('Counter changed:', value)
})

// Clean up
unsubscribe()
```

### Stream Operations

```typescript
// Transform values
const doubled$ = counter$.stream((count) => count * 2)

// Async operations
const userData$ = userId$.streamAsync(async (id) => {
  const response = await fetch(`/api/users/${id}`)
  return response.json()
})

// Combine multiple observables
const combined$ = counter$.withLatestFrom(settings$)
const all$ = counter$.combineLatestFrom(settings$, theme$)
```

### Error Handling

```typescript
counter$
  .stream((value) => {
    if (value < 0) throw new Error('Negative counter!')
    return value
  })
  .catchError((error, currentValue, set) => {
    console.error('Counter error:', error)
    set(0) // Fallback value
  })
```

## Persistent Storage

### Using AsyncStorage (React Native)

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage'
import { PersistentStorage } from '@idiosync/react-observable'

const persistentStorage: PersistentStorage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
}

// Pass to createStore
createStore(store, { persistentStorage })
```

### Using localStorage (Web)

```typescript
const persistentStorage: PersistentStorage = {
  getItem: async (key) => localStorage.getItem(key),
  setItem: async (key, value) => localStorage.setItem(key, value),
  removeItem: async (key) => localStorage.removeItem(key),
}
```

## Best Practices

### 1. Use Many Small Observables

Instead of one large observable, use many small ones for better performance:

```typescript
// ❌ Don't do this
const user$ = createObservable({
  initialValue: {
    name: '',
    email: '',
    preferences: { theme: 'light', fontSize: 16 },
  },
})

// ✅ Do this instead
const userName$ = createObservable({ initialValue: '' })
const userEmail$ = createObservable({ initialValue: '' })
const theme$ = createObservable({ initialValue: 'light' })
const fontSize$ = createObservable({ initialValue: 16 })
```

### 2. Always Use the Provider

All hooks require the `ReactObservableProvider`:

```typescript
// ❌ This will throw an error
function Component() {
  const value = useObservableValue(({ store }) => store.counter.count$)
  return <div>{value}</div>
}

// ✅ Wrap with provider
function App() {
  return (
    <ReactObservableProvider>
      <Component />
    </ReactObservableProvider>
  )
}
```

### 3. Use Command Streams for Side Effects

Keep components pure by moving side effects to command streams:

```typescript
// ❌ Don't do side effects in components
function UserProfile() {
  const handleSave = async () => {
    const response = await fetch('/api/user', { method: 'POST' })
    // ...
  }
}

// ✅ Use command streams
const saveUser = createCommandStream(({ $, store }) =>
  $.streamAsync(async ([userData]) => {
    const response = await fetch('/api/user', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
    return response.json()
  }),
)
```

### 4. Use mapEntries for Large Objects

Where possible, break down large objects into individual observables for more targeted updates:

```typescript
// This is fine, but any hook or stream that stems from it will be re-run if any prop changes
const user$ = createObservable({
  initialValue: { id: 1, name: 'John', email: 'john@example.com', preferences: { theme: 'light' } }
})

// Better approach: Use mapEntries to create individual observables. This ensures that anything down stream will only trigger based on the specific property.
const user$ = createObservable({
  initialValue: { id: 1, name: 'John', email: 'john@example.com', preferences: { theme: 'light' } }
})

// Break down into individual observables
const { userName$, userEmail$, userPreferences$ } = user$.mapEntries({
  keys: ['name', 'email', 'preferences']
})

// Now only components using userName$ re-render when name changes
function UserName() {
  const name = useObservableValue(({ store }) => store.user.userName$)
  return <div>Name: {name}</div>
}

// This component only re-renders when email changes
function UserEmail() {
  const email = useObservableValue(({ store }) => store.user.userEmail$)
  return <div>Email: {email}</div>
}
```

This approach ensures that only components using specific properties re-render when those properties change, improving performance significantly.

## API Reference

### Core Functions

- `createObservable<T>(config): Observable<T>`
- `createPersistentObservable<T>(config): PersistentObservable<T>`
- `createStore(store, options?): void`
- `createCommandStream(initializer): CommandStream`

### Hooks

- `useObservableValue(initializer): T`
- `useEffectStream(initializer, dependencies): T`
- `useStoreObservable(initializer): Observable<T>`

### Context

- `ReactObservableProvider`
- `ReactObservableContext`

### Observable Methods

- `.get(): T`
- `.set(value | updater): void`
- `.subscribe(listener): () => void`
- `.stream(project): Observable<T>`
- `.streamAsync(asyncProject): Observable<T>`
- `.withLatestFrom(...observables): Observable<T>`
- `.combineLatestFrom(...observables): Observable<T[]>`
- `.catchError(handler): Observable<T>`
- `.reset(): void`

## License

MIT
