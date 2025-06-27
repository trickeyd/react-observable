import { createObservable } from './observable'
import {
  CreateObservableParams,
  ObservableSetter,
  Observable,
  InferNullable,
} from '../types/observable'
import { isFunction, isPlainObject } from '../utils/general'
import { Readonly } from '../types/access'
import { PersistentObservable } from '../types/observable'
import { persistentStorage$ } from '../store/create-store'

export const persistentObservables: PersistentObservable<any>[] = []

const defaultMergeOnHydration = <
  NullableInferredT,
  Persisted = NullableInferredT,
>(
  initialValue: NullableInferredT,
  persisted: Persisted,
): NullableInferredT => {
  if (!isPlainObject(initialValue)) {
    return persisted as unknown as NullableInferredT
  }
  return { ...initialValue, ...(persisted ?? {}) } as NullableInferredT
}

interface CreatePersistentObservableParams<NullableInferredT>
  extends CreateObservableParams<NullableInferredT> {
  mergeOnHydration?: (
    initialValue: NullableInferredT,
    persisted: unknown,
  ) => NullableInferredT
}

export function createPersistentObservable<
  T,
  IsNullable extends boolean = true,
>({
  name,
  initialValue,
  equalityFn,
  mergeOnHydration = defaultMergeOnHydration,
}: CreatePersistentObservableParams<InferNullable<T, IsNullable>>): Observable<
  InferNullable<T, IsNullable>
> {
  type NullableInferredT = InferNullable<T, IsNullable>

  let _persistentStorage = persistentStorage$.get()
  if (!_persistentStorage) {
    persistentStorage$.subscribeOnce((persistentStorage) => {
      _persistentStorage = persistentStorage
    })
  }

  const base = createObservable({ initialValue, name })

  const _setInternal =
    (isSilent: boolean): ObservableSetter<NullableInferredT> =>
    (newValue, stack) => {
      const observableName = base.getName()
      if (!observableName || observableName === base.getId()) {
        throw new Error('Persistent observable name is required for set.')
      }
      const value = base.get()
      const reducedValue = isFunction(newValue) ? newValue(value) : newValue

      if (
        (equalityFn &&
          !equalityFn(value, reducedValue as Readonly<NullableInferredT>)) ||
        value === reducedValue
      ) {
        return false
      }

      // Set the value locally first
      const wasSet = isSilent
        ? base.setSilent(reducedValue)
        : base.set(reducedValue)

      if (_persistentStorage && wasSet) {
        // Handle async setItem without making the setter async
        _persistentStorage
          .setItem(observableName, JSON.stringify(reducedValue))
          .catch((error) => {
            // Log the error but don't throw since setter is synchronous
            console.error(
              `Failed to persist value to storage for ${observableName}:`,
              error,
            )
          })
      }

      return wasSet
    }

  const setSilent: ObservableSetter<NullableInferredT> = _setInternal(true)
  const set: ObservableSetter<NullableInferredT> = _setInternal(false)

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
              const persisted = JSON.parse(value) as NullableInferredT
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

  const reset = () => set(base.getInitialValue() as NullableInferredT)

  const observable = {
    ...base,
    set,
    setSilent,
    rehydrate,
    reset,
  }

  persistentObservables[persistentObservables.length] = observable

  return observable as Observable<NullableInferredT>
}
