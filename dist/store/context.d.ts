import React from 'react';
import { Store } from '../types/store';
/** @internal */
export declare const ReactObservableContext: React.Context<Store | null>;
interface Props {
    children: React.ReactNode;
    loading?: React.ReactNode | null;
}
export declare function ReactObservableProvider({ children, loading }: Props): React.JSX.Element;
export {};
