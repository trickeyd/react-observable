"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStoreObservable = void 0;
const createStore_1 = require("../store/createStore");
const getStoreObservable = (callback) => {
    const store = createStore_1.store$.get();
    if (!store) {
        throw new Error('Store not initialized');
    }
    return callback(store);
};
exports.getStoreObservable = getStoreObservable;
