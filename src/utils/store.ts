import { Observable, createObservable } from '..'
import { Store } from '../types/store'
import { store$ } from '../store/createStore'

export const getStoreObservable = <T extends unknown = unknown>(
  callback: (store: Store) => T,
): Observable<T> => {
  const store = store$.get()
  if (!store) {
    throw new Error('Store not initialized')
  }
  return createObservable({ initialValue: callback(store) })
}
