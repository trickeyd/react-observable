import { useRef, useEffect } from 'react'
import { shallowEqualArrays } from '../utils/general'

export const useEqualityChecker = <T>(dependencies: T[]): boolean => {
  const ref = useRef<T[]>(dependencies)
  const isEqualRef = useRef(true)
  console.log('dependencies prev/current', ref.current, dependencies)
  useEffect(() => {
    console.log(
      'shallowEqualArrays',
      shallowEqualArrays(ref.current, dependencies),
    )
    isEqualRef.current = shallowEqualArrays(ref.current, dependencies)
    ref.current = dependencies
  }, dependencies)

  console.log('isEqualRef', isEqualRef.current)
  return isEqualRef.current
}
