import React, { useEffect, useState, createContext, useRef } from 'react'
import { PersistentObservable } from '../types/observable'
import { Store } from '../types/store'
import { store$ } from './createStore'

/** @internal */
export const ReactObservableContext =
  createContext<Store | null>(null)

interface Props {
  children: React.ReactNode
  loading?: React.ReactNode | null
}

export function ReactObservableProvider({
  children,
  loading = null,
}: Props) {
  const [store, setStore] = useState<Store | null>(null)
  const isRehydrating = useRef(false)

  useEffect(() => {
    if (store || isRehydrating.current) return

    return store$.subscribeWithValue((incomingStore) => {
      isRehydrating.current = true
      Promise.all(
        Object.values(incomingStore).reduce<Promise<unknown>[]>((acc, segment) => {
          return [
            ...acc,
            ...Object.values(segment).map((observable) => {
              // Duck-type filter the persistent ones
              if (!!(observable as PersistentObservable<unknown>).rehydrate) {
                return (observable as PersistentObservable<unknown>).rehydrate()
              } 
              return Promise.resolve(false)
            })
          ]
        }, [])
      )
      .then(() => {
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
