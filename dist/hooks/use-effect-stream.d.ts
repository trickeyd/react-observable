import { Observable } from '../types/observable';
import { Readonly } from '../types/access';
import { Store } from '../types/store';
export declare const useEffectStream: <ReturnT = any, InputT extends unknown[] = unknown[]>(initialise: ({ $, store, }: {
    $: Observable<InputT>;
    store: Store;
}) => Observable<ReturnT>, inputs: InputT) => Readonly<ReturnT>;
