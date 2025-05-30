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

export const shallowEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true
  if (!isObject(a) || !isObject(b)) return false

  const keysA = Object.keys(a)
  const keysB = Object.keys(b)

  if (keysA.length !== keysB.length) return false

  return keysA.every((key) => {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false
    return (a as any)[key] === (b as any)[key]
  })
}

export function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}