import { Observable } from "../types/observable";
export declare const createStreamName: (baseName: string) => string;
export declare const wrapObservable: <T extends unknown = unknown>(observable: Observable<T>, onSubscription: (unsubscribe: () => void) => void) => Observable<T>;
