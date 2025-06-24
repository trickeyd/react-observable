import { useEffect, useState, useRef, useCallback } from 'react'
import { Observable } from '../types/observable'
import { useEqualityChecker } from './use-equality-checker'
import { Readonly } from '../types/access'
import { Store } from '../types/store'
import { createObservable } from '../factories/observable'
import { useStoreProxy } from './use-store-proxy'

export const useEffectStream = <
  ReturnT = any,
  InputT extends unknown[] = unknown[],
>(
  initialise: ({
    $,
    store,
  }: {
    $: Observable<InputT>
    store: Store
  }) => Observable<ReturnT>,
  inputs: InputT,
): Readonly<ReturnT> => {
  const ref = useRef<Observable<ReturnT> | undefined>(undefined)
  const subscriptionsRef = useRef<(() => void)[]>([])
  const entry$ = useRef(createObservable<InputT>()).current

  const handleSubscription = useCallback((unsubscribe: () => void) => {
    subscriptionsRef.current.push(unsubscribe)
  }, [])

  // Get store proxy - this will throw if no provider is available
  const observableStoreProxy = useStoreProxy(handleSubscription)

  if (!ref.current) {
    ref.current = initialise({
      $: entry$,
      store: observableStoreProxy,
    })
  }

  const isEqual = useEqualityChecker(inputs)
  if (!isEqual) {
    entry$.set(inputs)
  }

  const [data, setData] = useState(ref.current.get)

  useEffect(() => {
    if (!ref.current) throw new Error('No observable found')

    const sub = ref.current.subscribe((newData: Readonly<ReturnT>) => {
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
