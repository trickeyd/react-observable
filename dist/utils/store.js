"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStoreObservable = void 0;
const __1 = require("..");
const createStore_1 = require("../store/createStore");
const getStoreObservable = (callback) => {
    const store = createStore_1.store$.get();
    if (!store) {
        throw new Error('Store not initialized');
    }
    return (0, __1.createObservable)({ initialValue: callback(store) });
};
exports.getStoreObservable = getStoreObservable;
