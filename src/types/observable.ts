import { Readonly } from './access'

export interface ObservableStackItem {
  id: string
  name: string
  emitCount: number
  isError: boolean
}

/** @internal */
export type ObservableGetter<T> = () => Readonly<T>

/** @internal */
export type ObservableSetter<T> = (
  newValue: T | Readonly<T> | ((currentValue: Readonly<T>) => T | Readonly<T>),
  stack?: ObservableStackItem[],
) => void

/** @internal */
export type SubscribeFunction<T> = (
  listener?: (value: Readonly<T>, stack?: ObservableStackItem[]) => void,
  onError?: (error: Error, stack?: ObservableStackItem[]) => void,
  onComplete?: (stack?: ObservableStackItem[]) => void,
) => () => void

/** @internal */
export interface StreamOption<T = unknown> {
  initialValue?: T
  streamedName?: string
  executeOnCreation?: boolean
}

export type StreamProjection<T, IsAsync extends boolean = false> = <
  NewT = unknown,
>(
  project: (data: T) => IsAsync extends true ? Promise<NewT> : NewT,
  options?: StreamOption<NewT>,
) => Observable<NewT>

/** @internal */
export type TapOperator<T> = (
  callback: (currentValue: Readonly<T>) => void,
) => Observable<T>

/** @internal */
export type DelayOperator<T> = (milliseconds: number) => Observable<T>

/** @internal */
export type CatchErrorOperator<T> = (
  onError?: (
    error: Error,
    currentValue: Readonly<T>,
    setter: ObservableSetter<T>,
  ) => void,
) => Observable<T>

/** @internal */
export type ResetOperator = () => void

/** @internal */
export type EmitOperator = (stack?: ObservableStackItem[]) => void

/** @internal */
export type EmitErrorOperator = (
  error: Error,
  stack?: ObservableStackItem[],
) => void

/** @internal */
export type EmitCompleteOperator = (stack?: ObservableStackItem[]) => void

/** @internal */
export type UnsubscribeFunction = (id: string) => void

/** @internal */
export type MapEntriesReturn<T, P extends string = '$'> = {
  [K in keyof T as `${string & K}${P}`]: Observable<T[K]>
}

/** @internal */
export type MapEntriesOperator<T> = <P extends string = '$'>({
  keys,
  observablePostfix,
}: {
  keys?: (keyof T)[]
  observablePostfix?: P
}) => MapEntriesReturn<T, P>

/** @internal */
export type GetInitialValueOperator<T> = () => T

export interface Observable<T> {
  get: ObservableGetter<T>
  set: ObservableSetter<T>
  setSilent: ObservableSetter<T>
  getEmitCount: () => number
  subscribe: SubscribeFunction<T>
  subscribeOnce: SubscribeFunction<T>
  subscribeWithValue: SubscribeFunction<T>
  stream: StreamProjection<T, false>
  streamAsync: StreamProjection<T, true>
  combineLatestFrom: <U extends unknown[]>(
    ...observables: { [K in keyof U]: Observable<U[K]> }
  ) => Observable<[T, ...{ [K in keyof U]: U[K] }]>
  withLatestFrom: <OtherT extends unknown[]>(
    ...observables: [...{ [K in keyof OtherT]: Observable<OtherT[K]> }]
  ) => Observable<[T, ...{ [K in keyof OtherT]: OtherT[K] }]>
  tap: TapOperator<T>
  delay: DelayOperator<T>
  catchError: CatchErrorOperator<T>
  reset: ResetOperator
  getName: () => string
  setName: (name: string) => void
  getId: () => string
  emit: EmitOperator
  emitError: EmitErrorOperator
  emitComplete: EmitCompleteOperator
  mapEntries: MapEntriesOperator<T>
  getInitialValue: GetInitialValueOperator<T>
  guard: (
    predicate: (previousValue: Readonly<T>, nextValue: Readonly<T>) => boolean,
  ) => Observable<T>
}

export interface CreateObservableParams<T> {
  initialValue?: T | (() => T)
  equalityFn?: (a: Readonly<T>, b: Readonly<T>) => boolean
  name?: string
}

/** @internal */
export interface ListenerRecord<T> {
  listener?: (value: Readonly<T>, stack?: ObservableStackItem[]) => void
  onError?: (error: Error, stack?: ObservableStackItem[]) => void
  onComplete?: (stack?: ObservableStackItem[]) => void
  id: string
  once?: boolean
}

export interface PersistentObservable<T> extends Observable<T> {
  rehydrate: () => Promise<void>
}
