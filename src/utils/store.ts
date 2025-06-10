import { Observable, createObservable } from '..'
import { Store } from '../types/store'
import { store$ } from '../store/create-store'

export const getStoreObservable = <T>(
  callback: (store: Store) => Observable<T>,
): Observable<T> => {
  const store = store$.get()
  if (!store) {
    throw new Error('Store not initialized')
  }
  return callback(store)
}
