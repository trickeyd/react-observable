import { useRef } from 'react'
import { shallowEqualArrays } from '../utils/general'

export const useEqualityChecker = <T>(dependencies: T[]): boolean => {
  const ref = useRef<T[]>([])

  const isEqual = !!ref.current && shallowEqualArrays(ref.current, dependencies)

  ref.current = dependencies

  return isEqual
}
