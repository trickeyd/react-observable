"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useStream = void 0;
const react_1 = require("react");
const use_equality_checker_1 = require("./use-equality-checker");
const observable_1 = require("../factories/observable");
const use_store_proxy_1 = require("./use-store-proxy");
const useStream = (initialise, dependencies) => {
    const observableRef = (0, react_1.useRef)(undefined);
    const observableSubscriptionRef = (0, react_1.useRef)(undefined);
    const subscriptionsRef = (0, react_1.useRef)([]);
    const entry$ = (0, react_1.useRef)((0, observable_1.createObservable)({ initialValue: undefined })).current;
    const handleSubscription = (0, react_1.useCallback)((unsubscribe) => {
        subscriptionsRef.current.push(unsubscribe);
    }, []);
    const observableStoreProxy = (0, use_store_proxy_1.useStoreProxy)(handleSubscription);
    const initialiseObservable = (0, react_1.useCallback)(() => {
        observableRef.current = initialise({
            $: entry$,
            store: observableStoreProxy,
        });
    }, []);
    const subscribe = (0, react_1.useCallback)(() => {
        if (!observableRef.current) {
            throw new Error('Attempting to subscribe to an uninitialised observable');
        }
        observableSubscriptionRef.current = observableRef.current.subscribe((newData) => {
            setData(newData);
        });
    }, []);
    const cleanUp = (0, react_1.useCallback)(() => {
        var _a;
        (_a = observableSubscriptionRef.current) === null || _a === void 0 ? void 0 : _a.call(observableSubscriptionRef);
        subscriptionsRef.current.forEach((unsubscribe) => unsubscribe());
        subscriptionsRef.current.length = 0;
    }, []);
    const isEqual = (0, use_equality_checker_1.useEqualityChecker)(dependencies);
    (0, react_1.useEffect)(() => {
        console.log('isEqual', isEqual);
        if (!isEqual) {
            cleanUp();
            initialiseObservable();
            entry$.emit();
        }
    }, [isEqual]);
    const [data, setData] = (0, react_1.useState)(() => {
        console.log('observableRef.current init', observableRef.current);
        return observableRef.current.get();
    });
    (0, react_1.useEffect)(() => {
        subscribe();
        return cleanUp;
    }, []);
    return data;
};
exports.useStream = useStream;
