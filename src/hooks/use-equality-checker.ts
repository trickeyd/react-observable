import { useRef, useEffect } from 'react'
import { shallowEqualArrays } from '../utils/general'

export const useEqualityChecker = <T>(dependencies: T[]): boolean => {
  const ref = useRef<T[]>(dependencies)
  const isEqualRef = useRef(true)

  useEffect(() => {
    isEqualRef.current = shallowEqualArrays(ref.current, dependencies)
    ref.current = dependencies
  }, dependencies)

  return isEqualRef.current
}
