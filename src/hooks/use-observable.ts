import { useEffect, useState, useRef, useCallback } from 'react'
import { Observable } from '../types/observable'
import { Readonly } from '../types/access'
import { useStoreProxy } from './use-store-proxy'
import { wrapObservable } from '../utils/stream'
import { Store } from '../types/store'

type ObservableValue<O> = O extends Observable<infer T> ? T : never;

export function useObservable<
  O extends Observable<any>
>(
  initialise: (args: {
    store: Store,
    wrapObservable: <T = unknown>(observable: Observable<T>) => Observable<T>
  }) => O
): ObservableValue<O> {
  const ref = useRef<O | undefined>(undefined)
  const subscriptionsRef = useRef<(() => void)[]>([])

  const handleSubscription = useCallback((unsubscribe: () => void) => {
    subscriptionsRef.current.push(unsubscribe)
  }, [])

  const observableStoreProxy = useStoreProxy(handleSubscription)

  const handleWrapObservable = useCallback(<T = unknown>(observable: Observable<T>) => {
    return wrapObservable<T>(observable, handleSubscription)
  }, [])

  if (!ref.current) {
    ref.current = initialise({
      store: observableStoreProxy,
      wrapObservable: handleWrapObservable,
    })
  }

  const [data, setData] = useState<ObservableValue<O>>(ref.current.get())

  useEffect(() => {
    const sub = ref.current?.subscribe((newData: ObservableValue<O>) => {
      setData(newData)
    })

    return () => {
      sub?.()
      subscriptionsRef.current.forEach((unsub) => unsub())
      subscriptionsRef.current.length = 0
    }
  }, [])

  return data
} 
