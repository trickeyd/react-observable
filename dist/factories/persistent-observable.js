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
    if (!name) {
        throw new Error('Persistent observables require a name');
    }
    let _rehydrateIsComplete = false;
    let _resolveRehydrate;
    const base = (0, observable_1.createObservable)({ initialValue, name });
    const _setInternal = (isSilent) => (newValue) => {
        const value = base.get();
        const reducedValue = (0, general_1.isFunction)(newValue) ? newValue(value) : newValue;
        if (((equalityFn && !equalityFn(value, reducedValue)) ||
            value === reducedValue)) {
            return;
        }
        isSilent ? base.setSilent(reducedValue) : base.set(reducedValue);
        async_storage_1.default.setItem(name, JSON.stringify(reducedValue));
    };
    const setSilent = _setInternal(true);
    const set = _setInternal(false);
    async_storage_1.default.getItem(name).then((value) => {
        if (value) {
            const persisted = JSON.parse(value);
            const data = mergeOnHydration
                ? mergeOnHydration(base.getInitialValue(), persisted)
                : persisted;
            base.set(data);
        }
        _rehydrateIsComplete = true;
        if (_resolveRehydrate) {
            _resolveRehydrate();
        }
    });
    const rehydrate = () => new Promise((resolve) => {
        if (_rehydrateIsComplete) {
            resolve();
        }
        else {
            _resolveRehydrate = resolve;
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
