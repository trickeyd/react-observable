"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.persistentObservables = void 0;
exports.createPersistentObservable = createPersistentObservable;
const observable_1 = require("./observable");
const general_1 = require("../utils/general");
const create_store_1 = require("../store/create-store");
exports.persistentObservables = [];
const defaultMergeOnHydration = (initialValue, persisted) => {
    if (!(0, general_1.isPlainObject)(initialValue)) {
        return persisted;
    }
    return { ...initialValue, ...(persisted !== null && persisted !== void 0 ? persisted : {}) };
};
function createPersistentObservable({ name, initialValue, equalityFn, mergeOnHydration = defaultMergeOnHydration, }) {
    let _persistentStorage = create_store_1.persistentStorage$.get();
    if (!_persistentStorage) {
        create_store_1.persistentStorage$.subscribeOnce((persistentStorage) => {
            _persistentStorage = persistentStorage;
        });
    }
    const base = (0, observable_1.createObservable)({ initialValue, name });
    const _setInternal = (isSilent) => (newValue, stack) => {
        const observableName = base.getName();
        if (!observableName || observableName === base.getId()) {
            throw new Error('Persistent observable name is required for set.');
        }
        const value = base.get();
        const reducedValue = (0, general_1.isFunction)(newValue) ? newValue(value) : newValue;
        if ((equalityFn && !equalityFn(value, reducedValue)) ||
            value === reducedValue) {
            return -1;
        }
        _persistentStorage.setItem(observableName, JSON.stringify(reducedValue));
        return isSilent ? base.setSilent(reducedValue) : base.set(reducedValue);
    };
    const setSilent = _setInternal(true);
    const set = _setInternal(false);
    const rehydrate = () => new Promise((resolve, reject) => {
        if (!_persistentStorage) {
            throw new Error('Trying to rehydrate a persistent observable without a persistent storage.');
        }
        const observableName = base.getName();
        if (!observableName || observableName === base.getId()) {
            reject(new Error('Persistent observable name is required for rehydration.'));
        }
        try {
            _persistentStorage.getItem(observableName).then((value) => {
                if (value) {
                    const persisted = JSON.parse(value);
                    const data = mergeOnHydration
                        ? mergeOnHydration(base.getInitialValue(), persisted)
                        : persisted;
                    base.set(data);
                }
                resolve();
            });
        }
        catch (error) {
            reject(error);
        }
    });
    const reset = () => set(base.getInitialValue());
    const observable = {
        ...base,
        set,
        setSilent,
        rehydrate,
        reset,
    };
    exports.persistentObservables[exports.persistentObservables.length] = observable;
    return observable;
}
