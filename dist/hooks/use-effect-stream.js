"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useEffectStream = void 0;
const react_1 = require("react");
const use_equality_checker_1 = require("./use-equality-checker");
const observable_1 = require("../factories/observable");
const use_store_proxy_1 = require("./use-store-proxy");
const useEffectStream = (initialise, inputs) => {
    const ref = (0, react_1.useRef)(undefined);
    const subscriptionsRef = (0, react_1.useRef)([]);
    const entry$ = (0, react_1.useRef)((0, observable_1.createObservable)({ initialValue: inputs })).current;
    const handleSubscription = (0, react_1.useCallback)((unsubscribe) => {
        subscriptionsRef.current.push(unsubscribe);
    }, []);
    const observableStoreProxy = (0, use_store_proxy_1.useStoreProxy)(handleSubscription);
    if (!ref.current) {
        ref.current = initialise({
            $: entry$,
            store: observableStoreProxy,
        });
    }
    const isEqual = (0, use_equality_checker_1.useEqualityChecker)(inputs);
    if (!isEqual) {
        entry$.set(inputs);
    }
    const [data, setData] = (0, react_1.useState)(ref.current.get);
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
};
exports.useEffectStream = useEffectStream;
