"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useEqualityChecker = void 0;
const react_1 = require("react");
const general_1 = require("../utils/general");
const useEqualityChecker = (dependencies) => {
    const ref = (0, react_1.useRef)(dependencies);
    const isEqualRef = (0, react_1.useRef)(true);
    (0, react_1.useEffect)(() => {
        isEqualRef.current = (0, general_1.shallowEqual)(ref.current, dependencies);
        ref.current = dependencies;
    }, dependencies);
    return isEqualRef.current;
};
exports.useEqualityChecker = useEqualityChecker;
