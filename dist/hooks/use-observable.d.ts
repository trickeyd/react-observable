import { Observable } from '../types/observable';
import { Readonly } from '../types/access';
import { Store } from '../types/store';
type ObservableValue<O> = O extends Observable<infer T> ? T : never;
export declare function useObservable<O extends Observable<any>>(initialise: (args: {
    store: Store;
    wrapObservable: <T = unknown>(observable: Observable<T>) => Observable<T>;
}) => O): Readonly<ObservableValue<O>>;
export {};
