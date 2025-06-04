import { Observable } from '../types/observable';
import { Readonly } from '../types/access';
import { Store } from '../types/store';
export declare const useStream: <ReturnT = any, DepsT extends unknown[] = unknown[]>(initialise: ({ $, store, }: {
    $: Observable<DepsT>;
    store: Store;
}) => Observable<ReturnT>, dependencies: DepsT) => Readonly<ReturnT>;
