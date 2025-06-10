import { createObservable } from './observable'
import { Observable, ObservableStackItem } from '../types/observable'
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

type ExecuteReturnType<T> =
  | [T, undefined]
  | [undefined, Error]
  | [undefined, undefined]

export const createStream = <ReturnT, InputT = undefined>(
  initialise: ({
    $,
    store,
  }: {
    $: Observable<InputT>
    store: Store
  }) => Observable<ReturnT>,
  { onError, initialValue, result$ }: Props<ReturnT> = {},
): {
  (payload?: InputT): Promise<ExecuteReturnType<ReturnT>>
  exit$: Observable<ReturnT>
} => {
  const entry$ = createObservable<InputT>({ initialValue: undefined })
  const exit$ = createObservable<ReturnT>({ initialValue })
  const isInitialised = createObservable<boolean>({ initialValue: false })

  if (result$) {
    // we don't really need to pass the error on to the result
    exit$.subscribe((val) => result$.set(val as ReturnT))
  }

  const initialiseStream = (store: Safe<Store>) => {
    const stream$: Observable<ReturnT> = initialise({
      $: entry$ as Observable<InputT>,
      store: store as Store,
    })
    isInitialised.set(true)
    stream$.subscribe((val) => exit$.set(val as ReturnT), exit$.emitError)
  }

  const execute = (payload?: InputT): Promise<ExecuteReturnType<ReturnT>> =>
    new Promise((resolve) => {
      const run = () => {
        const executionId = uuid()
        const entryEmitCount = entry$.getEmitCount()
        const unsubscribe = exit$.subscribe(
          (data, stack) => {
            const isAppropriateStream = stack
              ? getIsAppropriateStream(stack, executionId, entryEmitCount)
              : false
            console.log('isAppropriateStream', isAppropriateStream, stack)
            if (isAppropriateStream) {
              resolve([data as ReturnT, undefined])
              unsubscribe()
            }
          },

          (error, stack) => {
            const isAppropriateStream = stack
              ? getIsAppropriateStream(stack, executionId, entryEmitCount)
              : false
            console.log('isAppropriateStream error', isAppropriateStream, stack)
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
            console.log(
              'isAppropriateStream complete',
              isAppropriateStream,
              stack,
            )
            if (isAppropriateStream) {
              resolve([undefined, undefined])
              unsubscribe()
            }
          },
        )
        if (payload) {
          entry$.setSilent(payload)
        }
        entry$.emit([
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
          console.log('execute 2')
          initialiseStream(store$.get())
        } else {
          console.log('execute 2.5')
          store$.subscribeOnce((store: Safe<Store>) => {
            console.log('execute 3')
            initialiseStream(store)
          })
        }
      }

      run()
    })
  execute.exit$ = exit$
  return execute
}
