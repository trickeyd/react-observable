import { createObservable } from './observable'
import { Observable } from '../types/observable'
import { Store } from '../types/store'
import { store$ } from '../store/create-store'
import { Safe } from '../types/access'

interface Props<ReturnT> {
  onError?: (err: Error) => void
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

    stream$.subscribe((val) => exit$.set(val as ReturnT), exit$.emitError)
  }

  const execute = (payload?: InputT): Promise<ExecuteReturnType<ReturnT>> =>
    new Promise((resolve) => {
      const run = () => {
        console.log('run')
        exit$.subscribe(
          (data) => {
            resolve([data as ReturnT, undefined])
          },

          (error) => {
            onError && onError(error)
            resolve([undefined, error])
          },

          () => {
            resolve([undefined, undefined])
          },
        )
        if (payload) {
          entry$.setSilent(payload)
        }
        entry$.emit()
      }

      if (isInitialised.get()) {
        console.log('execute 1')
        run()
      } else {
        if (!!store$.get()) {
          console.log('execute 2')
          initialiseStream(store$.get())
          run()
        } else {
          store$.subscribeOnce((store: Safe<Store>) => {
            console.log('execute 3')
            initialiseStream(store)
            run()
          })
        }
      }
    })
  execute.exit$ = exit$
  return execute
}
