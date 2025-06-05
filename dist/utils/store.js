"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStoreObservable = exports.store$ = void 0;
const __1 = require("..");
exports.store$ = (0, __1.createObservable)({ initialValue: null });
const getStoreObservable = (callback) => {
    const store = exports.store$.get();
    if (!store) {
        throw new Error('Store not initialized');
    }
    return (0, __1.createObservable)({ initialValue: callback(store) });
};
exports.getStoreObservable = getStoreObservable;
