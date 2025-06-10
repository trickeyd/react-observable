"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shallowEqual = exports.isPlainObject = exports.isObject = exports.isFunction = exports.identity = exports.tryCatchSync = exports.tryCatch = void 0;
exports.uuid = uuid;
const tryCatch = async (fn, errorMessage) => {
    try {
        const result = await fn();
        return [result, undefined];
    }
    catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        if (errorMessage) {
            err.message = `${errorMessage}\n${err.message}`;
        }
        return [undefined, err];
    }
};
exports.tryCatch = tryCatch;
const tryCatchSync = (fn, errorMessage) => {
    try {
        const result = fn();
        return [result, undefined];
    }
    catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        if (errorMessage) {
            err.message = `${errorMessage}\n${err.message}`;
        }
        return [undefined, err];
    }
};
exports.tryCatchSync = tryCatchSync;
const identity = (value) => value;
exports.identity = identity;
const isFunction = (value) => typeof value === 'function';
exports.isFunction = isFunction;
const isObject = (value) => value !== null && typeof value === 'object';
exports.isObject = isObject;
const isPlainObject = (value) => (0, exports.isObject)(value) && value.constructor === Object;
exports.isPlainObject = isPlainObject;
const shallowEqual = (a, b) => {
    if (a === b)
        return true;
    if (!(0, exports.isObject)(a) || !(0, exports.isObject)(b))
        return false;
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length)
        return false;
    return keysA.every((key) => {
        if (!Object.prototype.hasOwnProperty.call(b, key))
            return false;
        return a[key] === b[key];
    });
};
exports.shallowEqual = shallowEqual;
let uuidCounter = 0;
function uuid() {
    if (++uuidCounter >= Number.MAX_SAFE_INTEGER) {
        uuidCounter = 0;
    }
    return `${Date.now()}-${uuidCounter}`;
}
