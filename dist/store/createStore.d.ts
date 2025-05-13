import { Observable } from '../types/observable';
import { Store } from '../types/store';
/** @internal */
export declare const store$: Observable<Store>;
/** @internal */
export declare const flatStore$: Observable<Record<string, Observable<unknown>>>;
export declare const createStore: (store: Store, options?: {}) => Store;
export declare const registerFlushableObservable: (observable: Observable<unknown>) => void;
export declare const flush: () => void;
