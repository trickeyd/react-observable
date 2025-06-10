import { Observable, ObservableStackItem } from '../types/observable';
export declare const createStreamName: (baseName: string) => string;
export declare const wrapObservable: <T extends unknown = unknown>(observable: Observable<T>, onSubscription: (unsubscribe: () => void) => void) => Observable<T>;
export declare const getIsAppropriateStream: (stack: ObservableStackItem[], entryName: string, entryEmitCount: number) => boolean;
