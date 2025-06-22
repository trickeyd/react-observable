import { createObservable } from './observable'
import {
  CreateObservableParams,
  ObservableSetter,
  Observable,
} from '../types/observable'
import { isFunction, isPlainObject } from '../utils/general'
import { Readonly } from '../types/access'
import { PersistentObservable } from '../types/observable'
import { persistentStorage$ } from '../store/create-store'

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
  let _persistentStorage = persistentStorage$.get()
  if (!_persistentStorage) {
    persistentStorage$.subscribeOnce((persistentStorage) => {
      _persistentStorage = persistentStorage
    })
  }

  const base = createObservable({ initialValue, name })

  const _setInternal =
    (isSilent: boolean): ObservableSetter<T> =>
    (newValue, stack) => {
      const observableName = base.getName()
      if (!observableName || observableName === base.getId()) {
        throw new Error('Persistent observable name is required for set.')
      }
      const value = base.get()
      const reducedValue = isFunction(newValue) ? newValue(value) : newValue

      if (
        (equalityFn && !equalityFn(value, reducedValue as Readonly<T>)) ||
        value === reducedValue
      ) {
        return -1
      }

      // Set the value locally first
      const result = isSilent
        ? base.setSilent(reducedValue)
        : base.set(reducedValue)

      if (_persistentStorage) {
        try {
          _persistentStorage.setItem(
            observableName,
            JSON.stringify(reducedValue),
          )
        } catch (error) {
          throw new Error(
            `Failed to persist value to storage for ${observableName}: ${error}`,
          )
        }
      }

      return result
    }

  const setSilent: ObservableSetter<T> = _setInternal(true)
  const set: ObservableSetter<T> = _setInternal(false)

  const rehydrate = (): Promise<void> =>
    new Promise((resolve, reject) => {
      if (!_persistentStorage) {
        reject(
          new Error(
            'Trying to rehydrate a persistent observable without a persistent storage.',
          ),
        )
        return
      }
      const observableName = base.getName()
      if (!observableName || observableName === base.getId()) {
        reject(
          new Error('Persistent observable name is required for rehydration.'),
        )
        return
      }

      _persistentStorage
        .getItem(observableName)
        .then((value) => {
          if (value) {
            try {
              const persisted = JSON.parse(value) as T
              const data = mergeOnHydration
                ? mergeOnHydration(base.getInitialValue(), persisted)
                : persisted
              base.set(data)
            } catch (error) {
              // If JSON parsing fails, reject so library can handle
              reject(
                new Error(
                  `Failed to parse stored value for ${observableName}: ${error}`,
                ),
              )
              return
            }
          }
          resolve()
        })
        .catch((error) =>
          reject(
            new Error(
              `Failed to get value from storage for ${observableName}: ${error instanceof Error ? error.message : error}`,
            ),
          ),
        )
    })

  const reset = () => set(base.getInitialValue())

  const observable = {
    ...base,
    set,
    setSilent,
    rehydrate,
    reset,
  }

  persistentObservables[persistentObservables.length] = observable

  return observable as Observable<T>
}
