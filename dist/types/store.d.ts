import type { Observable } from './observable';
export interface Store extends Record<string, Record<string, Observable<unknown>>> {
}
/** @internal */
export type FlatStore = Record<string, Observable<unknown>>;
export interface ObservableConfig<T> {
    observablePath: string;
    options: ObservableOptions;
}
export interface ObservableOptions {
    skipAutomaticFlushes?: boolean;
}
