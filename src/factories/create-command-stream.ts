import { createObservable } from './observable'
import {
  InferNullable,
  Observable,
  ObservableStackItem,
} from '../types/observable'
import { Store } from '../types/store'
import { store$ } from '../store/create-store'
import { Safe } from '../types/access'
import { getIsAppropriateStream } from '../utils/stream'
import { uuid } from '../utils/general'

interface Props<ReturnT> {
  onError?: (err: Error, stack?: ObservableStackItem[]) => void
  initialValue?: ReturnT
  result$?: Observable<ReturnT>
}

type ExecuteReturnType<NullableInferredT> =
  | [NullableInferredT, undefined]
  | [undefined, Error]

export const createCommandStream = <
  ReturnT,
  InputT = undefined,
  IsNullable extends boolean = true,
>(
  initialise: ({
    $,
    store,
  }: {
    $: Observable<InputT>
    store: Store
  }) => Observable<InferNullable<ReturnT, IsNullable>>,
  {
    onError,
    initialValue,
    result$,
  }: Props<InferNullable<ReturnT, IsNullable>> = {},
): {
  (
    payload?: InputT,
  ): Promise<ExecuteReturnType<InferNullable<ReturnT, IsNullable>>>
  exit$: Observable<InferNullable<ReturnT, IsNullable>>
} => {
  type NullableInferredReturnT = InferNullable<ReturnT, IsNullable>
  const entry$ = createObservable<InputT>({ initialValue: undefined })
  const exit$ = createObservable<ReturnT, IsNullable>(
    initialValue ? { initialValue } : undefined,
  )
  const isInitialised = createObservable<boolean>({ initialValue: false })

  if (result$) {
    // we don't really need to pass the error on to the result
    exit$.subscribe((val) => result$.set(val as NullableInferredReturnT))
  }

  const initialiseStream = (store: Safe<Store>) => {
    const stream$: Observable<NullableInferredReturnT> = initialise({
      $: entry$ as Observable<InputT>,
      store: store as Store,
    })
    isInitialised.set(true)
    stream$.subscribe(exit$.set, exit$.emitError, exit$.emitComplete)
  }

  const execute = (
    payload?: InputT,
  ): Promise<ExecuteReturnType<NullableInferredReturnT>> =>
    new Promise((resolve) => {
      const run = () => {
        const executionId = uuid()
        const entryEmitCount = entry$.getEmitCount()

        const unsubscribe = exit$.subscribe(
          (data, stack) => {
            const isAppropriateStream = stack
              ? getIsAppropriateStream(stack, executionId, entryEmitCount)
              : false
            if (isAppropriateStream) {
              resolve([data as NullableInferredReturnT, undefined])
              unsubscribe()
            }
          },

          (error, stack) => {
            const isAppropriateStream = stack
              ? getIsAppropriateStream(stack, executionId, entryEmitCount)
              : false
            if (isAppropriateStream) {
              onError && onError(error, stack)
              resolve([undefined, error])
              unsubscribe()
            }
          },

          (stack) => {
            const isAppropriateStream = stack
              ? getIsAppropriateStream(stack, executionId, entryEmitCount)
              : false
            if (isAppropriateStream) {
              resolve([exit$.get() as NullableInferredReturnT, undefined])
              unsubscribe()
            }
          },
        )

        entry$.set(payload, [
          {
            id: executionId,
            name: `createStream:${executionId}`,
            emitCount: entryEmitCount,
            isError: false,
          },
        ])
      }

      if (!isInitialised.get()) {
        if (!!store$.get()) {
          initialiseStream(store$.get())
        } else {
          store$.subscribeOnce((store: Safe<Store>) => {
            initialiseStream(store)
          })
        }
      }

      run()
    })
  execute.exit$ = exit$
  return execute
}
