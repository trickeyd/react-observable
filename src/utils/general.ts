export const tryCatch = async <T>(
  fn: () => Promise<T>,
  errorMessage?: string,
): Promise<[T, Error | undefined]> => {
  try {
    const result = await fn()
    return [result, undefined]
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    if (errorMessage) {
      err.message = `${errorMessage}\n${err.message}`
    }
    return [undefined as T, err]
  }
}

export const tryCatchSync = <T>(
  fn: () => T,
  errorMessage?: string,
): [T, Error | undefined] => {
  try {
    const result = fn()
    return [result, undefined]
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    if (errorMessage) {
      err.message = `${errorMessage}\n${err.message}`
    }
    return [undefined as T, err]
  }
}

export const identity = <T>(value: T): T => value

export const isFunction = (value: unknown): value is Function =>
  typeof value === 'function'

export const isObject = (value: unknown): value is object =>
  value !== null && typeof value === 'object'

export const isPlainObject = (value: unknown): value is object =>
  isObject(value) && value.constructor === Object

export const shallowEqualArrays = (a: any[], b: any[]): boolean => {
  if (a === b) return true

  if (!Array.isArray(a) || !Array.isArray(b)) return false

  if (a.length !== b.length) return false

  return a.every((item, index) => item === b[index])
}

let uuidCounter = 0
export function uuid() {
  if (uuidCounter >= Number.MAX_SAFE_INTEGER) {
    uuidCounter = 0
  }
  return `${Date.now()}-${++uuidCounter}`
}
