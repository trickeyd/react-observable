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
type DeepMerge<T, U> = {
  [K in keyof T | keyof U]: K extends keyof T
    ? K extends keyof U
      ? T[K] extends Record<string, any>
        ? U[K] extends Record<string, any>
          ? DeepMerge<T[K], U[K]>
          : U[K]
        : U[K]
      : T[K]
    : K extends keyof U
      ? U[K]
      : never
}
type DeepMergeAll<T extends readonly any[]> = T extends readonly [
  infer First,
  ...infer Rest,
]
  ? Rest extends readonly any[]
    ? DeepMerge<First, DeepMergeAll<Rest>>
    : First
  : {}
type StoreObject = Record<string, Record<string, Duckservable>>
export const mergeStoreObjects = <const S extends readonly StoreObject[]>(
  ...storeObjects: S
): DeepMergeAll<S> => {
  // Validate all inputs are objects
  return storeObjects.reduce((store, storeObject, index) => {
    if (!isObject(store)) {
      throw new Error(
        `Store object at index ${index} is not a valid object. Got: ${typeof store}`,
      )
    }
    return Object.entries(storeObject).reduce(
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
  }, {}) as DeepMergeAll<S>
}
