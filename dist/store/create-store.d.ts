import { Observable } from '../types/observable';
import { Store } from '../types/store';
import { PersistentStorage } from '../types/persistence';
/** @internal */
export declare const store$: Observable<Store>;
/** @internal */
export declare const flatStore$: Observable<Record<string, Observable<unknown>>>;
export declare const persistentStorage$: Observable<PersistentStorage>;
export declare const createStore: (store: Store, options?: {
    persistentStorage?: PersistentStorage;
}) => Store;
export declare const registerFlushableObservable: (observable: Observable<unknown>) => void;
export declare const flush: () => void;
