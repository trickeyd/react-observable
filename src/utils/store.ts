import { Duckservable, Observable } from '../types/observable'
import { Store } from '../types/store'
import { store$ } from '../store/create-store'
import { isObject } from './general'

export const getStoreObservable = <T>(
  callback: (store: Store) => Observable<T>,
): Observable<T> => {
  const store = store$.get()
  if (!store) {
    throw new Error('Store not initialized')
  }
  return callback(store)
}

/**
 * Merges multiple store objects using spread syntax.
 * Later objects take precedence over earlier ones.
 * Throws an error if any input is not an object.
 */
export const mergeStoreObjects = <
  T extends Record<string, Record<string, Duckservable>>,
>(
  ...storeObjects: T[]
): T => {
  // Validate all inputs are objects
  return storeObjects.reduce<T>((store, storeObject, index) => {
    if (!isObject(store)) {
      throw new Error(
        `Store object at index ${index} is not a valid object. Got: ${typeof store}`,
      )
    }
    return Object.entries(storeObject).reduce<T>(
      (storeSegments, [key, segment]) => {
        if (!isObject(segment)) {
          throw new Error(
            `Store segment ${key} is not a valid object. Got: ${typeof segment}`,
          )
        }
        return storeSegments[key]
          ? { ...storeSegments, [key]: { ...storeSegments[key], ...segment } }
          : { ...storeSegments, [key]: segment }
      },
      store,
    )
  }, {} as T)
}
