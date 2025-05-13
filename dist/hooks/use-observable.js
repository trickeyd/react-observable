"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useObservable = useObservable;
const react_1 = require("react");
const use_store_proxy_1 = require("./use-store-proxy");
const stream_1 = require("../utils/stream");
function useObservable(initialise) {
    const ref = (0, react_1.useRef)(undefined);
    const subscriptionsRef = (0, react_1.useRef)([]);
    const handleSubscription = (0, react_1.useCallback)((unsubscribe) => {
        subscriptionsRef.current.push(unsubscribe);
    }, []);
    const observableStoreProxy = (0, use_store_proxy_1.useStoreProxy)(handleSubscription);
    const handleWrapObservable = (0, react_1.useCallback)((observable) => {
        return (0, stream_1.wrapObservable)(observable, handleSubscription);
    }, []);
    if (!ref.current) {
        ref.current = initialise({
            store: observableStoreProxy,
            wrapObservable: handleWrapObservable,
        });
    }
    const [data, setData] = (0, react_1.useState)(ref.current.get());
    (0, react_1.useEffect)(() => {
        var _a;
        const sub = (_a = ref.current) === null || _a === void 0 ? void 0 : _a.subscribe((newData) => {
            setData(newData);
        });
        return () => {
            sub === null || sub === void 0 ? void 0 : sub();
            subscriptionsRef.current.forEach((unsub) => unsub());
            subscriptionsRef.current.length = 0;
        };
    }, []);
    return data;
}
