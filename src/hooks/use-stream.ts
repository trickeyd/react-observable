import { useEffect, useState, useRef, useCallback } from 'react'
import { Observable } from '../types/observable'
import { useEqualityChecker } from './use-equality-checker'
import { Readonly } from '../types/access'
import { Store } from '../types/store'
import { createObservable } from '../factories/observable'
import { useStoreProxy } from './use-store-proxy'

export const useStream = <ReturnT = any>(
  initialise: ({
    $,
    store,
  }: {
    $: Observable<undefined>
    store: Store
  }) => Observable<ReturnT>,
  dependencies: any[],
): Readonly<ReturnT> => {
  const observableRef = useRef<Observable<ReturnT> | undefined>(undefined)
  const observableSubscriptionRef = useRef<() => void | undefined>(undefined)
  const subscriptionsRef = useRef<(() => void)[]>([])
  const entry$ = useRef(
    createObservable<undefined>({ initialValue: undefined }),
  ).current

  const handleSubscription = useCallback((unsubscribe: () => void) => {
    subscriptionsRef.current.push(unsubscribe)
  }, [])

  const observableStoreProxy = useStoreProxy(handleSubscription)

  const initialiseObservable = useCallback(() => {
    observableRef.current = initialise({
      $: entry$,
      store: observableStoreProxy,
    })
  }, [])

  console.log('TEST')
  const subscribe = useCallback(() => {
    if (!observableRef.current) {
      throw new Error('Attempting to subscribe to an uninitialised observable')
    }
    observableSubscriptionRef.current = observableRef.current.subscribe(
      (newData: Readonly<ReturnT>) => {
        setData(newData)
      },
    )
  }, [])

  const cleanUp = useCallback(() => {
    observableSubscriptionRef.current?.()
    subscriptionsRef.current.forEach((unsubscribe) => unsubscribe())
    subscriptionsRef.current.length = 0
  }, [])

  const isEqual = useEqualityChecker(dependencies)
  useEffect(() => {
    console.log('isEqual', isEqual)
    if (!isEqual) {
      cleanUp()
      initialiseObservable()
      entry$.emit()
    }
  }, [isEqual])

  const [data, setData] = useState(() => {
    console.log('observableRef.current init', observableRef.current)
    return observableRef.current!.get()
  })

  useEffect(() => {
    subscribe()
    return cleanUp
  }, [])

  return data
}
