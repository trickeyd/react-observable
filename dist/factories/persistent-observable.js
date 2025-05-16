"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.persistentObservables = void 0;
exports.createPersistentObservable = createPersistentObservable;
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
const observable_1 = require("./observable");
const general_1 = require("../utils/general");
exports.persistentObservables = [];
const defaultMergeOnHydration = (initialValue, persisted) => {
    if (!(0, general_1.isPlainObject)(initialValue)) {
        return persisted;
    }
    return { ...initialValue, ...(persisted !== null && persisted !== void 0 ? persisted : {}) };
};
function createPersistentObservable({ name, initialValue, equalityFn, mergeOnHydration = defaultMergeOnHydration, }) {
    const base = (0, observable_1.createObservable)({ initialValue, name });
    const _setInternal = (isSilent) => (newValue) => {
        const observableName = base.getName();
        if (!observableName || observableName === base.getId()) {
            throw new Error('Persistent observable name is required for set.');
        }
        const value = base.get();
        const reducedValue = (0, general_1.isFunction)(newValue) ? newValue(value) : newValue;
        if (((equalityFn && !equalityFn(value, reducedValue)) ||
            value === reducedValue)) {
            return;
        }
        isSilent ? base.setSilent(reducedValue) : base.set(reducedValue);
        async_storage_1.default.setItem(observableName, JSON.stringify(reducedValue));
    };
    const setSilent = _setInternal(true);
    const set = _setInternal(false);
    const rehydrate = () => new Promise((resolve, reject) => {
        const observableName = base.getName();
        if (!observableName || observableName === base.getId()) {
            reject(new Error('Persistent observable name is required for rehydration.'));
        }
        try {
            async_storage_1.default.getItem(observableName).then((value) => {
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
