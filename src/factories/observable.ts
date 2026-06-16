import { isFunction, isObject } from '../utils/general'
import { tryCatch, tryCatchSync, uuid } from '../utils/general'
import { createStreamName } from '../utils/stream'
import {
  CreateObservableParams,
  ListenerRecord,
  ObservableSetter,
  StreamOption,
  SubscribeFunction,
  Observable,
  MapEntriesReturn,
  StreamProjection,
  EmitOperator,
  ObservableGetter,
  EmitErrorOperator,
  UnsubscribeFunction,
  TapOperator,
  MapEntriesOperator,
  GetInitialValueOperator,
  ObservableStackItem,
  EmitStreamHaltedOperator,
  InferNullable,
  CatchErrorOperator,
  StreamHaltEvent,
  StreamHaltReason,
  CancelStreamOperator,
} from '../types/observable'
import { Readonly } from '../types/access'

export const createObservable = <
  T extends unknown,
  IsNullable extends boolean = true,
>(
  params?: CreateObservableParams<InferNullable<T, IsNullable>>,
): Observable<InferNullable<T, IsNullable>> => {
  type NullableInferredT = InferNullable<T, IsNullable>

  const initialValue = params?.initialValue
  const equalityFn = params?.equalityFn
  const name = params?.name
  const isFlushable = params?.isFlushable ?? true
  const emitWhenValuesAreEqual = params?.emitWhenValuesAreEqual ?? false

  const id = uuid()

  let _emitCount = 0
  let _observableName: string = name ?? id
  let _listenerRecords: ListenerRecord<NullableInferredT>[] = []
  let isStreamCancelled = false

  const manualHaltEvent: StreamHaltEvent = {
    reason: StreamHaltReason.Manual,
    isTerminal: false,
  }

  const cancelledHaltEvent: StreamHaltEvent = {
    reason: StreamHaltReason.Cancelled,
    isTerminal: true,
  }

  const createStack = (
    stack?: ObservableStackItem[],
    errorMessage?: string,
    error?: Error,
  ): ObservableStackItem[] => {
    const lastStackItem = stack?.[stack.length - 1]
    const splitName = name?.split('_')
    const isCatchObservable = splitName?.[splitName.length - 1] === 'catchError'
    // this is a bit of a hack to ensure the stack takes account
    // of errors that are restored by the catchError operator
    // TODO - need to find a better way to handle this
    const addErrorToStream = errorMessage
      ? true
      : ((lastStackItem?.isError && !isCatchObservable) ?? false)
    return [
      ...(stack ?? []),
      {
        id,
        name: _observableName,
        emitCount: _emitCount++,
        isError: addErrorToStream,
        errorMessage,
        error,
      },
    ]
  }

  const getInitialValue: GetInitialValueOperator<
    NullableInferredT
  > = (): NullableInferredT =>
    isFunction(initialValue)
      ? initialValue()
      : (initialValue as NullableInferredT)

  const getEmitCount = (): number => _emitCount
  const getIsStreamCancelled = (): boolean => isStreamCancelled

  let value: NullableInferredT = getInitialValue()

  const get: ObservableGetter<
    NullableInferredT
  > = (): Readonly<NullableInferredT> => value as Readonly<NullableInferredT>

  const emit: EmitOperator = (stack) => {
    if (isStreamCancelled) {
      return
    }
    const newStack = createStack(stack)
    const unsubscribeIds = _listenerRecords.reduce<string[]>(
      (acc, { listener, once, id }) => {
        listener?.(value as Readonly<NullableInferredT>, newStack)
        return once ? [...acc, id] : acc
      },
      [] as string[],
    )
    unsubscribeIds.forEach((id) => unsubscribe(id))
  }

  const emitError: EmitErrorOperator = (err: Error, stack) => {
    if (isStreamCancelled) {
      return
    }
    const newStack = createStack(
      stack,
      err.message ?? err.name ?? err.toString(),
      err,
    )
    _listenerRecords.forEach(({ onError }) => onError?.(err, newStack))
  }

  /**
   * emitStreamHalted notifies subscribers that an emission halted. Terminal
   * halt events, such as cancellation, permanently stop future emissions.
   */
  const emitStreamHalted: EmitStreamHaltedOperator = (
    stack,
    event = manualHaltEvent,
  ) => {
    if (isStreamCancelled) {
      return
    }
    if (event.isTerminal) {
      isStreamCancelled = true
    }
    const newStack = createStack(stack)
    _listenerRecords.forEach(({ onStreamHalted }) =>
      onStreamHalted?.(newStack, event),
    )
  }

  const cancelStream: CancelStreamOperator = (stack) => {
    emitStreamHalted(stack, cancelledHaltEvent)
  }

  const _setInternal =
    (isSilent: boolean): ObservableSetter<NullableInferredT> =>
    (newValue, stack) => {
      if (isStreamCancelled) {
        return false
      }
      const reducedValue: NullableInferredT = (
        isFunction(newValue) ? newValue(get()) : newValue
      ) as NullableInferredT

      if (
        (equalityFn &&
          equalityFn(
            value as Readonly<NullableInferredT>,
            reducedValue as Readonly<NullableInferredT>,
          )) ||
        (!emitWhenValuesAreEqual && value === reducedValue)
      ) {
        if (!isSilent) {
          // if silent then we can assume the user knows
          // what they want to (or not to) emit
          emitStreamHalted(stack, {
            reason: StreamHaltReason.Unchanged,
            isTerminal: false,
          })
        }
        return false
      }

      value = reducedValue
      if (!isSilent) {
        emit(stack)
      }
      return true
    }

  const set: ObservableSetter<NullableInferredT> = _setInternal(false)
  const setSilent: ObservableSetter<NullableInferredT> = _setInternal(true)

  const subscribe: SubscribeFunction<NullableInferredT> = (
    listener,
    onError,
    onStreamHalted,
  ) => {
    const id = uuid() as string
    _listenerRecords.push({
      listener,
      onError,
      id,
      once: false,
      onStreamHalted,
    })
    return () => unsubscribe(id)
  }

  const subscribeOnce: SubscribeFunction<NullableInferredT> = (
    listener,
    onError,
    onStreamHalted,
  ) => {
    const id = uuid() as string
    _listenerRecords.push({ listener, onError, id, once: true, onStreamHalted })
    return () => unsubscribe(id)
  }

  const subscribeWithValue: SubscribeFunction<NullableInferredT> = (
    listener,
    onError,
    onStreamHalted,
  ) => {
    const unsubscribe = subscribe(listener, onError, onStreamHalted)
    if (listener && !isStreamCancelled) {
      listener(value as Readonly<NullableInferredT>)
    }
    return unsubscribe
  }

  const unsubscribe: UnsubscribeFunction = (id: string) => {
    _listenerRecords = _listenerRecords.filter((lr) => lr.id !== id)
  }

  const forwardStreamHalt =
    <TargetT>(target: Observable<TargetT>): EmitStreamHaltedOperator =>
    (stack, event) => {
      if (event?.reason === StreamHaltReason.Cancelled) {
        target.cancelStream(stack)
        return
      }
      target.emitStreamHalted(stack, event)
    }

  const combineLatestFrom = <U extends unknown[]>(
    ...observables: { [K in keyof U]: Observable<U[K]> }
  ) => {
    type CombinedValues = [NullableInferredT, ...U]

    const { initialValues, subscribeFunctions } = observables.reduce<{
      initialValues: CombinedValues
      subscribeFunctions: any[]
    }>(
      (acc, obs) => {
        acc.initialValues.push(obs.get())
        acc.subscribeFunctions.push(obs.subscribe)
        return acc
      },
      {
        initialValues: [get()] as any,
        subscribeFunctions: [subscribe],
      },
    )

    const combinationObservable$ = createObservable<CombinedValues, false>({
      initialValue: initialValues,
      emitWhenValuesAreEqual,
      name: `${name}_combineLatestFrom:${observables.map((obs) => obs.getName()).join(',')}:${name}`,
    })

    subscribeFunctions.forEach((sub, i) => {
      sub(
        (val: U[keyof U], stack?: ObservableStackItem[]) => {
          if (combinationObservable$.getIsStreamCancelled()) {
            return
          }
          combinationObservable$.set((values) => {
            const clone = [...values]
            clone[i] = val as CombinedValues[number]
            return clone as CombinedValues
          }, stack)
        },
        (err: Error) => combinationObservable$.emitError(err),
        forwardStreamHalt(combinationObservable$),
      )
    })

    return combinationObservable$
  }

  const withLatestFrom = <OtherT extends unknown[]>(
    ...observables: [...{ [K in keyof OtherT]: Observable<OtherT[K]> }]
  ) => {
    type CombinedValues = [
      NullableInferredT,
      ...{ [K in keyof OtherT]: OtherT[K] },
    ]

    const resultObservable$ = createObservable<CombinedValues, false>({
      initialValue: [
        get(),
        ...observables.map((obs) => obs.get()),
      ] as CombinedValues,
      emitWhenValuesAreEqual,
      name: `${name}_withLatestFrom:${observables.map((obs) => obs.getName()).join(',')}:${name}`,
    })

    subscribe(
      (
        sourceValue: Readonly<NullableInferredT>,
        stack?: ObservableStackItem[],
      ) => {
        if (resultObservable$.getIsStreamCancelled()) {
          return
        }
        const combined = [
          sourceValue,
          ...observables.map((obs) => obs.get()),
        ] as CombinedValues
        resultObservable$.set(combined, stack)
      },
      resultObservable$.emitError,
      forwardStreamHalt(resultObservable$),
    )
    return resultObservable$
  }

  const stream: StreamProjection<NullableInferredT, false> = <
    NewT = unknown,
    ProjectionIsNullable extends boolean = true,
  >(
    project: (
      data: Readonly<NullableInferredT>,
    ) => InferNullable<NewT, ProjectionIsNullable>,
    {
      initialValue,
      streamedName,
      executeOnCreation = true,
    } = {} as StreamOption<InferNullable<NewT, ProjectionIsNullable>>,
  ) => {
    type NullableInferredNewT = InferNullable<NewT, ProjectionIsNullable>
    const name = streamedName ?? createStreamName(getName())
    const newObservable$ = createObservable<NullableInferredNewT, false>({
      initialValue: (initialValue ?? undefined) as NullableInferredNewT,
      name,
      emitWhenValuesAreEqual,
    })

    ;(executeOnCreation ? subscribeWithValue : subscribe)(
      (data: Readonly<NullableInferredT>, stack?: ObservableStackItem[]) => {
        if (newObservable$.getIsStreamCancelled()) {
          return
        }
        const [newData, projectError] = tryCatchSync<NullableInferredNewT>(
          () => project(data),
          `Stream Error: Attempt to project stream to "${name}" from "${getName()}" has failed.`,
        )
        if (projectError) {
          newObservable$.emitError(projectError as Error, stack)
        } else {
          newObservable$.set(newData as NullableInferredNewT, stack)
        }
      },
      newObservable$.emitError,
      forwardStreamHalt(newObservable$),
    )

    return newObservable$
  }

  const streamAsync: StreamProjection<NullableInferredT, true> = <
    NewT,
    ProjectionIsNullable extends boolean = true,
  >(
    project: (
      data: Readonly<NullableInferredT>,
    ) => Promise<InferNullable<NewT, ProjectionIsNullable>>,
    {
      initialValue,
      streamedName,
      executeOnCreation = false,
    }: StreamOption<InferNullable<NewT, ProjectionIsNullable>> = {},
  ) => {
    type NullableInferredNewT = InferNullable<NewT, ProjectionIsNullable>
    const name = streamedName ?? createStreamName(getName())

    const newObservable$ = createObservable<NullableInferredNewT, false>({
      initialValue: (initialValue ?? undefined) as NullableInferredNewT,
      name,
      emitWhenValuesAreEqual,
    })

    type AsyncQueueItem = {
      data: Readonly<NullableInferredT>
      stack?: ObservableStackItem[]
      sequence: number
    }

    let nextSequence = 0
    let isProcessingQueue = false
    const queue: AsyncQueueItem[] = []

    const processQueue = async () => {
      if (isProcessingQueue || newObservable$.getIsStreamCancelled()) {
        return
      }

      const nextItem = queue.shift()
      if (!nextItem) {
        return
      }

      isProcessingQueue = true
      const [newData, error] = await tryCatch<NullableInferredNewT>(
        () => project(nextItem.data),
        `Stream Error: Attempt to project stream to "${name}" from "${getName()}" has failed.`,
      )

      isProcessingQueue = false

      if (newObservable$.getIsStreamCancelled()) {
        queue.length = 0
        return
      }

      if (error) {
        newObservable$.emitError(error, nextItem.stack)
      } else {
        newObservable$.set(newData as NullableInferredNewT, nextItem.stack)
      }

      processQueue()
    }

    const projectToNewObservable = (
      data: Readonly<NullableInferredT>,
      stack?: ObservableStackItem[],
    ) => {
      if (newObservable$.getIsStreamCancelled()) {
        return
      }
      queue.push({ data, stack, sequence: nextSequence++ })
      processQueue()
    }

    ;(executeOnCreation ? subscribeWithValue : subscribe)(
      projectToNewObservable,
      newObservable$.emitError,
      (stack, event) => {
        if (event?.reason === StreamHaltReason.Cancelled) {
          queue.length = 0
        }
        forwardStreamHalt(newObservable$)(stack, event)
      },
    )

    return newObservable$
  }

  const tap: TapOperator<NullableInferredT> = (
    callback: (currentValue: Readonly<NullableInferredT>) => void,
  ) => {
    const newObservable$ = createObservable<NullableInferredT, false>({
      initialValue: get() as NullableInferredT,
      name: `${name}_tap`,
      emitWhenValuesAreEqual,
    })

    subscribe(
      (val, stack) => {
        if (newObservable$.getIsStreamCancelled()) {
          return
        }
        callback(val)
        newObservable$.setSilent(val, stack)
        // here we force the emit regardless of the emitWhenValuesAreEqual flag
        // but pass the origional flag downstream
        newObservable$.emit(stack)
      },
      newObservable$.emitError,
      forwardStreamHalt(newObservable$),
    )

    return newObservable$
  }

  const delay = (milliseconds: number): Observable<NullableInferredT> => {
    // False is used here because the type is already inferred
    // and adding true would cause the type to be inferred as NullableInferredT | undefined
    const newObservable$ = createObservable<NullableInferredT, false>({
      initialValue: get() as NullableInferredT,
      name: `${name}_after-delay-${milliseconds}`,
      emitWhenValuesAreEqual,
    })

    type DelayQueueItem = {
      value: Readonly<NullableInferredT>
      stack?: ObservableStackItem[]
    }

    let isProcessingDelayQueue = false
    const queue: DelayQueueItem[] = []

    const processQueue = async () => {
      if (isProcessingDelayQueue || newObservable$.getIsStreamCancelled()) {
        return
      }

      const nextItem = queue.shift()
      if (!nextItem) {
        return
      }

      isProcessingDelayQueue = true
      await new Promise((r) => setTimeout(r, milliseconds))
      isProcessingDelayQueue = false

      if (newObservable$.getIsStreamCancelled()) {
        queue.length = 0
        return
      }

      newObservable$.set(nextItem.value as NullableInferredT, nextItem.stack)
      processQueue()
    }

    subscribe(
      (val, stack) => {
        if (newObservable$.getIsStreamCancelled()) {
          return
        }
        queue.push({ value: val, stack })
        processQueue()
      },
      newObservable$.emitError,
      (stack, event) => {
        if (event?.reason === StreamHaltReason.Cancelled) {
          queue.length = 0
        }
        forwardStreamHalt(newObservable$)(stack, event)
      },
    )

    return newObservable$
  }

  const throttle = (
    milliseconds: number,
  ): Observable<NullableInferredT> => {
    const newObservable$ = createObservable<NullableInferredT, false>({
      initialValue: get() as NullableInferredT,
      name: `${name}_throttle_${milliseconds}`,
      emitWhenValuesAreEqual,
    })

    let lastEmittedAt = 0

    const shouldEmit = (now: number) =>
      lastEmittedAt === 0 || now - lastEmittedAt >= milliseconds

    subscribeWithValue(
      (val, stack) => {
        if (newObservable$.getIsStreamCancelled()) {
          return
        }
        const now = Date.now()
        if (shouldEmit(now)) {
          lastEmittedAt = now
          newObservable$.set(val as NullableInferredT, stack)
        }
      },
      newObservable$.emitError,
      forwardStreamHalt(newObservable$),
    )

    return newObservable$
  }

  const mapEntries: MapEntriesOperator<NullableInferredT> = <
    P extends string = '$',
  >({
    keys,
    observablePostfix = '$' as P,
  }: {
    keys?: (keyof NullableInferredT)[]
    observablePostfix?: P
  } = {}) => {
    const currentValue = get()
    if (!isObject(currentValue)) {
      throw new Error(
        `mapEntries can only be used on object observables: ${getName()} is a ${typeof currentValue}`,
      )
    }

    const entries = Object.entries(currentValue as object)
    const filteredEntries = keys
      ? entries.filter(([key]) => keys.includes(key as keyof NullableInferredT))
      : entries

    return filteredEntries.reduce(
      (acc, [key, value]) => {
        const name = `${key}${observablePostfix}`
        return {
          ...acc,
          [name]: stream((val) => val[key as keyof NullableInferredT], {
            streamedName: name,
          }),
        }
      },
      {} as MapEntriesReturn<NullableInferredT, P>,
    )
  }

  /**
   * catchError allows you to intercept errors in the observable stream.
   *
   * - The user-provided onError handler can choose to:
   *   - Throw a new error (for better debugging or to mark a problem section)
   *   - Forward the original error
   *   - Do nothing, in which case the stream will halt gracefully via emitStreamHalted
   * - If the user handler throws, that error is emitted downstream.
   *
   * This design allows liberal use of throws throughout the stream, and helps pinpoint problem sections by allowing custom errors to be thrown at any catchError boundary. If the handler does nothing, the stream halts (no longer emits a special error).
   */
  const catchError: CatchErrorOperator<NullableInferredT> = (onError) => {
    const newObservable$ = createObservable<NullableInferredT, false>({
      initialValue: get(),
      name: `${name}_catchError`,
      emitWhenValuesAreEqual,
    })

    const handleError = (error: Error, stack?: ObservableStackItem[]) => {
      if (newObservable$.getIsStreamCancelled()) {
        return
      }
      if (onError) {
        try {
          const errorResolution = onError(error, get())
          if (errorResolution) {
            newObservable$.set(errorResolution.restoreValue, stack)
          } else {
            newObservable$.emitStreamHalted(stack, {
              reason: StreamHaltReason.ErrorHandled,
              isTerminal: false,
            })
          }
        } catch (err) {
          newObservable$.emitError(err as Error, stack)
        }
      } else {
        newObservable$.emitStreamHalted(stack, {
          reason: StreamHaltReason.ErrorHandled,
          isTerminal: false,
        })
      }
    }

    subscribe(
      (val, stack) => {
        if (newObservable$.getIsStreamCancelled()) {
          return
        }
        newObservable$.set(val, stack)
      },
      handleError,
      forwardStreamHalt(newObservable$),
    )

    return newObservable$
  }

  /**
   * finally (name when exported) allows you to execute a callback for all subscription events:
   * - onValue: when a new value is emitted
   * - onError: when an error occurs
   * - onHalt: when an emission halts without cancelling the stream
   * - onCancel: when the stream is cancelled
   *
   * This is useful for cleanup operations, logging, or any side effects
   * that need to happen regardless of the subscription outcome.
   */
  const final = (
    callback: (
      type: 'onValue' | 'onError' | 'onHalt' | 'onCancel',
      value?: Readonly<NullableInferredT>,
      error?: Error,
      stack?: ObservableStackItem[],
      event?: StreamHaltEvent,
    ) => void,
  ) => {
    const newObservable$ = createObservable<NullableInferredT, false>({
      initialValue: get(),
      name: `${name}_finally`,
      emitWhenValuesAreEqual,
    })

    subscribe(
      (val, stack) => {
        if (newObservable$.getIsStreamCancelled()) {
          return
        }
        callback('onValue', val, undefined, stack)
        newObservable$.set(val, stack)
      },
      (error, stack) => {
        if (newObservable$.getIsStreamCancelled()) {
          return
        }
        callback('onError', undefined, error, stack)
        newObservable$.emitError(error, stack)
      },
      (stack, event) => {
        if (newObservable$.getIsStreamCancelled()) {
          return
        }
        const haltEvent = event ?? manualHaltEvent
        callback(
          haltEvent.reason === StreamHaltReason.Cancelled
            ? 'onCancel'
            : 'onHalt',
          undefined,
          undefined,
          stack,
          haltEvent,
        )
        if (haltEvent.reason === StreamHaltReason.Cancelled) {
          newObservable$.cancelStream(stack)
        } else {
          newObservable$.emitStreamHalted(stack, haltEvent)
        }
      },
    )

    return newObservable$
  }

  const guard = (
    predicate: (
      nextValue: Readonly<NullableInferredT>,
      previousValue: Readonly<NullableInferredT>,
    ) => boolean,
  ) => {
    // Create a new observable for the guarded stream
    // False is used here because the type is already inferred
    // and adding true would cause the type to be inferred as NullableInferredT | undefined
    const guardedObservable = createObservable<NullableInferredT, false>({
      initialValue: get(),
      emitWhenValuesAreEqual,
      name: `${name}_guard`,
    })

    // Subscribe to the original observable
    observable.subscribe(
      (nextValue, stack) => {
        if (guardedObservable.getIsStreamCancelled()) {
          return
        }
        const prevValue = guardedObservable.get()
        if (predicate(nextValue, prevValue)) {
          guardedObservable.set(nextValue, stack)
        } else {
          // The value is not passed through, but an error must be
          guardedObservable.emitStreamHalted(stack, {
            reason: StreamHaltReason.GuardRejected,
            isTerminal: false,
          })
        }
      },
      guardedObservable.emitError,
      forwardStreamHalt(guardedObservable),
    )

    return guardedObservable
  }

  const reset = () => set(getInitialValue() as NullableInferredT)

  const getName = () => _observableName

  const setName = (name: string) => {
    _observableName = name
  }

  const getId = (): string => id
  const getIsFlushable = (): boolean => isFlushable

  const observable: Observable<NullableInferredT> = {
    get,
    set,
    setSilent,
    getEmitCount,
    subscribe,
    subscribeOnce,
    subscribeWithValue,
    stream,
    streamAsync,
    // TODO- this is not currently type safe
    combineLatestFrom,
    withLatestFrom,
    tap,
    delay,
    throttle,
    catchError,
    reset,
    getName,
    setName,
    getId,
    emit,
    emitError,
    emitStreamHalted,
    cancelStream,
    mapEntries,
    getInitialValue,
    guard,
    finally: final,
    getIsFlushable,
    getIsStreamCancelled,
  }

  return observable
}
