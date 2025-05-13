import { CreateObservableParams, Observable } from '../types/observable';
import { PersistentObservable } from '../types/observable';
export declare const persistentObservables: PersistentObservable<any>[];
interface CreatePersistentObservableParams<T> extends CreateObservableParams<T> {
    mergeOnHydration?: (initialValue: T, persisted: unknown) => T;
}
export declare function createPersistentObservable<T>({ name, initialValue, equalityFn, mergeOnHydration, }: CreatePersistentObservableParams<T>): Observable<T>;
export {};
