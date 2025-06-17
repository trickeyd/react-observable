import { Observable } from '../types/observable';
import { Store } from '../types/store';
type ObservableValue<O> = O extends Observable<infer T> ? T : never;
export declare function useObservableValue<O extends Observable<any>>(initialise: (args: {
    store: Store;
    wrapObservable: <T = unknown>(observable: Observable<T>) => Observable<T>;
}) => O): ObservableValue<O>;
export {};
