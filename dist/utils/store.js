"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStoreObservable = void 0;
const create_store_1 = require("../store/create-store");
const getStoreObservable = (callback) => {
    const store = create_store_1.store$.get();
    if (!store) {
        throw new Error('Store not initialized');
    }
    return callback(store);
};
exports.getStoreObservable = getStoreObservable;
