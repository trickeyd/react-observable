import { useRef, useContext } from 'react'
import { Store } from '../types/store'
import { ReactObservableContext } from '../store/context'
import { wrapObservable } from '../utils/stream'
import { Safe } from '../types/access'

export const useStoreProxy = (
  onSubscription: (unsubscribe: () => void) => void,
) => {
  const observableStore = useContext(ReactObservableContext)
  if (!observableStore) {
    throw new Error(
      'useStoreProxy must be used within a ReactObservableProvider',
    )
  }

  const observableStoreProxy = useRef(
    Object.entries(observableStore as Safe<Store>).reduce(
      (acc, [segmentName, segment]) => ({
        ...acc,
        [segmentName]: new Proxy(segment, {
          get(target, prop) {
            if (prop in target) {
              return wrapObservable((target as any)[prop], onSubscription)
            }
            return undefined
          },
        }),
      }),
      {},
    ),
  ).current

  return observableStoreProxy as Store
}
