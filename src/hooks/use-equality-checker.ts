import { useRef } from 'react'
import { shallowEqualArrays } from '../utils/general'

export const useEqualityChecker = <T>(dependencies: T[]): boolean => {
  const ref = useRef<T[]>(dependencies)

  console.log('dependencies prev/current', ref.current, dependencies)

  // Do the comparison synchronously
  const isEqual = shallowEqualArrays(ref.current, dependencies)
  console.log('shallowEqualArrays result:', isEqual)

  // Update the ref immediately for next render
  ref.current = dependencies

  console.log('returning isEqual:', isEqual)
  return isEqual
}
