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
} from '../types/observable'
import { Readonly } from '../types/access'

export const createObservable = <T extends unknown>(
  { initialValue, equalityFn, name }: CreateObservableParams<T> = {
    initialValue: undefined,
  },
): Observable<T> => {
  const streamStack: string[] = []
  const id = uuid()
  let observableName: string = name ?? id
  let listenerRecords: ListenerRecord<T>[] = []

  const getInitialValue: GetInitialValueOperator<T> = (): T =>
    isFunction(initialValue) ? initialValue() : (initialValue as T)

  let value: T = getInitialValue()

  const get: ObservableGetter<T> = (): Readonly<T> => value as Readonly<T>

  const emit: EmitOperator = () => {
    const unsubscribeIds = listenerRecords.reduce<string[]>(
      (acc, { listener, once, id }) => {
        listener?.(value as Readonly<T>)
        return once ? [...acc, id] : acc
      },
      [] as string[],
    )
    unsubscribeIds.forEach((id) => unsubscribe(id))
  }

  const emitError: EmitErrorOperator = (err: Error) =>
    listenerRecords.forEach(({ onError }) => onError?.(err))

  /**
   * emitComplete notifies all subscribers that the stream has completed successfully.
   * After calling emitComplete, no further values or errors will be emitted.
   * Subscribers can provide an onComplete callback to react to stream completion.
   */
  const emitComplete: () => void = () =>
    listenerRecords.forEach(({ onComplete }) => onComplete?.())

  const _setInternal =
    (isSilent: boolean): ObservableSetter<T> =>
    (newValue) => {
      const reducedValue: T = (
        isFunction(newValue) ? newValue(get()) : newValue
      ) as T

      if (
        (equalityFn &&
          !equalityFn(value as Readonly<T>, reducedValue as Readonly<T>)) ||
        value === reducedValue
      ) {
        return
      }

      value = reducedValue
      isSilent && emit()
    }

  const set: ObservableSetter<T> = _setInternal(true)
  const setSilent: ObservableSetter<T> = _setInternal(false)

  const subscribe: SubscribeFunction<T> = (listener, onError, onComplete) => {
    const id = uuid() as string
    listenerRecords.push({ listener, onError, id, once: false, onComplete })
    return () => unsubscribe(id)
  }

  const subscribeOnce: SubscribeFunction<T> = (
    listener,
    onError,
    onComplete,
  ) => {
    const id = uuid() as string
    listenerRecords.push({ listener, onError, id, once: true, onComplete })
    return () => unsubscribe(id)
  }

  const subscribeWithValue: SubscribeFunction<T> = (
    listener,
    onError,
    onComplete,
  ) => {
    const unsubscribe = subscribe(listener, onError, onComplete)
    if (listener) {
      listener(value as Readonly<T>)
    }
    return unsubscribe
  }

  const unsubscribe: UnsubscribeFunction = (id: string) => {
    listenerRecords = listenerRecords.filter((lr) => lr.id !== id)
  }

  const combineLatestFrom = <U extends unknown[]>(
    ...observables: { [K in keyof U]: Observable<U[K]> }
  ) => {
    type CombinedValues = [T, ...U]

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

    const combinationObservable$ = createObservable<CombinedValues>({
      initialValue: initialValues,
    })

    subscribeFunctions.forEach((sub, i) => {
      sub(
        (val: U[keyof U]) => {
          combinationObservable$.set((values) => {
            const clone = [...values]
            clone[i] = val as CombinedValues[number]
            return clone as CombinedValues
          })
        },
        (err: Error) => combinationObservable$.emitError(err),
      )
    })

    return combinationObservable$
  }

  const withLatestFrom = <OtherT extends unknown[]>(
    ...observables: [...{ [K in keyof OtherT]: Observable<OtherT[K]> }]
  ) => {
    type CombinedValues = [T, ...{ [K in keyof OtherT]: OtherT[K] }]

    const resultObservable$ = createObservable<CombinedValues>({
      initialValue: [
        get(),
        ...observables.map((obs) => obs.get()),
      ] as CombinedValues,
    })

    subscribe(
      (sourceValue: Readonly<T>) => {
        const combined = [
          sourceValue,
          ...observables.map((obs) => obs.get()),
        ] as CombinedValues
        resultObservable$.set(combined)
      },
      resultObservable$.emitError,
      resultObservable$.emitComplete,
    )
    return resultObservable$
  }

  const stream: StreamProjection<T, false> = <NewT = unknown>(
    project: (data: Readonly<T>) => NewT,
    {
      initialValue,
      streamedName,
      executeOnCreation = true,
    } = {} as StreamOption<NewT>,
  ) => {
    const name = streamedName ?? createStreamName(getName())
    const newObservable$ = createObservable<NewT>({
      initialValue: (initialValue ?? undefined) as NewT,
      name,
    })

    ;(executeOnCreation ? subscribeWithValue : subscribe)(
      (data: Readonly<T>) => {
        const [newData, projectError] = tryCatchSync<NewT>(
          () => project(data),
          `Stream Error: Attempt to project stream to "${name}" from "${getName()}" has failed.`,
        )
        if (projectError) {
          newObservable$.emitError(projectError as Error)
        } else {
          newObservable$.set(newData as NewT)
        }
      },
      (err: Error) => newObservable$.emitError(err),
    )

    return newObservable$
  }

  const streamAsync: StreamProjection<T, true> = <NewT>(
    project: (data: Readonly<T>) => Promise<NewT>,
    {
      initialValue,
      streamedName,
      executeOnCreation = false,
    }: StreamOption<NewT> = {},
  ) => {
    const name = streamedName ?? createStreamName(getName())

    const newObservable$ = createObservable<NewT>({
      initialValue: (initialValue ?? undefined) as NewT,
      name,
    })

    const projectToNewObservable = async (data: Readonly<T>) => {
      const [newData, error] = await tryCatch<NewT>(
        () => project(data),
        `Stream Error: Attempt to project stream to "${name}" from "${getName()}" has failed.`,
      )
      if (error) {
        newObservable$.emitError(error)
      } else {
        newObservable$.set(newData as NewT)
      }
    }

    ;(executeOnCreation ? subscribeWithValue : subscribe)(
      projectToNewObservable,
      newObservable$.emitError,
    )

    return newObservable$
  }

  const tap: TapOperator<T> = (
    callback: (currentValue: Readonly<T>) => void,
  ) => {
    callback(get() as Readonly<T>)
    return observable as Observable<T>
  }

  const delay = (milliseconds: number): Observable<T> => {
    const newObservable$ = createObservable<T>({
      initialValue: get() as T,
      name: `${name}_after-delay-${milliseconds}`,
    })

    subscribe(
      async (val) => {
        await new Promise((r) => setTimeout(r, milliseconds))
        newObservable$.set(val as T)
      },
      newObservable$.emitError,
      newObservable$.emitComplete,
    )

    return newObservable$
  }

  const mapEntries: MapEntriesOperator<T> = <P extends string = '$'>({
    keys,
    observablePostfix = '$' as P,
  }: {
    keys?: (keyof T)[]
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
      ? entries.filter(([key]) => keys.includes(key as keyof T))
      : entries

    return filteredEntries.reduce(
      (acc, [key, value]) => {
        const name = `${key}${observablePostfix}`
        return {
          ...acc,
          [name]: stream((val) => val[key as keyof T], {
            streamedName: name,
          }),
        }
      },
      {} as MapEntriesReturn<T, P>,
    )
  }

  /**
   * catchError allows you to intercept errors in the observable stream.
   *
   * - The user-provided onError handler can choose to:
   *   - Throw a new error (for better debugging or to mark a problem section)
   *   - Forward the original error
   *   - Do nothing, in which case the stream will complete gracefully via emitComplete
   * - If the user handler throws, that error is emitted downstream.
   *
   * This design allows liberal use of throws throughout the stream, and helps pinpoint problem sections by allowing custom errors to be thrown at any catchError boundary. If the handler does nothing, the stream completes (no longer emits a special error).
   */
  const catchError = (
    onError?: (
      error: Error,
      currentValue: Readonly<T>,
      setter: ObservableSetter<T>,
    ) => void,
  ) => {
    const newObservable$ = createObservable<T>({
      initialValue: get(),
      name: `${name}_catchError`,
    })

    const handleError = (error: Error) => {
      if (onError) {
        try {
          onError(error, get() as Readonly<T>, set)
          newObservable$.emitComplete()
        } catch (err) {
          newObservable$.emitError(err as Error)
        }
      } else {
        newObservable$.emitComplete()
      }
    }

    subscribe(
      (val) => newObservable$.set(val),
      handleError,
      newObservable$.emitComplete,
    )

    return newObservable$
  }

  const guard = (
    predicate: (previousValue: Readonly<T>, nextValue: Readonly<T>) => boolean,
  ) => {
    // Create a new observable for the guarded stream
    const guardedObservable = createObservable<T>({ initialValue: get() })

    // Subscribe to the original observable
    observable.subscribe(
      (nextValue) => {
        const prevValue = guardedObservable.get()
        if (predicate(prevValue, nextValue)) {
          guardedObservable.set(nextValue)
        } else {
          // The value is not passed through, but an error must be
          guardedObservable.emitComplete()
        }
      },
      guardedObservable.emitError,
      guardedObservable.emitComplete,
    )

    return guardedObservable
  }

  const reset = () => set(getInitialValue() as T)

  const getName = () => observableName

  const setName = (name: string) => {
    observableName = name
  }

  const getId = (): string => id

  const observable: Observable<T> = {
    get,
    set,
    setSilent,
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
    emitComplete,
    mapEntries,
    getInitialValue,
    guard,
  }

  return observable
}
