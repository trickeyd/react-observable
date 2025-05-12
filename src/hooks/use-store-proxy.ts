import { useRef, useContext } from 'react'
import { Store } from '../types/store'
import { ReactObservableContext } from '../store/context'
import { wrapObservable } from '../utils/stream'
import { SafeMutable } from '../types/access'

export const useStoreProxy = (onSubscription: (unsubscribe: () => void) => void) => {
  const observableStore = useContext(ReactObservableContext)

  const observableStoreProxy = useRef(
    Object.entries(observableStore as SafeMutable<Store>).reduce(
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