"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrapObservable = exports.createStreamName = void 0;
const observable_1 = require("../factories/observable");
const createStreamName = (baseName) => {
    const match = baseName.match(/_STREAM_(\d+)$/);
    const index = match ? parseInt(match[1], 10) + 1 : 1;
    return `${baseName}_STREAM_${index}`;
};
exports.createStreamName = createStreamName;
const wrapObservable = (observable, onSubscription) => {
    const proxyObservable = (0, observable_1.createObservable)({ initialValue: observable.get() });
    onSubscription(observable.subscribe((payload) => proxyObservable.set(payload)));
    return proxyObservable;
};
exports.wrapObservable = wrapObservable;
