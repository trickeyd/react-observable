import { Observable } from '../types/observable';
import { Store } from '../types/store';
export declare function useStoreObservable<ReturnT = any>(initialise: ({ store }: {
    store: Store;
}) => Observable<ReturnT>): Observable<ReturnT>;
