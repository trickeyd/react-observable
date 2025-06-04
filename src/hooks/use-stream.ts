import { useEffect, useState, useRef, useCallback } from 'react'
import { Observable } from '../types/observable'
import { useEqualityChecker } from './use-equality-checker'
import { Readonly } from '../types/access'
import { Store } from '../types/store'
import { createObservable } from '../factories/observable'
import { useStoreProxy } from './use-store-proxy'

export const useStream = <ReturnT = any, DepsT extends unknown[] = unknown[]>(
  initialise: ({
    $,
    store,
  }: {
    $: Observable<DepsT>
    store: Store
  }) => Observable<ReturnT>,
  dependencies: DepsT,
): Readonly<ReturnT> => {
  const ref = useRef<Observable<ReturnT> | undefined>(undefined)
  const subscriptionsRef = useRef<(() => void)[]>([])
  const entry$ = useRef(
    createObservable<DepsT>({ initialValue: dependencies }),
  ).current

  const handleSubscription = useCallback((unsubscribe: () => void) => {
    subscriptionsRef.current.push(unsubscribe)
  }, [])

  const observableStoreProxy = useStoreProxy(handleSubscription)

  if (!ref.current) {
    ref.current = initialise({
      $: entry$,
      store: observableStoreProxy,
    })
  }

  const isEqual = useEqualityChecker(dependencies)
  if (!isEqual) {
    entry$.set(dependencies)
  }

  const [data, setData] = useState(ref.current.get)

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
