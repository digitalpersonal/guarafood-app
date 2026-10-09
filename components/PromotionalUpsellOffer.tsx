import React from 'react';
import type { Promotion } from '../types';

interface PromotionalUpsellOfferProps {
    promotion?: Promotion | null;
    selected: boolean;
    onToggle: (selected: boolean) => void;
    selectedOption: string;
    onSelectOption: (option: string) => void;
}

export const PromotionalUpsellOffer: React.FC<PromotionalUpsellOfferProps> = ({
    promotion,
    selected,
    onToggle,
    selectedOption,
    onSelectOption
}) => {
    if (!promotion || promotion.discountType !== 'UPSELL' || !promotion.upsellTitle) {
        return null;
    }

    const price = Number(promotion.upsellPrice) || 0;
    const options = promotion.upsellOptions || [];

    return (
        <div className={`my-4 p-4 rounded-2xl border-2 transition-all ${
            selected 
                ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-orange-500 shadow-md ring-2 ring-orange-400/20' 
                : 'bg-orange-50/40 border-orange-200/80 hover:border-orange-300'
        }`}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                    <span className="text-2xl mt-0.5 animate-bounce">🎁</span>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider bg-orange-600 text-white px-2 py-0.5 rounded-full">
                                OFERTA ESPECIAL
                            </span>
                            <span className="text-xs font-black text-orange-700">
                                + R$ {price.toFixed(2)}
                            </span>
                        </div>
                        <h4 className="font-black text-gray-900 text-sm mt-1">
                            {promotion.name || promotion.upsellTitle}
                        </h4>
                        <p className="text-xs text-gray-600 mt-0.5 leading-snug">
                            {promotion.upsellDescription || `Na compra deste item, leve ${promotion.upsellTitle} por apenas + R$ ${price.toFixed(2)}!`}
                        </p>
                    </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer flex-shrink-0 pt-1">
                    <input
                        type="checkbox"
                        checked={selected}
                        onChange={(e) => onToggle(e.target.checked)}
                        className="w-5 h-5 rounded border-orange-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                    />
                    <span className="text-xs font-black text-orange-800 hidden sm:inline">
                        {selected ? 'Adicionado' : 'Aproveitar'}
                    </span>
                </label>
            </div>

            {/* Seleção de Sabores / Opções quando a oferta estiver marcada */}
            {selected && options.length > 0 && (
                <div className="mt-3 pt-3 border-t border-orange-200/70">
                    <p className="text-xs font-black text-gray-800 uppercase tracking-tight mb-2">
                        Escolha o sabor / opção desejada:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {options.map((opt) => {
                            const isOptSelected = selectedOption === opt;
                            return (
                                <button
                                    key={opt}
                                    type="button"
                                    onClick={() => onSelectOption(opt)}
                                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-left flex items-center justify-between cursor-pointer ${
                                        isOptSelected 
                                            ? 'bg-orange-600 text-white border-orange-600 shadow-xs' 
                                            : 'bg-white text-gray-800 border-orange-200 hover:bg-orange-100/50'
                                    }`}
                                >
                                    <span>{opt}</span>
                                    {isOptSelected && <span>✓</span>}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PromotionalUpsellOffer;
