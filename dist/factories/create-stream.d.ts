import { Observable } from '../types/observable';
import { Store } from '../types/store';
interface Props<ReturnT> {
    onError?: (err: Error) => void;
    initialValue?: ReturnT;
    result$?: Observable<ReturnT>;
}
type ExecuteReturnType<T> = [T, undefined] | [undefined, Error] | [undefined, undefined];
export declare const createStream: <ReturnT, InputT = undefined>(initialise: ({ $, store, }: {
    $: Observable<InputT>;
    store: Store;
}) => Observable<ReturnT>, { onError, initialValue, result$ }?: Props<ReturnT>) => {
    (payload?: InputT): Promise<ExecuteReturnType<ReturnT>>;
    exit$: Observable<ReturnT>;
};
export {};
