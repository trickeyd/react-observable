import { Observable } from '../types/observable';
import { Readonly } from '../types/access';
import { Store } from '../types/store';
export declare const useStream: <ReturnT = any>(initialise: ({ $, store, }: {
    $: Observable<unknown[]>;
    store: Store;
}) => Observable<ReturnT>, dependencies: unknown[]) => Readonly<ReturnT>;
