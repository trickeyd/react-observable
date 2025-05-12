import { useEffect, useState, useRef, useCallback } from 'react'
import { Observable } from '../types/observable'
import { Readonly } from '../types/access'
import { useStoreProxy } from './use-store-proxy'
import { wrapObservable } from '../utils/stream'
import { Store } from '../types/store'

export const useObservable = <ReturnT = any>(
  initialise: (
    {
      store,
      wrapObservable,
    }:
    {
      store: Store,
      wrapObservable: <T extends unknown = unknown>(observable: Observable<T>) => Observable<T>
    }
  ) => Observable<ReturnT>,
): Readonly<ReturnT> => {
  const ref = useRef<Observable<ReturnT> | undefined>(undefined)
  const subscriptionsRef = useRef<(() => void)[]>([])

  const handleSubscription = useCallback((unsubscribe: () => void) => {
    subscriptionsRef.current.push(unsubscribe)
  }, [])

  const observableStoreProxy = useStoreProxy(handleSubscription)

  const handleWrapObservable = useCallback(<T extends unknown = unknown>(observable: Observable<T>) => {
    return wrapObservable<T>(observable, handleSubscription)
  }, [])

  if (!ref.current) {
    ref.current = initialise({
      store: observableStoreProxy,
      wrapObservable: handleWrapObservable,
    })
  }

  const [data, setData] = useState<Readonly<ReturnT>>(ref.current.get())

  useEffect(() => {
    const sub = ref.current?.subscribe((newData: Readonly<ReturnT>) => {
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
