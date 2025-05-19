"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStream = void 0;
const observable_1 = require("./observable");
const createStore_1 = require("../store/createStore");
const createStream = (initialise, { onError, initialValue, result$ } = {}) => {
    const entry$ = (0, observable_1.createObservable)({ initialValue: undefined });
    const exit$ = (0, observable_1.createObservable)({ initialValue });
    const isInitialised = (0, observable_1.createObservable)({ initialValue: false });
    if (result$) {
        // we don't really need to pass the error on to the result
        exit$.subscribe((val) => result$.set(val));
    }
    const initialiseStream = (store) => {
        const stream$ = initialise({
            $: entry$,
            store: store,
        });
        stream$.subscribe((val) => exit$.set(val), exit$.emitError);
    };
    const execute = (payload) => new Promise((resolve) => {
        const run = () => {
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
        };
        if (isInitialised.get()) {
            run();
        }
        else {
            if (!!createStore_1.store$.get()) {
                initialiseStream(createStore_1.store$.get());
                run();
            }
            else {
                createStore_1.store$.subscribe((store) => {
                    initialiseStream(store);
                    run();
                });
            }
        }
    });
    execute.exit$ = exit$;
    return execute;
};
exports.createStream = createStream;
