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
type StoreObject = Record<string, Record<string, Duckservable>>
export const mergeStoreObjects = (...storeObjects: StoreObject[]): Store => {
  // Validate all inputs are objects
  return storeObjects.reduce<StoreObject>((store, storeObject, index) => {
    if (!isObject(store)) {
      throw new Error(
        `Store object at index ${index} is not a valid object. Got: ${typeof store}`,
      )
    }
    return Object.entries(storeObject).reduce<StoreObject>(
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
  }, {} as StoreObject)
}
