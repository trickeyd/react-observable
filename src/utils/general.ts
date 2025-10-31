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
  value !== null && typeof value === 'object' && !Array.isArray(value)

export const isPlainObject = (value: unknown): value is object =>
  isObject(value) && value.constructor === Object

export const shallowEqualArrays = (a: any[], b: any[]): boolean => {
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

export type CallsiteNameOptions = {
  libHint?: RegExp
  fallback?: string
}

export function isDevEnv(): boolean {
  const g: any =
    typeof globalThis !== 'undefined' ? (globalThis as any) : ({} as any)
  return (
    (typeof g.__DEV__ !== 'undefined' && !!g.__DEV__) ||
    (g.process && g.process.env && g.process.env.NODE_ENV !== 'production')
  )
}

// Dev-only helper that returns a human-friendly callsite label based on the
// first user-land stack frame. It avoids library frames using libHint.
// Returns fallback when not in dev or when a stack cannot be parsed.
export function getCallsiteName(options?: CallsiteNameOptions): string {
  const libHint =
    options?.libHint ??
    /(react-observable|node_modules\/react-observable|src\/utils\/|src\/factories\/|src\/store\/|src\/hooks\/)/
  const fallback = options?.fallback ?? 'observable'

  console.log('isDevEnv', isDevEnv())

  // Only attempt stack parsing in dev to avoid runtime overhead and engine variance
  if (!isDevEnv()) return fallback

  // Capture stack
  const error = new Error()
  const raw = String(error.stack || '')
  const lines = raw.split(/\r?\n/)
  console.log('lines', lines)
  if (!lines.length) return fallback

  // Find the first frame that looks like user code and not our library
  const frame = lines
    .map((l) => l.trim())
    .filter((l) => l && !libHint.test(l))
    .find((l) => /\.(tsx?|jsx?)\b/.test(l))

  console.log('frame', frame)
  if (!frame) return fallback

  // Try common V8 style: "at fnName (path/to/file.tsx:123:45)"
  const fnMatch = frame.match(/at\s+([^\s(]+)\s+\(([^)]+)\)/)
  if (fnMatch) {
    const fnName = fnMatch[1]
    const loc = fnMatch[2]
    return `${fnName} @ ${loc}`
  }

  // Try Hermes/JSC plain: "at path/to/file.tsx:123:45"
  const plainMatch = frame.match(/at\s+(.+):(\d+):(\d+)/)
  if (plainMatch) {
    const file = plainMatch[1]
    const line = plainMatch[2]
    const col = plainMatch[3]
    return `${file}:${line}:${col}`
  }

  console.log('returning ', frame || fallback)
  // Fallback to the whole frame text if patterns differ
  return frame || fallback
}
