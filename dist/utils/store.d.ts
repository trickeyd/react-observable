import { Observable } from '..';
import { Store } from '../types/store';
export declare const store$: Observable<Store | null>;
export declare const getStoreObservable: <T extends unknown = unknown>(callback: (store: Store) => T) => Observable<T>;
