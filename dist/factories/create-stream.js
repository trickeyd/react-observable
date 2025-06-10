"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStream = void 0;
const observable_1 = require("./observable");
const create_store_1 = require("../store/create-store");
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
        isInitialised.set(true);
        stream$.subscribe((val) => exit$.set(val), exit$.emitError);
    };
    const execute = (payload) => new Promise((resolve) => {
        const run = () => {
            console.log('run');
            exit$.subscribeOnce((data) => {
                resolve([data, undefined]);
            }, (error) => {
                onError && onError(error);
                resolve([undefined, error]);
            }, () => {
                resolve([undefined, undefined]);
            });
            if (payload) {
                entry$.setSilent(payload);
            }
            entry$.emit();
        };
        if (!isInitialised.get()) {
            if (!!create_store_1.store$.get()) {
                console.log('execute 2');
                initialiseStream(create_store_1.store$.get());
            }
            else {
                console.log('execute 2.5');
                create_store_1.store$.subscribeOnce((store) => {
                    console.log('execute 3');
                    initialiseStream(store);
                });
            }
        }
        run();
    });
    execute.exit$ = exit$;
    return execute;
};
exports.createStream = createStream;
