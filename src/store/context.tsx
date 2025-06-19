import React, { useEffect, useState, createContext, useRef } from 'react'
import { PersistentObservable } from '../types/observable'
import { Store } from '../types/store'
import { store$ } from './create-store'

/** @internal */
export const ReactObservableContext = createContext<Store | null>(null)

interface Props {
  children: React.ReactNode
  loading?: React.ReactNode | null
}

export function ReactObservableProvider({ children, loading = null }: Props) {
  const [store, setStore] = useState<Store | null>(null)
  const isRehydrating = useRef(false)

  useEffect(() => {
    if (store || isRehydrating.current) return

    return store$.subscribeWithValue((incomingStore) => {
      if (!incomingStore) {
        throw new Error(
          'Store is not initialized. Make sure createStore() has been called.',
        )
      }

      isRehydrating.current = true
      Promise.all(
        Object.values(incomingStore).reduce<Promise<unknown>[]>(
          (acc, segment) => {
            if (!segment) {
              throw new Error(
                'Store segment is null or undefined. This indicates a corrupted store structure.',
              )
            }
            return [
              ...acc,
              ...Object.values(segment).map((observable) => {
                // Duck-type filter the persistent ones
                if (!!(observable as PersistentObservable<unknown>).rehydrate) {
                  return (
                    observable as PersistentObservable<unknown>
                  ).rehydrate()
                }
                return Promise.resolve(false)
              }),
            ]
          },
          [],
        ),
      ).then(() => {
        setStore(incomingStore as Store)
        isRehydrating.current = false
      })
    })
  }, [store])

  return (
    <ReactObservableContext.Provider value={store}>
      {!!store ? children : loading}
    </ReactObservableContext.Provider>
  )
}
