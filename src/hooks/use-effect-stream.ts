import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { Observable } from '../types/observable'
import { useEqualityChecker } from './use-equality-checker'
import { Readonly } from '../types/access'
import { Store } from '../types/store'
import { createObservable } from '../factories/observable'
import { useStoreProxy } from './use-store-proxy'
import { InferNullable } from '../types/observable'
import { getCallsiteName, isDevEnv } from '../utils/general'

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
  const entry$ = useRef<Observable<InferNullable<InputT, true>>>(undefined)
  if (!entry$.current) {
    const name = getCallsiteName()
    entry$.current = createObservable<InputT | undefined, true>({
      name,
      emitWhenValuesAreEqual: true,
      initialValue: inputs,
    })
  }

  const handleSubscription = useCallback((unsubscribe: () => void) => {
    subscriptionsRef.current.push(unsubscribe)
  }, [])

  // Get store proxy - this will throw if no provider is available
  const observableStoreProxy = useStoreProxy(handleSubscription)

  if (!ref.current) {
    ref.current = initialise({
      $: entry$!.current as Observable<InputT>,
      store: observableStoreProxy,
    })
  }

  const isEqual = useEqualityChecker(inputs)
  if (!isEqual) {
    entry$.current!.set(inputs)
  }

  const [data, setData] = useState(ref.current.get)

  useEffect(() => {
    if (!ref.current) throw new Error('No observable found')
    const isDev = isDevEnv()
    const sub = ref.current.subscribeWithValue(
      (newData: Readonly<NullableInferredReturnT>) => {
        setData(newData)
      },
      (error) => {
        if (isDev) {
          console.error('Error in useEffectStream', error)
        }
      },
      (stack) => {
        if (isDev) {
          console.log('Stream halted', stack)
        }
      },
    )

    return () => {
      sub?.()
      subscriptionsRef.current.forEach((unsub) => unsub())
      subscriptionsRef.current.length = 0
    }
  }, [])

  const execute = useCallback(() => {
    entry$.current!.emit()
  }, [])

  return useMemo(() => [data, execute], [data, execute])
}
