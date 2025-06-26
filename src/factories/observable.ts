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
  const emitWhenValuesAreEqual = params?.emitWhenValuesAreEqual ?? false

  const id = uuid()

  let _emitCount = 0
  let _observableName: string = name ?? id
  let _listenerRecords: ListenerRecord<NullableInferredT>[] = []

  const createStack = (
    stack?: ObservableStackItem[],
    isError?: boolean,
  ): ObservableStackItem[] => [
    ...(stack ?? []),
    {
      id,
      name: _observableName,
      emitCount: _emitCount++,
      isError: isError ?? stack?.[stack.length - 1]?.isError ?? false,
    },
  ]

  const getInitialValue: GetInitialValueOperator<
    NullableInferredT
  > = (): NullableInferredT =>
    isFunction(initialValue)
      ? initialValue()
      : (initialValue as NullableInferredT)

  const getEmitCount = (): number => _emitCount

  let value: NullableInferredT = getInitialValue()

  const get: ObservableGetter<
    NullableInferredT
  > = (): Readonly<NullableInferredT> => value as Readonly<NullableInferredT>

  const emit: EmitOperator = (stack) => {
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
    const newStack = createStack(stack, true)
    _listenerRecords.forEach(({ onError }) => onError?.(err, newStack))
  }

  /**
   * emitStreamHalted notifies all subscribers that the stream has been halted.
   * After calling emitStreamHalted, no further values or errors will be emitted.
   * Subscribers can provide an onStreamHalted callback to react to stream halting.
   */
  const emitStreamHalted: EmitStreamHaltedOperator = (stack) => {
    const newStack = createStack(stack)
    _listenerRecords.forEach(({ onStreamHalted }) => onStreamHalted?.(newStack))
  }

  const _setInternal =
    (isSilent: boolean): ObservableSetter<NullableInferredT> =>
    (newValue, stack) => {
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
        emitStreamHalted(stack)
        return
      }

      value = reducedValue
      if (!isSilent) {
        emit(stack)
      }
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
    if (listener) {
      listener(value as Readonly<NullableInferredT>)
    }
    return unsubscribe
  }

  const unsubscribe: UnsubscribeFunction = (id: string) => {
    _listenerRecords = _listenerRecords.filter((lr) => lr.id !== id)
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
    })

    subscribeFunctions.forEach((sub, i) => {
      sub(
        (val: U[keyof U], stack?: ObservableStackItem[]) => {
          combinationObservable$.set((values) => {
            const clone = [...values]
            clone[i] = val as CombinedValues[number]
            return clone as CombinedValues
          }, stack)
        },
        (err: Error) => combinationObservable$.emitError(err),
        combinationObservable$.emitStreamHalted,
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
    })

    subscribe(
      (
        sourceValue: Readonly<NullableInferredT>,
        stack?: ObservableStackItem[],
      ) => {
        const combined = [
          sourceValue,
          ...observables.map((obs) => obs.get()),
        ] as CombinedValues
        resultObservable$.set(combined, stack)
      },
      resultObservable$.emitError,
      resultObservable$.emitStreamHalted,
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
      newObservable$.emitStreamHalted,
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

    const projectToNewObservable = async (
      data: Readonly<NullableInferredT>,
      stack?: ObservableStackItem[],
    ) => {
      const [newData, error] = await tryCatch<NullableInferredNewT>(
        () => project(data),
        `Stream Error: Attempt to project stream to "${name}" from "${getName()}" has failed.`,
      )
      if (error) {
        newObservable$.emitError(error, stack)
      } else {
        newObservable$.set(newData as NullableInferredNewT, stack)
      }
    }

    ;(executeOnCreation ? subscribeWithValue : subscribe)(
      projectToNewObservable,
      newObservable$.emitError,
      newObservable$.emitStreamHalted,
    )

    return newObservable$
  }

  const tap: TapOperator<NullableInferredT> = (
    callback: (currentValue: Readonly<NullableInferredT>) => void,
  ) => {
    callback(get() as Readonly<NullableInferredT>)
    return observable as Observable<NullableInferredT>
  }

  const delay = (milliseconds: number): Observable<NullableInferredT> => {
    // False is used here because the type is already inferred
    // and adding true would cause the type to be inferred as NullableInferredT | undefined
    const newObservable$ = createObservable<NullableInferredT, false>({
      initialValue: get() as NullableInferredT,
      name: `${name}_after-delay-${milliseconds}`,
      emitWhenValuesAreEqual,
    })

    subscribe(
      async (val, stack) => {
        await new Promise((r) => setTimeout(r, milliseconds))
        newObservable$.set(val as NullableInferredT, stack)
      },
      newObservable$.emitError,
      newObservable$.emitStreamHalted,
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
  const catchError = (
    onError?: (
      error: Error,
      currentValue: Readonly<NullableInferredT>,
      setter: ObservableSetter<NullableInferredT>,
    ) => void,
  ) => {
    const newObservable$ = createObservable<NullableInferredT, false>({
      initialValue: get(),
      name: `${name}_catchError`,
      emitWhenValuesAreEqual,
    })

    const handleError = (error: Error, stack?: ObservableStackItem[]) => {
      if (onError) {
        try {
          onError(error, get() as Readonly<NullableInferredT>, set)
          newObservable$.emitStreamHalted(stack)
        } catch (err) {
          newObservable$.emitError(err as Error, stack)
        }
      } else {
        newObservable$.emitStreamHalted(stack)
      }
    }

    subscribe(
      (val, stack) => newObservable$.set(val, stack),
      handleError,
      newObservable$.emitStreamHalted,
    )

    return newObservable$
  }

  const guard = (
    predicate: (
      previousValue: Readonly<NullableInferredT>,
      nextValue: Readonly<NullableInferredT>,
    ) => boolean,
  ) => {
    // Create a new observable for the guarded stream
    // False is used here because the type is already inferred
    // and adding true would cause the type to be inferred as NullableInferredT | undefined
    const guardedObservable = createObservable<NullableInferredT, false>({
      initialValue: get(),
      emitWhenValuesAreEqual,
    })

    // Subscribe to the original observable
    observable.subscribe(
      (nextValue, stack) => {
        const prevValue = guardedObservable.get()
        if (predicate(prevValue, nextValue)) {
          guardedObservable.set(nextValue, stack)
        } else {
          // The value is not passed through, but an error must be
          guardedObservable.emitStreamHalted()
        }
      },
      guardedObservable.emitError,
      guardedObservable.emitStreamHalted,
    )

    return guardedObservable
  }

  const reset = () => set(getInitialValue() as NullableInferredT)

  const getName = () => _observableName

  const setName = (name: string) => {
    _observableName = name
  }

  const getId = (): string => id

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
    catchError,
    reset,
    getName,
    setName,
    getId,
    emit,
    emitError,
    emitStreamHalted,
    mapEntries,
    getInitialValue,
    guard,
  }

  return observable
}
