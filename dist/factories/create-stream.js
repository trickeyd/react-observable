"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStream = void 0;
const observable_1 = require("./observable");
const create_store_1 = require("../store/create-store");
const stream_1 = require("../utils/stream");
const createStream = (initialise, { onError, initialValue, result$ } = {}) => {
    const entry$ = (0, observable_1.createObservable)({ initialValue: undefined });
    const exit$ = (0, observable_1.createObservable)({ initialValue });
    const isInitialised = (0, observable_1.createObservable)({ initialValue: false });
    const entryId = entry$.getId();
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
            const unsubscribe = exit$.subscribe((data, stack) => {
                const isAppropriateStream = stack
                    ? (0, stream_1.getIsAppropriateStream)(stack, entryId, entryEmitCount)
                    : false;
                console.log('isAppropriateStream', isAppropriateStream, stack);
                if (isAppropriateStream) {
                    resolve([data, undefined]);
                    unsubscribe();
                }
            }, (error, stack) => {
                const isAppropriateStream = stack
                    ? (0, stream_1.getIsAppropriateStream)(stack, entryId, entryEmitCount)
                    : false;
                console.log('isAppropriateStream error', isAppropriateStream, stack);
                if (isAppropriateStream) {
                    onError && onError(error, stack);
                    resolve([undefined, error]);
                    unsubscribe();
                }
            }, (stack) => {
                const isAppropriateStream = stack
                    ? (0, stream_1.getIsAppropriateStream)(stack, entryId, entryEmitCount)
                    : false;
                console.log('isAppropriateStream complete', isAppropriateStream, stack);
                if (isAppropriateStream) {
                    resolve([undefined, undefined]);
                    unsubscribe();
                }
            });
            if (payload) {
                entry$.setSilent(payload);
            }
            const entryEmitCount = entry$.emit();
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
