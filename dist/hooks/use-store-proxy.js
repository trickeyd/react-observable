"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useStoreProxy = void 0;
const react_1 = require("react");
const context_1 = require("../store/context");
const stream_1 = require("../utils/stream");
const useStoreProxy = (onSubscription) => {
    const observableStore = (0, react_1.useContext)(context_1.ReactObservableContext);
    if (!observableStore) {
        throw new Error('useStoreProxy must be used within a ReactObservableProvider');
    }
    const observableStoreProxy = (0, react_1.useRef)(Object.entries(observableStore).reduce((acc, [segmentName, segment]) => ({
        ...acc,
        [segmentName]: new Proxy(segment, {
            get(target, prop) {
                if (prop in target) {
                    return (0, stream_1.wrapObservable)(target[prop], onSubscription);
                }
                return undefined;
            },
        }),
    }), {})).current;
    return observableStoreProxy;
};
exports.useStoreProxy = useStoreProxy;
