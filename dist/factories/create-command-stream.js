"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCommandStream = void 0;
const observable_1 = require("./observable");
const create_store_1 = require("../store/create-store");
const stream_1 = require("../utils/stream");
const general_1 = require("../utils/general");
const createCommandStream = (initialise, { onError, initialValue, result$ } = {}) => {
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
        stream$.subscribe(exit$.set, exit$.emitError, exit$.emitComplete);
    };
    const execute = (payload) => new Promise((resolve) => {
        const run = () => {
            const executionId = (0, general_1.uuid)();
            const entryEmitCount = entry$.getEmitCount();
            const unsubscribe = exit$.subscribe((data, stack) => {
                const isAppropriateStream = stack
                    ? (0, stream_1.getIsAppropriateStream)(stack, executionId, entryEmitCount)
                    : false;
                if (isAppropriateStream) {
                    resolve([data, undefined]);
                    unsubscribe();
                }
            }, (error, stack) => {
                const isAppropriateStream = stack
                    ? (0, stream_1.getIsAppropriateStream)(stack, executionId, entryEmitCount)
                    : false;
                if (isAppropriateStream) {
                    onError && onError(error, stack);
                    resolve([undefined, error]);
                    unsubscribe();
                }
            }, (stack) => {
                const isAppropriateStream = stack
                    ? (0, stream_1.getIsAppropriateStream)(stack, executionId, entryEmitCount)
                    : false;
                if (isAppropriateStream) {
                    resolve([undefined, undefined]);
                    unsubscribe();
                }
            });
            if (payload) {
                entry$.setSilent(payload);
            }
            entry$.emit([
                {
                    id: executionId,
                    name: `createStream:${executionId}`,
                    emitCount: entryEmitCount,
                    isError: false,
                },
            ]);
        };
        if (!isInitialised.get()) {
            if (!!create_store_1.store$.get()) {
                initialiseStream(create_store_1.store$.get());
            }
            else {
                create_store_1.store$.subscribeOnce((store) => {
                    initialiseStream(store);
                });
            }
        }
        run();
    });
    execute.exit$ = exit$;
    return execute;
};
exports.createCommandStream = createCommandStream;
