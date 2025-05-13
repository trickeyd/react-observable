"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReactObservableContext = void 0;
exports.ReactObservableProvider = ReactObservableProvider;
const react_1 = __importStar(require("react"));
const use_observable_1 = require("../hooks/use-observable");
const createStore_1 = require("./createStore");
/** @internal */
exports.ReactObservableContext = (0, react_1.createContext)(null);
function ReactObservableProvider({ children, loading = null, }) {
    const [isLoaded, setIsLoaded] = (0, react_1.useState)(false);
    const flatStore = (0, use_observable_1.useObservable)(() => createStore_1.flatStore$);
    const store = (0, use_observable_1.useObservable)(() => createStore_1.store$);
    // Duck-type filter the persistent ones
    const persistentObservables = Object.values(flatStore).filter((ob) => !!ob.rehydrate);
    (0, react_1.useEffect)(() => {
        const setStateWhenComplete = async () => {
            await Promise.all(persistentObservables.map((observable) => !!observable.rehydrate()));
            setIsLoaded(true);
        };
        setStateWhenComplete();
    }, []);
    return (react_1.default.createElement(exports.ReactObservableContext.Provider, { value: store }, isLoaded ? children : loading));
}
