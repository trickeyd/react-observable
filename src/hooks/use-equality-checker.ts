import { useRef } from 'react'
import { shallowEqualArrays } from '../utils/general'

export const useEqualityChecker = <T>(dependencies: T[]): boolean => {
  const ref = useRef<T[]>(dependencies)

  // Do the comparison synchronously
  const isEqual = shallowEqualArrays(ref.current, dependencies)

  // Update the ref immediately for next render
  ref.current = dependencies

  return isEqual
}
