import React from 'react';
import type { Order } from '../types';
import { getOrderFiscalVerification } from '../utils/fiscalStatus';

interface FiscalStatusIconProps {
    order?: Order;
    isEmitted?: boolean;
    tooltip?: string;
    size?: 'sm' | 'md';
}

export const FiscalStatusIcon: React.FC<FiscalStatusIconProps> = ({
    order,
    isEmitted: isEmittedProp,
    tooltip,
    size = 'md',
}) => {
    const verification = order ? getOrderFiscalVerification(order) : null;
    const emitted = isEmittedProp !== undefined ? isEmittedProp : Boolean(verification?.isEmitted);
    const titleText =
        tooltip ||
        (verification
            ? `${verification.label}: ${verification.logText}`
            : emitted
                ? 'Nota fiscal emitida'
                : 'Nota fiscal não emitida / pendente');

    const boxSize = size === 'sm' ? 'w-5 h-5' : 'w-6 h-6';
    const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

    if (emitted) {
        return (
            <span
                className={`inline-flex items-center justify-center ${boxSize} rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex-shrink-0`}
                title={titleText}
                aria-label="Nota fiscal emitida"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className={iconSize}
                    aria-hidden="true"
                >
                    <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
                        clipRule="evenodd"
                    />
                </svg>
            </span>
        );
    }

    return (
        <span
            className={`inline-flex items-center justify-center ${boxSize} rounded-full bg-gray-100 border border-gray-200 text-gray-400 flex-shrink-0`}
            title={titleText}
            aria-label="Nota fiscal não emitida"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className={iconSize}
                aria-hidden="true"
            >
                <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z"
                    clipRule="evenodd"
                />
            </svg>
        </span>
    );
};

export default FiscalStatusIcon;
