import { Store } from '../types/store'
import { createObservable } from '../factories/observable'
import { Observable, ObservableStackItem } from '../types/observable'
import { store$ } from '../store/create-store'

export const createStreamName = (baseName: string): string => {
  const match = baseName.match(/_STREAM_(\d+)$/)
  const index = match ? parseInt(match[1], 10) + 1 : 1
  return `${baseName}_STREAM_${index}`
}

export const wrapObservable = <T extends unknown = unknown>(
  observable: Observable<T>,
  onSubscription: (unsubscribe: () => void) => void,
): Observable<T> => {
  const proxyObservable = createObservable({ initialValue: observable.get() })
  onSubscription(
    observable.subscribe((payload) => proxyObservable.set(payload)),
  )
  return proxyObservable as Observable<T>
}

export const getIsAppropriateStream = (
  stack: ObservableStackItem[],
  id: string,
  emitCount: number,
): boolean =>
  stack?.some((item) => item.id === id && item.emitCount === emitCount)
