
import React, { useState, useMemo } from 'react';
import type { MenuItem, Combo } from '../types';
import OptimizedImage from './OptimizedImage';

interface AddItemToOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    restaurantName: string;
    allMenuItems: MenuItem[];
    allCombos: Combo[];
    onSelectMenuItem: (item: MenuItem) => void;
    onSelectCombo: (combo: Combo) => void;
}

const XIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);
const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
);

const AddItemToOrderModal: React.FC<AddItemToOrderModalProps> = ({
    isOpen,
    onClose,
    restaurantName,
    allMenuItems,
    allCombos,
    onSelectMenuItem,
    onSelectCombo,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showCombos, setShowCombos] = useState(true);

    const filteredItems = useMemo(() => {
        const lowerSearch = searchTerm.toLowerCase();
        return allMenuItems.filter(item => 
            item.name.toLowerCase().includes(lowerSearch) || 
            item.description.toLowerCase().includes(lowerSearch)
        );
    }, [allMenuItems, searchTerm]);

    const filteredCombos = useMemo(() => {
        const lowerSearch = searchTerm.toLowerCase();
        return allCombos.filter(combo => 
            combo.name.toLowerCase().includes(lowerSearch) || 
            combo.description.toLowerCase().includes(lowerSearch)
        );
    }, [allCombos, searchTerm]);

    if (!isOpen) return null;

    const hasCustomization = (item: MenuItem) => 
        item.isPizza || item.isAcai || (item.availableAddonIds && item.availableAddonIds.length > 0) || (item.sizes && item.sizes.length > 0);

    return (
        <div className="fixed inset-0 bg-black/70 z-[110] flex justify-center items-center p-4 backdrop-blur-sm transition-opacity duration-200" onClick={onClose} aria-modal="true" role="dialog" aria-labelledby="add-item-modal-title">
            <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col transform transition-all duration-200 scale-100" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b pb-3 mb-4 sticky top-0 bg-white z-10">
                    <h2 id="add-item-modal-title" className="text-xl sm:text-2xl font-bold text-gray-800">Adicionar Item</h2>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-800 p-2 -mt-2 -mr-2 transition-colors active:scale-90" aria-label="Fechar">
                        <XIcon className="w-7 h-7" />
                    </button>
                </div>

                <div className="mb-4 bg-white sticky top-[60px] z-10 pb-2">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder={`Buscar em ${restaurantName}...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full p-3 pl-10 border rounded-xl bg-gray-50 focus:ring-2 focus:ring-orange-400 focus:outline-none transition-shadow"
                        />
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    </div>
                </div>

                <div className="overflow-y-auto flex-grow space-y-4 pr-1">
                    {allMenuItems.length === 0 && allCombos.length === 0 ? (
                        <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                            <p className="font-bold">Nenhum item encontrado no cardápio.</p>
                            <p className="text-xs mt-1">Verifique se o restaurante possui itens cadastrados.</p>
                        </div>
                    ) : (
                        <>
                            {filteredCombos.length > 0 && (
                        <div className="space-y-3 mb-6">
                            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-2">Combos</h3>
                            {filteredCombos.map(combo => (
                                <div key={combo.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-orange-200 transition-colors">
                                    <OptimizedImage src={combo.imageUrl} alt={combo.name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0 shadow-sm" />
                                    <div className="flex-grow">
                                        <p className="font-bold text-gray-800">{combo.name}</p>
                                        <p className="text-sm text-orange-600 font-bold">R$ {combo.price.toFixed(2)}</p>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => onSelectCombo(combo)} 
                                        className="px-5 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-xs font-black uppercase tracking-wider shadow-md active:scale-95 transition-all"
                                    >
                                        Adicionar
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {filteredItems.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-2">Itens</h3>
                            {filteredItems.map(item => {
                                const isAvailable = item.available !== false;
                                return (
                                    <div key={item.id} className={`flex items-center space-x-3 p-3 bg-gray-50 rounded-xl border border-gray-100 transition-colors ${!isAvailable ? 'opacity-60 grayscale' : 'hover:border-orange-200'}`}>
                                        <OptimizedImage src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0 shadow-sm" />
                                        <div className="flex-grow">
                                            <p className="font-bold text-gray-800">{item.name}</p>
                                            <p className="text-sm text-orange-600 font-bold">R$ {item.price.toFixed(2)}</p>
                                            {!isAvailable && <span className="text-xs font-bold text-red-500 uppercase">Esgotado</span>}
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => isAvailable && onSelectMenuItem(item)} 
                                            disabled={!isAvailable}
                                            className={`px-5 py-2 rounded-lg text-xs font-black uppercase tracking-wider shadow-md transition-all ${
                                                isAvailable 
                                                ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95' 
                                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            }`}
                                        >
                                            {isAvailable ? 'Adicionar' : 'Esgotado'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {filteredItems.length === 0 && filteredCombos.length === 0 && (
                        <p className="text-center text-gray-400 py-10 italic">Nenhum item encontrado.</p>
                    )}
                        </>
                    )}
                </div>

                <div className="mt-6 pt-4 border-t flex justify-end bg-white sticky bottom-0">
                    <button type="button" onClick={onClose} className="px-8 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 active:scale-90 transition-all shadow-sm">
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddItemToOrderModal;
