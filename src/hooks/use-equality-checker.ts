import { useRef, useEffect } from 'react'
import { shallowEqual } from '../utils/general'

export const useEqualityChecker = <T>(dependencies: T[]): boolean => {
  const ref = useRef<T[]>(dependencies)
  const isEqualRef = useRef(true)

  useEffect(() => {
    isEqualRef.current = shallowEqual(ref.current, dependencies)
    ref.current = dependencies
  }, dependencies)

  return isEqualRef.current
} 