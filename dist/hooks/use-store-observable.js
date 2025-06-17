"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useStoreObservable = useStoreObservable;
const react_1 = require("react");
const context_1 = require("../store/context");
function useStoreObservable(initialise) {
    const store = (0, react_1.useContext)(context_1.ReactObservableContext);
    const ref = (0, react_1.useRef)(undefined);
    if (!ref.current) {
        if (!store) {
            throw new Error('useStoreObservable must be used within a ReactObservableProvider');
        }
        ref.current = initialise({ store });
    }
    return ref.current;
}
