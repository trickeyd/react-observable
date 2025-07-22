import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { Observable } from '../types/observable'
import { useEqualityChecker } from './use-equality-checker'
import { Readonly } from '../types/access'
import { Store } from '../types/store'
import { createObservable } from '../factories/observable'
import { useStoreProxy } from './use-store-proxy'
import { InferNullable } from '../types/observable'

export const useEffectStream = <
  ReturnT = any,
  InputT extends unknown[] = unknown[],
  IsNullable extends boolean = true,
>(
  initialise: ({
    $,
    store,
  }: {
    $: Observable<InputT>
    store: Store
  }) => Observable<InferNullable<ReturnT, IsNullable>>,
  inputs: InputT,
): [Readonly<InferNullable<ReturnT, IsNullable>>, () => void] => {
  type NullableInferredReturnT = InferNullable<ReturnT, IsNullable>
  const ref = useRef<Observable<NullableInferredReturnT> | undefined>(undefined)
  const subscriptionsRef = useRef<(() => void)[]>([])
  const entry$ = useRef(
    createObservable<InputT, true>({
      emitWhenValuesAreEqual: true,
      initialValue: inputs,
    }),
  ).current

  const handleSubscription = useCallback((unsubscribe: () => void) => {
    subscriptionsRef.current.push(unsubscribe)
  }, [])

  // Get store proxy - this will throw if no provider is available
  const observableStoreProxy = useStoreProxy(handleSubscription)

  if (!ref.current) {
    ref.current = initialise({
      $: entry$ as Observable<InputT>,
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

    const sub = ref.current.subscribeWithValue(
      (newData: Readonly<NullableInferredReturnT>) => {
        setData(newData)
      },
      (error) => {
        console.error('Error in useEffectStream', error)
      },
      (stack) => {
        console.log('Stream halted', stack)
      },
    )

    return () => {
      sub?.()
      subscriptionsRef.current.forEach((unsub) => unsub())
      subscriptionsRef.current.length = 0
    }
  }, [])

  const execute = useCallback(() => {
    console.log('execute - react-observable', ref.current)
    ref.current?.emit()
  }, [])

  return useMemo(() => [data, execute], [data, execute])
}
