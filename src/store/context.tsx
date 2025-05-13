import React, { useEffect, useState, createContext } from 'react'
import { PersistentObservable } from '../types/observable'
import { FlatStore, Store } from '../types/store'
import { useObservable } from '../hooks/use-observable'
import { flatStore$, store$ } from './createStore'

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
  const [isLoaded, setIsLoaded] = useState(false)
  const flatStore = useObservable(() => flatStore$)
  const store = useObservable(() => store$)

  // Duck-type filter the persistent ones
  const persistentObservables = Object.values(flatStore).filter(
    (ob) => !!(ob as PersistentObservable<unknown>).rehydrate,
  )

  useEffect(() => {
    const setStateWhenComplete = async () => {
      await Promise.all(
        persistentObservables.map(
          (observable) =>
            !!(observable as PersistentObservable<unknown>).rehydrate(),
        ),
      )

      setIsLoaded(true)
    }
    setStateWhenComplete()
  }, [])

  return (
    <ReactObservableContext.Provider value={store as Store}>
      {isLoaded ? children : loading}
    </ReactObservableContext.Provider>
  )
}
