import { Observable } from '../types/observable';
import { Readonly } from '../types/access';
import { Store } from '../types/store';
export declare const useObservable: <ReturnT = any>(initialise: ({ store, wrapObservable, }: {
    store: Store;
    wrapObservable: <T extends unknown = unknown>(observable: Observable<T>) => Observable<T>;
}) => Observable<ReturnT>) => Readonly<ReturnT>;
