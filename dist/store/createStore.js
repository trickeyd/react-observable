"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flush = exports.registerFlushableObservable = exports.createStore = exports.persistentStorage$ = exports.flatStore$ = exports.store$ = void 0;
const observable_1 = require("../factories/observable");
/** @internal */
exports.store$ = (0, observable_1.createObservable)();
/** @internal */
exports.flatStore$ = exports.store$.stream((store) => Object.entries(store).reduce((acc, [pathName, segment]) => ({
    ...acc,
    ...Object.entries(segment).reduce((segmentAcc, [observablePathName, observable]) => ({
        ...segmentAcc,
        [`${pathName}.${observablePathName}`]: observable,
    }), {}),
}), {}));
exports.persistentStorage$ = (0, observable_1.createObservable)();
const flushableObservables = [];
let storeIsInitialized = false;
const createStore = (store, options = {}) => {
    if (storeIsInitialized) {
        throw new Error('Store already initialized');
    }
    if (options === null || options === void 0 ? void 0 : options.persistentStorage) {
        exports.persistentStorage$.set(options.persistentStorage);
    }
    const storeClone = Object.entries(store).reduce((acc, [pathName, segment]) => ({ ...acc, [pathName]: { ...segment } }), {});
    let flatStore = {};
    storeIsInitialized = true;
    // parse the store and apply the observable options
    Object.entries(storeClone).forEach(([pathName, segment]) => {
        Object.entries(segment).forEach(([observablePathName, observable]) => {
            const path = `${pathName}.${observablePathName}`;
            const observableId = observable.getId();
            const observableName = observable.getName();
            if (observableName === observableId) {
                // automatically set the name of the observable to the path if not already set
                observable.setName(path);
            }
            const isFlushable = true; // !options || !options.skipAutomaticFlushes
            if (isFlushable) {
                flushableObservables.push(observable);
            }
            flatStore[path] = observable;
        });
    });
    exports.flatStore$.set(flatStore);
    exports.store$.set(storeClone);
    return store;
};
exports.createStore = createStore;
const registerFlushableObservable = (observable) => {
    flushableObservables.push(observable);
};
exports.registerFlushableObservable = registerFlushableObservable;
const flush = () => {
    flushableObservables.forEach((observable) => {
        observable.reset();
    });
};
exports.flush = flush;
