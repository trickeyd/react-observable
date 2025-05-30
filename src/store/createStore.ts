import { Observable } from '../types/observable'
import { createObservable } from '../factories/observable'
import {  Store } from '../types/store'
import { PersistentStorage } from '../types/persistence'

/** @internal */
export const store$ = createObservable<Store>()

/** @internal */
export const flatStore$ = store$.stream((store) => Object.entries(store).reduce(
  (acc, [pathName, segment]) => 
    ({ ...acc,
      ...Object.entries(segment).reduce((segmentAcc, [observablePathName, observable]) => ({...segmentAcc, [`${pathName}.${observablePathName}`]: observable}), {})
    }), {} as Record<string, Observable<unknown>>)
)

export const persistentStorage$ = createObservable<PersistentStorage>()

const flushableObservables: Observable<unknown>[] = []
let storeIsInitialized = false

export const createStore = (store: Store, options:{
  persistentStorage?: PersistentStorage
} = {}) => {
  if(storeIsInitialized) {
    throw new Error('Store already initialized')
  }

  if(options?.persistentStorage) {
    persistentStorage$.set(options.persistentStorage)
  }

  let flatStore: Record<string, Observable<unknown>> = {}
  storeIsInitialized = true

  // parse the store and apply the observable options
  Object.entries(
    store,
  ).forEach(([pathName, segment]) => {
      Object.entries(segment).forEach(([observablePathName, observable]) => {
        const path = `${pathName}.${observablePathName}`
        const observableId = observable.getId()
        const observableName = observable.getName()

        if(observableName === observableId) {
          // automatically set the name of the observable to the path if not already set
          observable.setName(path)
        }


        const isFlushable = true // !options || !options.skipAutomaticFlushes

        if(isFlushable) {
          flushableObservables.push(observable)
        }

        flatStore[path] = observable
      })
    })

  flatStore$.set(flatStore)
  store$.set(store)

  return store
}

export const registerFlushableObservable = (observable: Observable<unknown>) => {
  flushableObservables.push(observable)
}

export const flush = () => {
  flushableObservables.forEach((observable) => {
    observable.reset()
  })
}