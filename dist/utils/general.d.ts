export declare const tryCatch: <T>(fn: () => Promise<T>, errorMessage?: string) => Promise<[T, Error | undefined]>;
export declare const tryCatchSync: <T>(fn: () => T, errorMessage?: string) => [T, Error | undefined];
export declare const identity: <T>(value: T) => T;
export declare const isFunction: (value: unknown) => value is Function;
export declare const isObject: (value: unknown) => value is object;
export declare const isPlainObject: (value: unknown) => value is object;
export declare const shallowEqual: (a: unknown, b: unknown) => boolean;
