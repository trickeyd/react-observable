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

  // Only attempt stack parsing in dev to avoid runtime overhead and engine variance
  if (!isDevEnv()) return fallback

  // Capture stack
  const error = new Error()
  const raw = String(error.stack || '')
  const lines = raw.split(/\r?\n/)
  if (!lines.length) return fallback

  // Parse frames into function names and locations, excluding library frames
  type ParsedFrame = {
    raw: string
    functionName?: string
    location?: string
  }

  const reactInternalNames = new Set([
    'renderWithHooks',
    'updateFunctionComponent',
    'beginWork',
    'performUnitOfWork',
    'workLoopSync',
    'performSyncWorkOnRoot',
    'flushSyncCallbacks',
  ])

  const parsed: ParsedFrame[] = lines
    .map((l) => l.trim())
    .filter((l) => !!l)
    .map((l) => {
      const v8 = l.match(/at\s+([^\s(]+)\s+\(([^)]+)\)/)
      if (v8) return { raw: l, functionName: v8[1], location: v8[2] }
      const fnAtLoc = l.match(/at\s+([^\s(]+)@(.+)/)
      if (fnAtLoc)
        return { raw: l, functionName: fnAtLoc[1], location: fnAtLoc[2] }
      const plain = l.match(/at\s+(.+):(\d+):(\d+)/)
      if (plain)
        return { raw: l, location: `${plain[1]}:${plain[2]}:${plain[3]}` }
      return { raw: l }
    })
    .filter((f) => !libHint.test(f.raw))

  const getIdx = parsed.findIndex((f) => f.functionName === 'getCallsiteName')
  const afterGet = getIdx >= 0 ? parsed.slice(getIdx + 1) : parsed

  const names: string[] = []
  for (const f of afterGet) {
    const name = f.functionName
    if (!name) continue
    if (reactInternalNames.has(name)) break
    names.push(name)
    if (/^[A-Z][A-Za-z0-9_$]*$/.test(name)) break
  }

  if (names.length > 0) {
    return names.reverse().join('->')
  }

  const first = afterGet.find((f) => f.location || f.functionName)
  if (first) {
    if (first.functionName && first.location)
      return `${first.functionName} @ ${first.location}`
    if (first.functionName) return first.functionName
    if (first.location) return first.location
  }

  return fallback
}
