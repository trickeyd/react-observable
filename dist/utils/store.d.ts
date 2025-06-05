import { Observable } from '..';
import { Store } from '../types/store';
export declare const getStoreObservable: <T extends unknown = unknown>(callback: (store: Store) => Observable<T>) => Observable<T>;
