"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStream = void 0;
const observable_1 = require("./observable");
const createStore_1 = require("../store/createStore");
const createStream = (initialise, { onError, initialValue, result$ } = {}) => {
    const entry$ = (0, observable_1.createObservable)({ initialValue: undefined });
    const exit$ = (0, observable_1.createObservable)({ initialValue });
    if (result$) {
        // we don't really need to pass the error on to the result
        exit$.subscribe((val) => result$.set(val));
    }
    const unSubMain = createStore_1.store$.subscribe((store) => {
        const stream$ = initialise({
            $: entry$,
            store: store,
        });
        // TODO- need to check if it already exists for 
        // items that are loaded later
        stream$.subscribe((val) => exit$.set(val), exit$.emitError);
        unSubMain();
    });
    const execute = (payload) => new Promise((resolve) => {
        const unsub = exit$.subscribe((data) => {
            resolve([data, undefined]);
            unsub();
        }, (error) => {
            onError && onError(error);
            resolve([undefined, error]);
            unsub();
        });
        if (payload) {
            entry$.setSilent(payload);
        }
        else {
            entry$.emit();
        }
    });
    execute.exit$ = exit$;
    return execute;
};
exports.createStream = createStream;
