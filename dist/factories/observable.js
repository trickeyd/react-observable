"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createObservable = void 0;
const general_1 = require("../utils/general");
const react_native_uuid_1 = __importDefault(require("react-native-uuid"));
const general_2 = require("../utils/general");
const stream_1 = require("../utils/stream");
const createObservable = ({ initialValue, equalityFn, name } = {
    initialValue: undefined,
}) => {
    const streamStack = [];
    const id = react_native_uuid_1.default.v4();
    let observableName = name !== null && name !== void 0 ? name : id;
    let listenerRecords = [];
    const getInitialValue = () => (0, general_1.isFunction)(initialValue) ? initialValue() : initialValue;
    let value = getInitialValue();
    const get = () => value;
    const emit = () => {
        const unsubscribeIds = listenerRecords.reduce((acc, { listener, once, id }) => {
            listener === null || listener === void 0 ? void 0 : listener(value);
            return once ? [...acc, id] : acc;
        }, []);
        unsubscribeIds.forEach((id) => unsubscribe(id));
    };
    const emitError = (err) => listenerRecords.forEach(({ onError }) => onError === null || onError === void 0 ? void 0 : onError(err));
    const _setInternal = (isSilent) => (newValue) => {
        const reducedValue = ((0, general_1.isFunction)(newValue) ? newValue(get()) : newValue);
        if (((equalityFn &&
            !equalityFn(value, reducedValue)) ||
            value === reducedValue)) {
            return;
        }
        value = reducedValue;
        isSilent && emit();
    };
    const set = _setInternal(true);
    const setSilent = _setInternal(false);
    const subscribe = (listener, onError) => {
        const id = react_native_uuid_1.default.v4();
        listenerRecords.push({ listener, onError, id, once: false });
        return () => unsubscribe(id);
    };
    const subscribeOnce = (listener, onError) => {
        const id = react_native_uuid_1.default.v4();
        listenerRecords.push({ listener, onError, id, once: true });
        return () => unsubscribe(id);
    };
    const subscribeWithValue = (listener, onError) => {
        const unsubscribe = subscribe(listener, onError);
        if (listener) {
            listener(value);
        }
        return unsubscribe;
    };
    const unsubscribe = (id) => {
        listenerRecords = listenerRecords.filter((lr) => lr.id !== id);
    };
    const combineLatestFrom = (...observables) => {
        const { initialValues, subscribeFunctions } = observables.reduce((acc, obs) => {
            acc.initialValues.push(obs.get());
            acc.subscribeFunctions.push(obs.subscribe);
            return acc;
        }, {
            initialValues: [get()],
            subscribeFunctions: [subscribe],
        });
        const combinationObservable$ = (0, exports.createObservable)({
            initialValue: initialValues,
        });
        subscribeFunctions.forEach((sub, i) => {
            sub((val) => {
                combinationObservable$.set((values) => {
                    const clone = [...values];
                    clone[i] = val;
                    return clone;
                });
            }, (err) => combinationObservable$.emitError(err));
        });
        return combinationObservable$;
    };
    const withLatestFrom = (...observables) => {
        const resultObservable$ = (0, exports.createObservable)({
            initialValue: [
                get(),
                ...observables.map((obs) => obs.get()),
            ],
        });
        subscribe((sourceValue) => {
            const combined = [
                sourceValue,
                ...observables.map((obs) => obs.get()),
            ];
            resultObservable$.set(combined);
        }, (err) => resultObservable$.emitError(err));
        return resultObservable$;
    };
    const stream = (project, { initialValue, streamedName, executeOnCreation = true, } = {}) => {
        const name = streamedName !== null && streamedName !== void 0 ? streamedName : (0, stream_1.createStreamName)(getName());
        const newObservable$ = (0, exports.createObservable)({
            initialValue: (initialValue !== null && initialValue !== void 0 ? initialValue : undefined),
            name,
        });
        (executeOnCreation ? subscribeWithValue : subscribe)((data) => {
            const [newData, projectError] = (0, general_2.tryCatchSync)(() => project(data), `Stream Error: Attempt to project stream to "${name}" from "${getName()}" has failed.`);
            if (projectError) {
                newObservable$.emitError(projectError);
            }
            else {
                newObservable$.set(newData);
            }
        }, (err) => newObservable$.emitError(err));
        return newObservable$;
    };
    const streamAsync = (project, { initialValue, streamedName, executeOnCreation = false, } = {}) => {
        const name = streamedName !== null && streamedName !== void 0 ? streamedName : (0, stream_1.createStreamName)(getName());
        const newObservable$ = (0, exports.createObservable)({
            initialValue: (initialValue !== null && initialValue !== void 0 ? initialValue : undefined),
            name,
        });
        const projectToNewObservable = async (data) => {
            console.log('streamAsync - projectToNewObservable - we doing this?', getName());
            const [newData, error] = await (0, general_2.tryCatch)(() => project(data), `Stream Error: Attempt to project stream to "${name}" from "${getName()}" has failed.`);
            console.log('streamAsync - projectToNewObservable', newData, error, getName());
            if (error) {
                console.log('streamAsync - emitError', getName());
                newObservable$.emitError(error);
            }
            else {
                newObservable$.set(newData);
            }
        };
        (executeOnCreation ? subscribeWithValue : subscribe)(projectToNewObservable, newObservable$.emitError);
        return newObservable$;
    };
    const tap = (callback) => {
        callback(get());
        return observable;
    };
    const delay = (milliseconds) => {
        const newObservable$ = (0, exports.createObservable)({
            initialValue: get(),
            name: `${name}_after-delay-${milliseconds}`,
        });
        subscribe(async (val) => {
            await new Promise((r) => setTimeout(r, milliseconds));
            newObservable$.set(val);
        }, newObservable$.emitError);
        return newObservable$;
    };
    const mapEntries = ({ keys, observablePostfix = '$', } = {}) => {
        const currentValue = get();
        if (!(0, general_1.isObject)(currentValue)) {
            throw new Error(`mapEntries can only be used on object observables: ${getName()} is a ${typeof currentValue}`);
        }
        const entries = Object.entries(currentValue);
        const filteredEntries = keys
            ? entries.filter(([key]) => keys.includes(key))
            : entries;
        return filteredEntries.reduce((acc, [key, value]) => ({
            ...acc,
            [`${key}${observablePostfix}`]: (0, exports.createObservable)({
                initialValue: value,
                name: `${getName()}_${key}`,
            }),
        }), {});
    };
    const catchError = (onError) => {
        const handleError = (error) => {
            if (onError) {
                console.log('catchError - onError', getName());
                onError(error, get(), set);
            }
            console.log('catchError - emitError', getName());
            emitError(new Error('Error caught!'));
        };
        return {
            ...observable,
            emitError: handleError,
        };
    };
    const guard = (predicate) => {
        // Create a new observable for the guarded stream
        const guardedObservable = (0, exports.createObservable)({ initialValue: get() });
        // Subscribe to the original observable
        observable.subscribe((nextValue) => {
            const prevValue = guardedObservable.get();
            if (predicate(prevValue, nextValue)) {
                guardedObservable.set(nextValue);
            }
            else {
                // The value is not passed through, but an error must be 
                guardedObservable.emitError(new Error('Guard failed'));
            }
        });
        return guardedObservable;
    };
    const reset = () => set(getInitialValue());
    const getName = () => observableName;
    const setName = (name) => {
        observableName = name;
    };
    const getId = () => id;
    const observable = {
        get,
        set,
        setSilent,
        subscribe,
        subscribeOnce,
        subscribeWithValue,
        stream,
        streamAsync,
        // TODO- this is not currently type safe
        combineLatestFrom,
        withLatestFrom,
        tap,
        delay,
        catchError,
        reset,
        getName,
        setName,
        getId,
        emit,
        emitError,
        mapEntries,
        getInitialValue,
        guard,
    };
    return observable;
};
exports.createObservable = createObservable;
