import { CreateObservableParams, Observable } from '../types/observable';
export declare const createObservable: <T extends unknown>({ initialValue, equalityFn, name }?: CreateObservableParams<T>) => Observable<T>;
