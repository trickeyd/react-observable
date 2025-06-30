import { Readonly } from './access'

// Helper type for nullable types
export type InferNullable<
  T,
  IsNullable extends boolean = true,
> = IsNullable extends true ? T | undefined : T

export interface ObservableStackItem {
  id: string
  name: string
  emitCount: number
  isError: boolean
}

/** @internal */
export type ObservableGetter<NullableInferredT> =
  () => Readonly<NullableInferredT>

/** @internal */
export type ObservableSetter<NullableInferredT> = (
  newValue:
    | NullableInferredT
    | Readonly<NullableInferredT>
    | ((
        currentValue: Readonly<NullableInferredT>,
      ) => NullableInferredT | Readonly<NullableInferredT>),
  stack?: ObservableStackItem[],
) => boolean

/** @internal */
export type SubscribeFunction<NullableInferredT> = (
  onEmit?: (
    value: Readonly<NullableInferredT>,
    stack?: ObservableStackItem[],
  ) => void,
  onError?: (error: Error, stack?: ObservableStackItem[]) => void,
  onStreamHalted?: (stack?: ObservableStackItem[]) => void,
) => () => void

/** @internal */
export interface StreamOption<NullableInferredT = unknown> {
  initialValue?: NullableInferredT
  streamedName?: string
  executeOnCreation?: boolean
}

export type StreamProjection<
  NullableInferredT,
  IsAsync extends boolean = false,
> = <NewT = unknown, ProjectionIsNullable extends boolean = true>(
  project: (
    data: NullableInferredT,
  ) => IsAsync extends true
    ? Promise<InferNullable<NewT, ProjectionIsNullable>>
    : InferNullable<NewT, ProjectionIsNullable>,
  options?: StreamOption<InferNullable<NewT, ProjectionIsNullable>>,
) => Observable<InferNullable<NewT, ProjectionIsNullable>>

/** @internal */
export type TapOperator<NullableInferredT> = (
  callback: (currentValue: Readonly<NullableInferredT>) => void,
) => Observable<NullableInferredT>

/** @internal */
export type DelayOperator<NullableInferredT> = (
  milliseconds: number,
) => Observable<NullableInferredT>

/** @internal */
export type CatchErrorOperator<NullableInferredT> = (
  onError?: (
    error: Error,
    previousValue: Readonly<NullableInferredT>,
  ) => ErrorResolution<NullableInferredT> | void,
) => Observable<NullableInferredT>

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
export type EmitStreamHaltedOperator = (stack?: ObservableStackItem[]) => void

/** @internal */
export type UnsubscribeFunction = (id: string) => void

/** @internal */
export type MapEntriesReturn<NullableInferredT, P extends string = '$'> = {
  [K in keyof NullableInferredT as `${string & K}${P}`]: Observable<
    NullableInferredT[K]
  >
}

/** @internal */
export type MapEntriesOperator<NullableInferredT> = <P extends string = '$'>({
  keys,
  observablePostfix,
}: {
  keys?: (keyof NullableInferredT)[]
  observablePostfix?: P
}) => MapEntriesReturn<NullableInferredT, P>

/** @internal */
export type GetInitialValueOperator<NullableInferredT> = () => NullableInferredT

export type ErrorResolution<NullableInferredT> = {
  restoreValue: NullableInferredT
}

export interface Observable<NullableInferredT> {
  get: ObservableGetter<NullableInferredT>
  set: ObservableSetter<NullableInferredT>
  setSilent: ObservableSetter<NullableInferredT>
  getEmitCount: () => number
  subscribe: SubscribeFunction<NullableInferredT>
  subscribeOnce: SubscribeFunction<NullableInferredT>
  subscribeWithValue: SubscribeFunction<NullableInferredT>
  stream: StreamProjection<NullableInferredT, false>
  streamAsync: StreamProjection<NullableInferredT, true>
  combineLatestFrom: <U extends unknown[]>(
    ...observables: { [K in keyof U]: Observable<U[K]> }
  ) => Observable<[NullableInferredT, ...{ [K in keyof U]: U[K] }]>
  withLatestFrom: <OtherT extends unknown[]>(
    ...observables: [...{ [K in keyof OtherT]: Observable<OtherT[K]> }]
  ) => Observable<[NullableInferredT, ...{ [K in keyof OtherT]: OtherT[K] }]>
  tap: TapOperator<NullableInferredT>
  delay: DelayOperator<NullableInferredT>
  catchError: CatchErrorOperator<NullableInferredT>
  reset: ResetOperator
  getName: () => string
  setName: (name: string) => void
  getId: () => string
  emit: EmitOperator
  emitError: EmitErrorOperator
  emitStreamHalted: EmitStreamHaltedOperator
  mapEntries: MapEntriesOperator<NullableInferredT>
  getInitialValue: GetInitialValueOperator<NullableInferredT>
  guard: (
    predicate: (
      nextValue: Readonly<NullableInferredT>,
      previousValue: Readonly<NullableInferredT>,
    ) => boolean,
  ) => Observable<NullableInferredT>
  finally: (
    callback: (
      type: 'onValue' | 'onError' | 'onComplete',
      value?: Readonly<NullableInferredT>,
      error?: Error,
      stack?: ObservableStackItem[],
    ) => void,
  ) => Observable<NullableInferredT>
}

export interface CreateObservableParams<NullableInferredT> {
  initialValue: NullableInferredT | (() => NullableInferredT)
  equalityFn?: (
    a: Readonly<NullableInferredT>,
    b: Readonly<NullableInferredT>,
  ) => boolean
  emitWhenValuesAreEqual?: boolean
  name?: string
}

/** @internal */
export interface ListenerRecord<NullableInferredT> {
  listener?: (
    value: Readonly<NullableInferredT>,
    stack?: ObservableStackItem[],
  ) => void
  onError?: (error: Error, stack?: ObservableStackItem[]) => void
  onStreamHalted?: (stack?: ObservableStackItem[]) => void
  id: string
  once?: boolean
}

export interface PersistentObservable<NullableInferredT>
  extends Observable<NullableInferredT> {
  rehydrate: () => Promise<void>
}
