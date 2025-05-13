import { Store } from '../types/store';
export declare const useStoreProxy: (onSubscription: (unsubscribe: () => void) => void) => Store;
