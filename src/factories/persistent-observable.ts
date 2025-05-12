import AsyncStorage from '@react-native-async-storage/async-storage'
import { createObservable } from './observable'
import {
  CreateObservableParams,
  ObservableSetter,
  Observable,
} from '../types/observable'
import { isFunction, isPlainObject } from '../utils/general'
import { Readonly } from '../types/access'
import { PersistentObservable } from '../types/observable'

export const persistentObservables: PersistentObservable<any>[] = []

const defaultMergeOnHydration = <T, Persisted = T>(
  initialValue: T,
  persisted: Persisted,
): T => {
  if (!isPlainObject(initialValue)) {
    return persisted as unknown as T
  }
  return { ...initialValue, ...(persisted ?? {}) } as T
}

interface CreatePersistentObservableParams<T>
  extends CreateObservableParams<T> {
  mergeOnHydration?: (initialValue: T, persisted: unknown) => T
}

export function createPersistentObservable<T>({
  name,
  initialValue,
  equalityFn,
  mergeOnHydration = defaultMergeOnHydration,
}: CreatePersistentObservableParams<T>): Observable<T> {
  if (!name) {
    throw new Error('Persistent observables require a name')
  }
  let _rehydrateIsComplete = false
  let _resolveRehydrate: (() => void) | undefined

  const base = createObservable({ initialValue, name })

  const set: ObservableSetter<T> = (newValue) => {
    const value = base.get()
    const reducedValue = isFunction(newValue) ? newValue(value) : newValue

    if (
      ((equalityFn && !equalityFn(value, reducedValue as Readonly<T>)) ||
        value === reducedValue)
    ) {
      return
    }

    base.set(reducedValue)
    AsyncStorage.setItem(name, JSON.stringify(reducedValue))
  }

  AsyncStorage.getItem(name).then((value) => {
    if (value) {
      const persisted = JSON.parse(value) as T
      const data = mergeOnHydration
        ? mergeOnHydration(base.getInitialValue(), persisted)
        : persisted
      base.set(data)
    }
    _rehydrateIsComplete = true
    if (_resolveRehydrate) {
      _resolveRehydrate()
    }
  })

  const rehydrate = (): Promise<void> =>
    new Promise((resolve) => {
      if (_rehydrateIsComplete) {
        resolve()
      } else {
        _resolveRehydrate = resolve
      }
    })

  const reset = () => set(base.getInitialValue())

  const observable = {
    ...base,
    set,
    rehydrate,
    reset,
  }

  persistentObservables[persistentObservables.length] = observable

  return observable as Observable<T>
}
