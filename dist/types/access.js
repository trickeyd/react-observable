"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Allow either mutable or readonly at any level
/*
export type Safe<T> = T extends (infer R)[]
  ? Safe<R>[] | DeepReadonlyArray<R> | DeepMutable<R>[] | R[]
  : T extends object
    ? { [K in keyof T]: Safe<T[K]> }
    : T
*/
