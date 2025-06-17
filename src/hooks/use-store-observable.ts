import { useRef, useContext } from 'react'
import { Observable } from '../types/observable'
import { Store } from '../types/store'
import { ReactObservableContext } from '../store/context'

export function useStoreObservable<ReturnT = any>(
  initialise: ({ store }: { store: Store }) => Observable<ReturnT>,
): Observable<ReturnT> {
  const store = useContext(ReactObservableContext)
  const ref = useRef<Observable<ReturnT> | undefined>(undefined)

  if (!ref.current) {
    if (!store) {
      throw new Error(
        'useStoreObservable must be used within a ReactObservableProvider',
      )
    }
    ref.current = initialise({ store })
  }

  return ref.current
}
