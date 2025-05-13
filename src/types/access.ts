type DeepReadonlyArray<T> = ReadonlyArray<Readonly<T>>

type DeepReadonlyObject<T> = {
  readonly [K in keyof T]: Readonly<T[K]>
}

type DeepMutable<T> = T extends (infer R)[]
  ? DeepMutable<R>[]
  : T extends object
    ? { -readonly [K in keyof T]: DeepMutable<T[K]> }
    : T

// General type
export type Readonly<T> = T extends (infer R)[]
? DeepReadonlyArray<R>
: T extends object
  ? DeepReadonlyObject<T>
  : T

// Allow either mutable or readonly at any level
export type Safe<T> = T extends (infer R)[]
  ? Safe<R>[] | DeepReadonlyArray<R> | DeepMutable<R>[] | R[]
  : T extends object
    ? { [K in keyof T]: Safe<T[K]> }
    : T
